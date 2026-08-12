import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [userReady, setUserReady] = useState(false);
  const [loadingError, setLoadingError] = useState("");

  const [data, setData] = useState(null);
  const [amount, setAmount] = useState(100);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState(null);
  const [race, setRace] = useState(null);

  const createUser = () => {
    const cleanName = nameInput.trim();

    if (!cleanName) {
      alert("Please enter your name.");
      return;
    }

    axios
      .post("https://f1x-prediction-platform.onrender.com/user", { name: cleanName })
      .then((res) => {
        const newUser = res.data;
        localStorage.setItem("f1x_user_id", String(newUser.id));
        setCurrentUser(newUser);
        setBalance(Number(newUser.balance || 0));
        setUserReady(true);
        setLoadingError("");
        fetchData();
      })
      .catch((err) => {
        alert(
          err.response?.data?.message ||
            "Could not create your F1X profile"
        );
      });
  };

  const resetUser = () => {
    localStorage.removeItem("f1x_user_id");
    setCurrentUser(null);
    setUserReady(false);
    setData(null);
    setSummary(null);
    setPortfolio([]);
    setBalance(0);
    setNameInput("");
  };

  const fetchData = () => {
    const userId = localStorage.getItem("f1x_user_id");

    if (!userId) return;

    const userParams = { params: { userId } };
    setLoadingError("");

    axios
      .get("https://f1x-prediction-platform.onrender.com/predictions", { timeout: 30000 })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.log("Prediction error:", err);
        setLoadingError(
          err.code === "ECONNABORTED"
            ? "Predictions are taking too long. Check the ML service."
            : "Could not load race predictions."
        );
      });

    axios
      .get("https://f1x-prediction-platform.onrender.com/leaderboard")
      .then((res) => setLeaderboard(res.data))
      .catch((err) => console.log("Leaderboard error:", err));

    axios
      .get("https://f1x-prediction-platform.onrender.com/portfolio", userParams)
      .then((res) => setPortfolio(res.data))
      .catch((err) => {
        console.log("Portfolio error:", err);
        if (err.response?.status === 400) resetUser();
      });

    axios
      .get("https://f1x-prediction-platform.onrender.com/user", userParams)
      .then((res) => {
        setCurrentUser(res.data);
        setBalance(Number(res.data.balance || 0));
      })
      .catch((err) => {
        console.log("User error:", err);
        if (err.response?.status === 400) resetUser();
      });

    axios
      .get("https://f1x-prediction-platform.onrender.com/portfolio-summary", userParams)
      .then((res) => setSummary(res.data))
      .catch((err) => console.log("Summary error:", err));

    axios
      .get("https://f1x-prediction-platform.onrender.com/race")
      .then((res) => {
        if (res.data.results) setRace(res.data);
      })
      .catch((err) => console.log("Race error:", err));
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem("f1x_user_id");

    if (!savedUserId) {
      setUserReady(false);
      return;
    }

    axios
      .get("https://f1x-prediction-platform.onrender.com/user", {
        params: { userId: savedUserId },
      })
      .then((res) => {
        setCurrentUser(res.data);
        setBalance(Number(res.data.balance || 0));
        setUserReady(true);
        fetchData();
      })
      .catch(() => {
        localStorage.removeItem("f1x_user_id");
        setCurrentUser(null);
        setUserReady(false);
      });
  }, []);

  useEffect(() => {
    if (!userReady) return;

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [userReady]);

  const placeBet = (driver) => {
    const userId = localStorage.getItem("f1x_user_id");

    axios
      .post("https://f1x-prediction-platform.onrender.com/bet", {
        userId,
        driver,
        amount: Number(amount),
      })
      .then(() => fetchData())
      .catch((err) => {
        alert(
          err.response?.data?.message ||
            "Could not place trade"
        );
      });
  };

  const settleRace = () => {
    const userId = localStorage.getItem("f1x_user_id");

    axios
      .post("https://f1x-prediction-platform.onrender.com/settle", { userId })
      .then((res) => {
        setRace(res.data.race);
        alert(
          "Winner: " + res.data.winner +
          "\nWinnings: " + res.data.winnings +
          "\nProfit: " + res.data.profit +
          "\nBalance: " + res.data.balance
        );
        fetchData();
        setActiveTab("race");
      })
      .catch((err) => {
        alert(
          err.response?.data?.message ||
            "Could not settle the race"
        );
      });
  };

  if (!userReady) {
    return (
      <div style={loginPageStyle}>
        <div style={loginCardStyle}>
          <div style={loginLogoStyle}>
            <span style={{ color: "#e10600" }}>F1</span>X
          </div>
          <div style={loginEyebrowStyle}>PREDICT · TRADE · SIMULATE</div>
          <h1 style={loginTitleStyle}>Welcome to the paddock.</h1>
          <p style={loginSubtitleStyle}>
            Enter your name to create your personal F1X trading profile.
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createUser();
            }}
            placeholder="Enter your name"
            style={loginInputStyle}
            autoFocus
          />
          <button onClick={createUser} style={loginButtonStyle}>
            BEGIN TRADING →
          </button>
          <div style={loginHintStyle}>No password. Just your name.</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={loadingPageStyle}>
        <div style={loadingBoxStyle}>
          <div style={loadingLogoStyle}>
            <span style={{ color: "#e10600" }}>F1</span>X
          </div>
          <div style={loadingBarStyle} />
          <p style={loadingTextStyle}>
            {loadingError || "Initializing race intelligence..."}
          </p>
          {loadingError && (
            <button onClick={fetchData} style={loginButtonStyle}>
              RETRY
            </button>
          )}
        </div>
      </div>
    );
  }

  const safeSummary = summary || {
    totalInvested: 0,
    totalPayout: 0,
    totalProfitLoss: 0,
    roi: 0,
    totalTrades: 0,
    wonTrades: 0,
    lostTrades: 0,
    openTrades: 0,
  };

  const profit =
    leaderboard.length > 0
      ? Number(leaderboard[0].profit)
      : 0;

  const sortedPredictions = Object.entries(
    data.predictions
  ).sort(
    ([, a], [, b]) =>
      Number(b) - Number(a)
  );

  const chartData = sortedPredictions.map(
    ([driver, probability]) => ({
      driver,
      probability:
        Number(probability) * 100,
    })
  );

  const topDriver =
    sortedPredictions[0]?.[0] || "—";

  const topProbability =
    sortedPredictions.length
      ? Number(sortedPredictions[0][1]) * 100
      : 0;

  const tabs = [
    {
      id: "overview",
      icon: "⌂",
      label: "Overview",
    },
    {
      id: "markets",
      icon: "↗",
      label: "Markets",
    },
    {
      id: "race",
      icon: "◉",
      label: "Race",
    },
    {
      id: "portfolio",
      icon: "▣",
      label: "Portfolio",
    },
    {
      id: "leaderboard",
      icon: "♛",
      label: "Leaderboard",
    },
  ];

  return (
    <div style={appStyle}>

      {/* HEADER */}

      <header style={topBarStyle}>
        <div style={brandWrapperStyle}>
          <div style={brandStyle}>
            <span style={{ color: "#e10600" }}>
              F1
            </span>
            X
          </div>

          <div style={brandDividerStyle} />

          <div style={taglineStyle}>
            PREDICT · TRADE · SIMULATE
          </div>
        </div>

        <div style={headerRightStyle}>
          <div style={liveBadgeStyle}>
            <span style={liveDotStyle} />
            LIVE
          </div>

          <div style={userPillStyle}>
            <span style={userPillLabelStyle}>DRIVER</span>
            <strong>{currentUser?.name || "Guest"}</strong>
          </div>

          <div style={balancePillStyle}>
            <span style={balanceLabelStyle}>
              BALANCE
            </span>

            <strong>
              ${Number(balance).toFixed(2)}
            </strong>
          </div>
        </div>
      </header>

      {/* NAVIGATION */}

      <nav style={navigationStyle}>
        <div style={navigationInnerStyle}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id)
              }
              style={{
                ...navButtonStyle,
                ...(activeTab === tab.id
                  ? activeNavButtonStyle
                  : {}),
              }}
            >
              <span
                style={{
                  ...navIconStyle,
                  ...(activeTab === tab.id
                    ? activeNavIconStyle
                    : {}),
                }}
              >
                {tab.icon}
              </span>

              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={mainStyle}>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        {activeTab === "overview" && (
          <>
            <section style={heroStyle}>
              <div>
                <div style={eyebrowStyle}>
                  F1X / PREDICTIVE RACING
                </div>

                <h1 style={heroTitleStyle}>
                  Your race.
                  <br />
                  <span style={heroAccentStyle}>
                    Your call.
                  </span>
                </h1>

                <p style={heroSubtitleStyle}>
                  Machine-learning predictions,
                  simulated markets and race
                  intelligence in one place.
                </p>

                <div style={heroActionsStyle}>
                  <button
                    onClick={() =>
                      setActiveTab("markets")
                    }
                    style={primaryButton}
                  >
                    View Markets →
                  </button>

                  <button
                    onClick={settleRace}
                    style={secondaryButton}
                  >
                    🏁 Simulate Race
                  </button>
                </div>
              </div>

              <div style={topPickCardStyle}>
                <div style={topPickHeaderStyle}>
                  <span style={topPickLabelStyle}>
                    AI TOP PICK
                  </span>

                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: "10px",
                      fontWeight: "800",
                    }}
                  >
                    ● MODEL SIGNAL
                  </span>
                </div>

                <div style={topDriverStyle}>
                  {topDriver}
                </div>

                <div style={topProbabilityStyle}>
                  {topProbability.toFixed(1)}
                  <span>%</span>
                </div>

                <div style={topPickCaptionStyle}>
                  predicted probability of winning
                </div>

                <div style={topProbabilityTrackStyle}>
                  <div
                    style={{
                      ...topProbabilityBarStyle,
                      width: `${Math.min(
                        topProbability,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <button
                  onClick={() =>
                    setActiveTab("markets")
                  }
                  style={topPickButtonStyle}
                >
                  Explore prediction →
                </button>
              </div>
            </section>

            <div style={statsGridStyle}>
              <StatCard
                label="BALANCE"
                value={`$${Number(
                  balance
                ).toFixed(2)}`}
                icon="💰"
                caption="Available funds"
              />

              <StatCard
                label="TOTAL PROFIT"
                value={`$${profit.toFixed(2)}`}
                icon="↗"
                caption="Current leader"
                valueColor={
                  profit >= 0
                    ? "#4ade80"
                    : "#f87171"
                }
              />

              <StatCard
                label="TOTAL TRADES"
                value={safeSummary.totalTrades}
                icon="◎"
                caption="Positions placed"
              />

              <StatCard
                label="PORTFOLIO ROI"
                value={`${safeSummary.roi.toFixed(2)}%`}
                icon="◈"
                caption="Overall return"
                valueColor={
                  safeSummary.roi >= 0
                    ? "#4ade80"
                    : "#f87171"
                }
              />
            </div>

            <section style={dashboardGridStyle}>
              <div style={largeCardStyle}>
                <div style={cardHeaderStyle}>
                  <div>
                    <div style={cardEyebrowStyle}>
                      PREDICTION ENGINE
                    </div>

                    <h2 style={cardTitleStyle}>
                      Driver Win Probability
                    </h2>

                    <p style={cardDescriptionStyle}>
                      Current model output across
                      the field.
                    </p>
                  </div>

                  <div style={mlBadgeStyle}>
                    ● ML POWERED
                  </div>
                </div>

                <ResponsiveContainer
                  width="100%"
                  height={350}
                >
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 15,
                      right: 10,
                      left: -15,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#242a35"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="driver"
                      stroke="#5e6776"
                      tick={{
                        fill: "#8b93a3",
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke: "#242a35",
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tick={{
                        fill: "#8b93a3",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `${v}%`
                      }
                    />

                    <Tooltip
                      cursor={{
                        fill:
                          "rgba(255,255,255,0.025)",
                      }}
                      contentStyle={{
                        background: "#11151c",
                        border:
                          "1px solid #303746",
                        borderRadius: "10px",
                        color: "#fff",
                      }}
                      formatter={(value) => [
                        `${Number(value).toFixed(
                          1
                        )}%`,
                        "Win probability",
                      ]}
                    />

                    <Bar
                      dataKey="probability"
                      fill="#e10600"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={largeCardStyle}>
                <div style={cardHeaderStyle}>
                  <div>
                    <div style={cardEyebrowStyle}>
                      MARKET SIGNAL
                    </div>

                    <h2 style={cardTitleStyle}>
                      Leading Drivers
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      setActiveTab("markets")
                    }
                    style={textButtonStyle}
                  >
                    All markets →
                  </button>
                </div>

                {sortedPredictions
                  .slice(0, 7)
                  .map(
                    (
                      [driver, probability],
                      index
                    ) => {
                      const percentage =
                        Number(probability) *
                        100;

                      return (
                        <div
                          key={driver}
                          style={{
                            padding:
                              "14px 0",
                            borderBottom:
                              index === 6
                                ? "none"
                                : "1px solid #242a35",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              marginBottom:
                                "8px",
                            }}
                          >
                            <strong>
                              {index + 1}. {driver}
                            </strong>

                            <strong>
                              {percentage.toFixed(
                                2
                              )}
                              %
                            </strong>
                          </div>

                          <div
                            style={
                              probabilityTrackStyle
                            }
                          >
                            <div
                              style={{
                                ...probabilityBarStyle,
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </section>
          </>
        )}

        {/* =================================================
            MARKETS
        ================================================= */}

        {activeTab === "markets" && (
          <>
            <section style={marketsHeroStyle}>
              <div>
                <div style={eyebrowStyle}>
                  F1X / LIVE MARKET
                </div>

                <h1 style={pageTitleStyle}>
                  Driver Markets
                </h1>

                <p style={pageSubtitleStyle}>
                  Trade against the model's
                  predicted race probabilities.
                </p>
              </div>

              <div style={marketBalanceCardStyle}>
                <span style={marketBalanceLabelStyle}>
                  AVAILABLE BALANCE
                </span>

                <strong
                  style={{
                    fontSize: "24px",
                  }}
                >
                  ${Number(balance).toFixed(2)}
                </strong>
              </div>
            </section>

            <div style={tradeControlStyle}>
              <div>
                <div style={cardEyebrowStyle}>
                  TRADE SIZE
                </div>

                <strong>
                  How much do you want to trade?
                </strong>
              </div>

              <div style={tradeAmountWrapperStyle}>
                <span style={currencyPrefixStyle}>
                  $
                </span>

                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  style={tradeAmountInputStyle}
                />
              </div>

              <div style={quickAmountGroupStyle}>
                {[25, 50, 100, 250].map(
                  (value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setAmount(value)
                      }
                      style={{
                        ...quickAmountButtonStyle,
                        ...(Number(amount) ===
                        value
                          ? quickAmountActiveStyle
                          : {}),
                      }}
                    >
                      ${value}
                    </button>
                  )
                )}
              </div>
            </div>

            {selectedDriver && (
              <div style={selectedTradeStyle}>
                <div>
                  <span style={smallLabelStyle}>
                    SELECTED POSITION
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                      marginTop: "4px",
                    }}
                  >
                    {selectedDriver}
                  </strong>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={smallLabelStyle}>
                    TRADE
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                    }}
                  >
                    ${Number(amount).toFixed(2)}
                  </strong>
                </div>

                <button
                  onClick={() =>
                    placeBet(selectedDriver)
                  }
                  style={primaryButton}
                >
                  Confirm Trade
                </button>

                <button
                  onClick={() =>
                    setSelectedDriver(null)
                  }
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={marketGridStyle}>
              {Object.keys(data.predictions).map(
                (driver, index) => {
                  const probability =
                    Number(
                      data.predictions[driver]
                    );

                  const percentage =
                    probability * 100;

                  const ev = Number(
                    data.ev[driver]
                  );

                  const marketBet = Number(
                    data.marketBets[driver] || 0
                  );

                  const isSelected =
                    selectedDriver === driver;

                  const isPositiveEV = ev > 0;

                  return (
                    <div
                      key={driver}
                      style={{
                        ...driverMarketCardStyle,
                        ...(isSelected
                          ? selectedDriverCardStyle
                          : {}),
                      }}
                    >
                      <div
                        style={
                          driverCardTopStyle
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: "11px",
                          }}
                        >
                          <div
                            style={{
                              ...driverRankStyle,
                              ...(index === 0
                                ? driverRankFirstStyle
                                : {}),
                            }}
                          >
                            {index + 1}
                          </div>

                          <div>
                            <strong
                              style={{
                                fontSize: "18px",
                              }}
                            >
                              {driver}
                            </strong>

                            {index === 0 && (
                              <div
                                style={
                                  favoriteLabelStyle
                                }
                              >
                                MODEL FAVORITE
                              </div>
                            )}
                          </div>
                        </div>

                        {isPositiveEV && (
                          <div
                            style={
                              positiveEVBadgeStyle
                            }
                          >
                            +EV
                          </div>
                        )}
                      </div>

                      <div
                        style={
                          probabilitySectionStyle
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-end",
                            justifyContent:
                              "space-between",
                            marginBottom: "7px",
                          }}
                        >
                          <span
                            style={
                              smallLabelStyle
                            }
                          >
                            WIN PROBABILITY
                          </span>

                          <strong
                            style={{
                              fontSize: "20px",
                            }}
                          >
                            {percentage.toFixed(
                              2
                            )}
                            %
                          </strong>
                        </div>

                        <div
                          style={
                            marketProbabilityTrackStyle
                          }
                        >
                          <div
                            style={{
                              ...marketProbabilityBarStyle,
                              width: `${Math.min(
                                percentage,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={
                          marketMetricsGridStyle
                        }
                      >
                        <MarketMetric
                          label="MODEL ODDS"
                          value={
                            data.odds[driver]
                          }
                        />

                        <MarketMetric
                          label="EXPECTED VALUE"
                          value={`${
                            ev >= 0 ? "+" : ""
                          }${ev.toFixed(2)}`}
                          valueColor={
                            ev > 0
                              ? "#4ade80"
                              : "#f87171"
                          }
                        />

                        <MarketMetric
                          label="MARKET STAKE"
                          value={`$${marketBet.toFixed(
                            0
                          )}`}
                        />
                      </div>

                      <button
                        onClick={() =>
                          setSelectedDriver(
                            isSelected
                              ? null
                              : driver
                          )
                        }
                        style={{
                          ...marketTradeButtonStyle,
                          ...(isSelected
                            ? marketTradeSelectedStyle
                            : {}),
                        }}
                      >
                        {isSelected
                          ? "Selected ✓"
                          : "Select Trade"}
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            <div style={marketInfoStyle}>
              <div style={{ fontSize: "20px" }}>
                🧠
              </div>

              <div>
                <strong>
                  How the market works
                </strong>

                <p style={mutedStyle}>
                  The model probability estimates
                  each driver's chance of winning.
                  Expected value compares that
                  probability against the displayed
                  odds to identify potentially
                  favorable positions.
                </p>
              </div>
            </div>
          </>
        )}

        {/* =================================================
            RACE — NEW
        ================================================= */}

        {activeTab === "race" && (
          <>
            <section style={racePageHeroStyle}>
              <div>
                <div style={eyebrowStyle}>
                  F1X / RACE CONTROL
                </div>

                <h1 style={pageTitleStyle}>
                  Race Simulation
                </h1>

                <p style={pageSubtitleStyle}>
                  Watch the prediction become a
                  simulated race.
                </p>
              </div>

              <button
                onClick={settleRace}
                style={raceSimulateButtonStyle}
              >
                <span style={{ fontSize: "18px" }}>
                  🏁
                </span>
                Simulate Race
              </button>
            </section>

            {!race ? (
              <div style={raceEmptyStateStyle}>
                <div style={raceEmptyIconStyle}>
                  🏁
                </div>

                <div style={eyebrowStyle}>
                  READY TO RACE
                </div>

                <h2 style={raceEmptyTitleStyle}>
                  No simulation yet
                </h2>

                <p style={raceEmptyTextStyle}>
                  Run the race engine to see
                  weather, strategy, incidents,
                  pit stops and the final winner.
                </p>

                <button
                  onClick={settleRace}
                  style={primaryButton}
                >
                  Start Simulation
                </button>
              </div>
            ) : (
              <>
                {/* RACE STATUS BAR */}

                <section style={raceStatusGridStyle}>
                  <RaceInfoCard
                    icon="🌦️"
                    label="CONDITIONS"
                    value={
                      race.weatherLabel ||
                      "Unknown"
                    }
                  />

                  <RaceInfoCard
                    icon="🔄"
                    label="LAPS"
                    value={
                      race.laps !== undefined
                        ? race.laps
                        : "—"
                    }
                  />

                  <RaceInfoCard
                    icon="🏆"
                    label="WINNER"
                    value={
                      race.winner || "—"
                    }
                    accent
                  />

                  <RaceInfoCard
                    icon="●"
                    label="STATUS"
                    value="COMPLETED"
                    green
                  />
                </section>

                {/* WINNER HERO */}

                <section
                  style={
                    raceWinnerHeroStyle
                  }
                >
                  <div
                    style={
                      raceWinnerGlowStyle
                    }
                  />

                  <div
                    style={
                      raceWinnerEyebrowStyle
                    }
                  >
                    🏆 RACE WINNER
                  </div>

                  <div
                    style={
                      raceWinnerNameStyle
                    }
                  >
                    {race.winner}
                  </div>

                  <div
                    style={
                      raceWinnerSubStyle
                    }
                  >
                    Simulation completed
                    successfully
                  </div>

                  <button
                    onClick={settleRace}
                    style={
                      raceReplayButtonStyle
                    }
                  >
                    ↻ Run Again
                  </button>
                </section>

                {/* PODIUM */}

                <section
                  style={
                    podiumSectionStyle
                  }
                >
                  <div
                    style={
                      sectionHeadingStyle
                    }
                  >
                    <div>
                      <div
                        style={
                          cardEyebrowStyle
                        }
                      >
                        FINISHING ORDER
                      </div>

                      <h2
                        style={
                          sectionTitleStyle
                        }
                      >
                        Podium
                      </h2>
                    </div>

                    <span
                      style={
                        sectionMetaStyle
                      }
                    >
                      TOP 3
                    </span>
                  </div>

                  <div
                    style={
                      podiumGridStyle
                    }
                  >
                    {race.results
                      .slice(0, 3)
                      .map(
                        (
                          driver,
                          index
                        ) => (
                          <div
                            key={
                              driver.driver
                            }
                            style={{
                              ...podiumCardStyle,
                              ...(index ===
                              0
                                ? podiumWinnerStyle
                                : {}),
                            }}
                          >
                            <div
                              style={
                                podiumPositionStyle
                              }
                            >
                              {index === 0
                                ? "🥇"
                                : index ===
                                  1
                                ? "🥈"
                                : "🥉"}
                            </div>

                            <div
                              style={
                                podiumDriverStyle
                              }
                            >
                              {
                                driver.driver
                              }
                            </div>

                            <div
                              style={
                                podiumFullNameStyle
                              }
                            >
                              {
                                driver.name
                              }
                            </div>

                            <div
                              style={
                                podiumStatsStyle
                              }
                            >
                              <span>
                                {
                                  driver.lapsCompleted
                                }{" "}
                                laps
                              </span>

                              <span>
                                {
                                  driver.pitStops
                                }{" "}
                                pits
                              </span>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                </section>

                {/* FULL RACE FIELD */}

                <section
                  style={
                    raceFieldCardStyle
                  }
                >
                  <div
                    style={
                      sectionHeadingStyle
                    }
                  >
                    <div>
                      <div
                        style={
                          cardEyebrowStyle
                        }
                      >
                        RACE CONTROL
                      </div>

                      <h2
                        style={
                          sectionTitleStyle
                        }
                      >
                        Full Field
                      </h2>
                    </div>

                    <span
                      style={
                        sectionMetaStyle
                      }
                    >
                      {race.results.length} DRIVERS
                    </span>
                  </div>

                  <div>
                    {race.results.map(
                      (
                        driver,
                        index
                      ) => (
                        <RaceDriverRow
                          key={
                            driver.driver
                          }
                          driver={
                            driver
                          }
                          index={
                            index
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* =================================================
            PORTFOLIO
        ================================================= */}

        {activeTab === "portfolio" && (
          <>
            <PageHeader
              eyebrow="F1X / PORTFOLIO"
              title="Portfolio"
              description="Track your positions, returns and performance."
            />

            <div style={statsGridStyle}>
              <StatCard
                label="INVESTED"
                value={`$${Number(
                  safeSummary.totalInvested
                ).toFixed(2)}`}
                icon="◈"
              />

              <StatCard
                label="PAYOUT"
                value={`$${Number(
                  safeSummary.totalPayout
                ).toFixed(2)}`}
                icon="↗"
              />

              <StatCard
                label="P&L"
                value={`${
                  Number(
                    safeSummary.totalProfitLoss
                  ) >= 0
                    ? "+"
                    : ""
                }$${Number(
                  safeSummary.totalProfitLoss
                ).toFixed(2)}`}
                icon="◎"
                valueColor={
                  Number(
                    safeSummary.totalProfitLoss
                  ) >= 0
                    ? "#4ade80"
                    : "#f87171"
                }
              />

              <StatCard
                label="ROI"
                value={`${Number(
                  safeSummary.roi
                ).toFixed(2)}%`}
                icon="▣"
                valueColor={
                  Number(safeSummary.roi) >= 0
                    ? "#4ade80"
                    : "#f87171"
                }
              />
            </div>

            <div style={largeCardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardEyebrowStyle}>
                    POSITIONS
                  </div>

                  <h2 style={cardTitleStyle}>
                    Trade History
                  </h2>
                </div>
              </div>

              {portfolio.length === 0 ? (
                <div style={emptyStateStyle}>
                  <div style={{ fontSize: "38px" }}>
                    📊
                  </div>

                  <strong>No trades yet</strong>

                  <span style={mutedStyle}>
                    Your positions will appear
                    here.
                  </span>
                </div>
              ) : (
                portfolio.map((bet) => (
                  <div
                    key={bet.id}
                    style={{
                      padding: "18px 0",
                      borderBottom:
                        "1px solid #242a35",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <strong>
                        {bet.driver}
                      </strong>

                      <span
                        style={{
                          color:
                            bet.status ===
                            "WON"
                              ? "#4ade80"
                              : bet.status ===
                                "LOST"
                              ? "#f87171"
                              : "#fbbf24",
                          fontWeight: "800",
                          fontSize: "11px",
                        }}
                      >
                        {bet.status}
                      </span>
                    </div>

                    <div style={miniGridStyle}>
                      <MiniStat
                        label="AMOUNT"
                        value={`$${bet.amount}`}
                      />

                      <MiniStat
                        label="ODDS"
                        value={bet.odds}
                      />

                      <MiniStat
                        label="PAYOUT"
                        value={`$${bet.payout}`}
                      />

                      <MiniStat
                        label="P&L"
                        value={`${
                          bet.profitLoss >= 0
                            ? "+"
                            : ""
                        }${bet.profitLoss}`}
                        valueColor={
                          bet.profitLoss >= 0
                            ? "#4ade80"
                            : "#f87171"
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* =================================================
            LEADERBOARD
        ================================================= */}

        {activeTab === "leaderboard" && (
          <>
            <PageHeader
              eyebrow="F1X / COMPETITION"
              title="Leaderboard"
              description="See who's making the best calls."
            />

            <div style={largeCardStyle}>
              {leaderboard.length === 0 ? (
                <div style={emptyStateStyle}>
                  <div style={{ fontSize: "40px" }}>
                    ♛
                  </div>

                  <strong>
                    No leaderboard data
                  </strong>
                </div>
              ) : (
                leaderboard.map(
                  (leader, index) => (
                    <div
                      key={index}
                      style={leaderboardRowStyle}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "13px",
                        }}
                      >
                        <div
                          style={{
                            ...leaderboardRankStyle,
                            background:
                              index === 0
                                ? "#e10600"
                                : "#242a35",
                          }}
                        >
                          {index + 1}
                        </div>

                        <strong>
                          {leader.name}
                        </strong>
                      </div>

                      <strong
                        style={{
                          color:
                            Number(
                              leader.profit
                            ) >= 0
                              ? "#4ade80"
                              : "#f87171",
                        }}
                      >
                        {Number(
                          leader.profit
                        ) >= 0
                          ? "+"
                          : ""}
                        $
                        {Number(
                          leader.profit
                        ).toFixed(2)}
                      </strong>
                    </div>
                  )
                )
              )}
            </div>
          </>
        )}
      </main>

      <div style={accountBarStyle}>
        <span>Signed in as <strong>{currentUser?.name}</strong></span>
        <button onClick={resetUser} style={switchUserButtonStyle}>Switch user</button>
      </div>

      <footer style={footerStyle}>
        <span style={{ fontWeight: "900" }}>
          <span style={{ color: "#e10600" }}>
            F1
          </span>
          X
        </span>

        <span>
          Predict · Trade · Simulate
        </span>

        <span>
          ML-powered race intelligence
        </span>
      </footer>
    </div>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <section style={pageHeaderStyle}>
      <div>
        <div style={eyebrowStyle}>
          {eyebrow}
        </div>

        <h1 style={pageTitleStyle}>
          {title}
        </h1>

        <p style={pageSubtitleStyle}>
          {description}
        </p>
      </div>

      {action}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  caption,
  valueColor,
}) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>
        <span>{icon}</span>
        {label}
      </div>

      <div
        style={{
          ...statValueStyle,
          color:
            valueColor || "#f1f3f6",
        }}
      >
        {value}
      </div>

      {caption && (
        <div style={statCaptionStyle}>
          {caption}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueColor,
}) {
  return (
    <div style={miniStatStyle}>
      <div style={miniStatLabelStyle}>
        {label}
      </div>

      <strong
        style={{
          color:
            valueColor || "#f1f3f6",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function MarketMetric({
  label,
  value,
  valueColor,
}) {
  return (
    <div style={marketMetricStyle}>
      <span style={smallLabelStyle}>
        {label}
      </span>

      <strong
        style={{
          color:
            valueColor || "#f1f3f6",
          marginTop: "5px",
          display: "block",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function RaceInfoCard({
  icon,
  label,
  value,
  accent,
  green,
}) {
  return (
    <div style={raceInfoCardStyle}>
      <div style={raceInfoIconStyle}>
        {icon}
      </div>

      <div>
        <div style={raceInfoLabelStyle}>
          {label}
        </div>

        <strong
          style={{
            color: accent
              ? "#ff5c55"
              : green
              ? "#4ade80"
              : "#f1f3f6",
            fontSize: "14px",
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function RaceDriverRow({
  driver,
  index,
}) {
  const tyreColors = {
    SOFT: {
      background: "#e10600",
      color: "#fff",
    },
    MEDIUM: {
      background: "#eab308",
      color: "#111",
    },
    HARD: {
      background: "#f1f3f6",
      color: "#111",
    },
    INTERMEDIATE: {
      background: "#22c55e",
      color: "#fff",
    },
    WET: {
      background: "#2563eb",
      color: "#fff",
    },
  };

  return (
    <div
      style={{
        ...raceFieldRowStyle,
        ...(driver.position === 1
          ? raceFirstRowStyle
          : {}),
      }}
    >
      <div style={fieldPositionStyle}>
        {String(
          driver.position
        ).padStart(2, "0")}
      </div>

      <div style={fieldDriverStyle}>
        <strong>
          {driver.driver}
        </strong>

        <span>
          {driver.name}
        </span>
      </div>

      <div style={fieldStatusStyle}>
        {driver.dnf ? (
          <span
            style={dnfBadgeStyle}
          >
            DNF
          </span>
        ) : (
          <span
            style={finishedBadgeStyle}
          >
            FINISHED
          </span>
        )}
      </div>

      <div style={fieldStatStyle}>
        <span style={smallLabelStyle}>
          LAPS
        </span>

        <strong>
          {driver.lapsCompleted}
        </strong>
      </div>

      <div style={fieldStatStyle}>
        <span style={smallLabelStyle}>
          PITS
        </span>

        <strong>
          {driver.pitStops}
        </strong>
      </div>

      <div style={fieldStatStyle}>
        <span style={smallLabelStyle}>
          INCIDENTS
        </span>

        <strong
          style={{
            color:
              driver.incidents > 0
                ? "#fbbf24"
                : "#4ade80",
          }}
        >
          {driver.incidents}
        </strong>
      </div>

      <div style={tyreStrategyStyle}>
        {driver.tyreStrategy &&
          driver.tyreStrategy.map(
            (tyre, tyreIndex) => (
              <span
                key={tyreIndex}
                style={{
                  ...tyreBadgeStyle,
                  ...(tyreColors[
                    tyre
                  ] ||
                    {
                      background:
                        "#242a35",
                      color:
                        "#f1f3f6",
                    }),
                }}
              >
                {tyre}
              </span>
            )
          )}
      </div>
    </div>
  );
}

/* =====================================================
   GENERAL STYLES
===================================================== */

const appStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 50% -15%, #202630 0%, #0b0e13 38%, #080a0e 100%)",
  color: "#f5f7fa",
  fontFamily:
    "'Inter', 'Segoe UI', Arial, sans-serif",
};

const loginPageStyle = {
  minHeight: "100vh",
  background: "radial-gradient(circle at 50% -15%, #202630 0%, #0b0e13 38%, #080a0e 100%)",
  color: "#f5f7fa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
};

const loginCardStyle = {
  width: "min(440px, 100%)",
  background: "rgba(21,25,34,.96)",
  border: "1px solid #303746",
  borderRadius: "20px",
  padding: "38px",
  boxShadow: "0 24px 80px rgba(0,0,0,.4)",
};

const loginLogoStyle = { fontSize: "44px", fontWeight: "900", letterSpacing: "-2px" };
const loginEyebrowStyle = { color: "#e10600", fontSize: "9px", fontWeight: "900", letterSpacing: "1.4px", marginTop: "10px" };
const loginTitleStyle = { fontSize: "34px", lineHeight: "1.05", margin: "22px 0 10px", letterSpacing: "-1.3px" };
const loginSubtitleStyle = { color: "#858e9e", fontSize: "13px", lineHeight: "1.6", marginBottom: "24px" };
const loginInputStyle = { width: "100%", boxSizing: "border-box", background: "#0d1117", color: "#fff", border: "1px solid #303746", borderRadius: "10px", padding: "14px", fontSize: "14px", outline: "none", marginBottom: "12px" };
const loginButtonStyle = { width: "100%", background: "linear-gradient(135deg,#e10600,#ff3b30)", color: "#fff", border: "none", padding: "13px 18px", borderRadius: "9px", cursor: "pointer", fontWeight: "800" };
const loginHintStyle = { color: "#535d6d", fontSize: "10px", textAlign: "center", marginTop: "12px" };
const userPillStyle = { background: "#151922", border: "1px solid #292f3b", padding: "9px 14px", borderRadius: "10px", display: "flex", gap: "8px", alignItems: "center" };
const userPillLabelStyle = { color: "#697283", fontSize: "8px", letterSpacing: "1px" };
const accountBarStyle = { maxWidth: "1280px", margin: "-30px auto 24px", padding: "0 28px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", color: "#626b7b", fontSize: "10px" };
const switchUserButtonStyle = { background: "transparent", color: "#8b93a3", border: "1px solid #303746", borderRadius: "7px", padding: "6px 10px", cursor: "pointer", fontSize: "10px" };

const loadingPageStyle = {
  minHeight: "100vh",
  background: "#080a0e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loadingBoxStyle = {
  textAlign: "center",
};

const loadingLogoStyle = {
  fontSize: "44px",
  fontWeight: "900",
  letterSpacing: "-2px",
};

const loadingBarStyle = {
  width: "80px",
  height: "3px",
  background: "#e10600",
  margin: "18px auto",
  borderRadius: "10px",
};

const loadingTextStyle = {
  color: "#737b8c",
  fontSize: "12px",
};

const topBarStyle = {
  background:
    "rgba(8,10,14,.92)",
  borderBottom:
    "1px solid #242a35",
  padding: "15px 32px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  position: "sticky",
  top: 0,
  zIndex: 100,
  backdropFilter: "blur(16px)",
};

const brandWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
};

const brandStyle = {
  fontSize: "25px",
  fontWeight: "900",
  letterSpacing: "-1.5px",
};

const brandDividerStyle = {
  width: "1px",
  height: "22px",
  background: "#303746",
};

const taglineStyle = {
  color: "#626b7b",
  fontSize: "9px",
  letterSpacing: "1.3px",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const liveBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#737b8c",
  fontSize: "9px",
  fontWeight: "800",
};

const liveDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#4ade80",
};

const balancePillStyle = {
  background: "#151922",
  border: "1px solid #292f3b",
  padding: "9px 14px",
  borderRadius: "10px",
  display: "flex",
  gap: "9px",
};

const balanceLabelStyle = {
  color: "#697283",
  fontSize: "9px",
};

const navigationStyle = {
  background:
    "rgba(8,10,14,.82)",
  borderBottom:
    "1px solid #242a35",
  position: "sticky",
  top: "69px",
  zIndex: 90,
  backdropFilter: "blur(16px)",
};

const navigationInnerStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 20px",
  display: "flex",
  overflowX: "auto",
};

const navButtonStyle = {
  background: "transparent",
  color: "#737b8c",
  border: "none",
  borderBottom:
    "2px solid transparent",
  padding: "15px 20px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
  whiteSpace: "nowrap",
};

const activeNavButtonStyle = {
  color: "#fff",
  borderBottom:
    "2px solid #e10600",
};

const navIconStyle = {
  marginRight: "7px",
};

const activeNavIconStyle = {
  color: "#e10600",
};

const mainStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "42px 28px 70px",
};

const eyebrowStyle = {
  color: "#e10600",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1.4px",
};

const pageHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-end",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "28px",
};

const pageTitleStyle = {
  fontSize: "34px",
  fontWeight: "850",
  letterSpacing: "-1px",
  margin: "8px 0",
};

const pageSubtitleStyle = {
  color: "#858e9e",
  fontSize: "14px",
  margin: 0,
};

const heroStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,1.35fr) minmax(300px,.65fr)",
  gap: "24px",
  marginBottom: "24px",
};

const heroTitleStyle = {
  fontSize: "52px",
  lineHeight: ".98",
  letterSpacing: "-2.5px",
  margin: "10px 0 18px",
  fontWeight: "900",
};

const heroAccentStyle = {
  color: "#e10600",
};

const heroSubtitleStyle = {
  maxWidth: "520px",
  color: "#8b93a3",
  lineHeight: "1.6",
  fontSize: "14px",
};

const heroActionsStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "24px",
};

const topPickCardStyle = {
  background:
    "linear-gradient(145deg,#1a1d25,#11141b)",
  border:
    "1px solid rgba(225,6,0,.35)",
  borderRadius: "18px",
  padding: "24px",
  minHeight: "260px",
  display: "flex",
  flexDirection: "column",
};

const topPickHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
};

const topPickLabelStyle = {
  color: "#ff5c55",
  fontSize: "9px",
  fontWeight: "900",
};

const topDriverStyle = {
  fontSize: "28px",
  fontWeight: "900",
  marginTop: "30px",
};

const topProbabilityStyle = {
  fontSize: "54px",
  fontWeight: "900",
  marginTop: "8px",
};

const topPickCaptionStyle = {
  color: "#737b8c",
  fontSize: "11px",
};

const topProbabilityTrackStyle = {
  height: "5px",
  background: "#252b35",
  borderRadius: "10px",
  overflow: "hidden",
  marginTop: "20px",
};

const topProbabilityBarStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg,#e10600,#ff4d45)",
};

const topPickButtonStyle = {
  marginTop: "auto",
  background: "transparent",
  border: "none",
  color: "#ff5c55",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "700",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: "15px",
  marginBottom: "20px",
};

const statCardStyle = {
  background:
    "linear-gradient(145deg,#171b24,#12151c)",
  border:
    "1px solid #252b38",
  borderRadius: "14px",
  padding: "19px",
};

const statLabelStyle = {
  display: "flex",
  gap: "7px",
  color: "#737b8c",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1px",
  marginBottom: "11px",
};

const statValueStyle = {
  fontSize: "25px",
  fontWeight: "850",
};

const statCaptionStyle = {
  color: "#535d6d",
  fontSize: "10px",
  marginTop: "7px",
};

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,1.35fr) minmax(300px,.65fr)",
  gap: "20px",
  marginBottom: "20px",
};

const largeCardStyle = {
  background:
    "rgba(21,25,34,.94)",
  padding: "22px",
  borderRadius: "16px",
  border:
    "1px solid #252b38",
  boxShadow:
    "0 10px 35px rgba(0,0,0,.17)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "15px",
  marginBottom: "18px",
};

const cardEyebrowStyle = {
  color: "#626b7b",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1.1px",
  marginBottom: "6px",
};

const cardTitleStyle = {
  fontSize: "19px",
  fontWeight: "800",
  margin: 0,
};

const cardDescriptionStyle = {
  color: "#737b8c",
  fontSize: "11px",
  lineHeight: "1.5",
  margin: "6px 0 0",
};

const mlBadgeStyle = {
  background:
    "rgba(225,6,0,.08)",
  border:
    "1px solid rgba(225,6,0,.24)",
  color: "#ff5c55",
  padding: "5px 9px",
  borderRadius: "20px",
  fontSize: "8px",
  fontWeight: "900",
};

const probabilityTrackStyle = {
  height: "4px",
  background: "#242a35",
  borderRadius: "10px",
  overflow: "hidden",
};

const probabilityBarStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg,#e10600,#ff4d45)",
};

const primaryButton = {
  background:
    "linear-gradient(135deg,#e10600,#ff3b30)",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "800",
};

const secondaryButton = {
  background: "#171b24",
  color: "#d9dde4",
  border: "1px solid #303746",
  padding: "12px 20px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "700",
};

const textButtonStyle = {
  background: "transparent",
  color: "#8b93a3",
  border: "none",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "700",
};

/* =====================================================
   MARKET STYLES
===================================================== */

const marketsHeroStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-end",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const marketBalanceCardStyle = {
  background:
    "linear-gradient(145deg,#171b24,#11141b)",
  border:
    "1px solid #303746",
  borderRadius: "12px",
  padding: "14px 18px",
  minWidth: "170px",
};

const marketBalanceLabelStyle = {
  display: "block",
  color: "#697283",
  fontSize: "9px",
  letterSpacing: "1px",
  marginBottom: "5px",
};

const tradeControlStyle = {
  background:
    "rgba(21,25,34,.94)",
  border:
    "1px solid #252b38",
  borderRadius: "14px",
  padding: "17px 20px",
  display: "flex",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const tradeAmountWrapperStyle = {
  display: "flex",
  alignItems: "center",
  background: "#0d1017",
  border: "1px solid #303746",
  borderRadius: "9px",
  overflow: "hidden",
};

const currencyPrefixStyle = {
  paddingLeft: "12px",
  color: "#737b8c",
  fontWeight: "700",
};

const tradeAmountInputStyle = {
  width: "90px",
  padding: "11px 10px",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "700",
};

const quickAmountGroupStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const quickAmountButtonStyle = {
  background: "#151922",
  color: "#8b93a3",
  border: "1px solid #303746",
  borderRadius: "7px",
  padding: "8px 11px",
  cursor: "pointer",
  fontSize: "11px",
};

const quickAmountActiveStyle = {
  background:
    "rgba(225,6,0,.12)",
  color: "#ff5c55",
  border:
    "1px solid rgba(225,6,0,.4)",
};

const selectedTradeStyle = {
  background:
    "linear-gradient(135deg,rgba(225,6,0,.12),rgba(225,6,0,.03))",
  border:
    "1px solid rgba(225,6,0,.3)",
  borderRadius: "12px",
  padding: "15px 18px",
  marginBottom: "18px",
  display: "flex",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const cancelButtonStyle = {
  background: "transparent",
  color: "#737b8c",
  border: "none",
  cursor: "pointer",
  fontWeight: "700",
};

const marketGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(275px,1fr))",
  gap: "14px",
};

const driverMarketCardStyle = {
  background:
    "linear-gradient(145deg,#171b24,#12151c)",
  border:
    "1px solid #252b38",
  borderRadius: "14px",
  padding: "18px",
};

const selectedDriverCardStyle = {
  border:
    "1px solid rgba(225,6,0,.65)",
};

const driverCardTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
};

const driverRankStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "#242a35",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: "900",
};

const driverRankFirstStyle = {
  background: "#e10600",
};

const favoriteLabelStyle = {
  color: "#e10600",
  fontSize: "8px",
  fontWeight: "900",
  marginTop: "3px",
};

const positiveEVBadgeStyle = {
  background:
    "rgba(74,222,128,.09)",
  border:
    "1px solid rgba(74,222,128,.25)",
  color: "#4ade80",
  padding: "4px 7px",
  borderRadius: "20px",
  fontSize: "8px",
  fontWeight: "900",
};

const probabilitySectionStyle = {
  marginTop: "20px",
};

const smallLabelStyle = {
  color: "#626b7b",
  fontSize: "8px",
  letterSpacing: ".8px",
  fontWeight: "800",
};

const marketProbabilityTrackStyle = {
  height: "6px",
  background: "#252b35",
  borderRadius: "10px",
  overflow: "hidden",
};

const marketProbabilityBarStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg,#e10600,#ff4d45)",
};

const marketMetricsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,1fr)",
  gap: "7px",
  marginTop: "18px",
};

const marketMetricStyle = {
  background: "#10141b",
  border:
    "1px solid #242a35",
  borderRadius: "8px",
  padding: "10px",
};

const marketTradeButtonStyle = {
  width: "100%",
  marginTop: "15px",
  background: "#1c212b",
  color: "#e7eaf0",
  border: "1px solid #303746",
  borderRadius: "8px",
  padding: "10px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "11px",
};

const marketTradeSelectedStyle = {
  background:
    "linear-gradient(135deg,#e10600,#ff3b30)",
  border: "none",
};

const marketInfoStyle = {
  marginTop: "18px",
  padding: "17px 19px",
  background: "#11151c",
  border:
    "1px solid #242a35",
  borderRadius: "12px",
  display: "flex",
  gap: "14px",
};

/* =====================================================
   RACE STYLES
===================================================== */

const racePageHeroStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-end",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "25px",
};

const raceSimulateButtonStyle = {
  ...primaryButton,
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "13px 20px",
};

const raceEmptyStateStyle = {
  ...largeCardStyle,
  minHeight: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const raceEmptyIconStyle = {
  width: "90px",
  height: "90px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(225,6,0,.08)",
  border:
    "1px solid rgba(225,6,0,.2)",
  fontSize: "40px",
  marginBottom: "20px",
};

const raceEmptyTitleStyle = {
  fontSize: "24px",
  margin: "10px 0 5px",
};

const raceEmptyTextStyle = {
  color: "#737b8c",
  maxWidth: "440px",
  lineHeight: "1.6",
  fontSize: "13px",
  marginBottom: "22px",
};

const raceStatusGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const raceInfoCardStyle = {
  background:
    "linear-gradient(145deg,#171b24,#12151c)",
  border:
    "1px solid #252b38",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const raceInfoIconStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "9px",
  background: "#202530",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
};

const raceInfoLabelStyle = {
  color: "#626b7b",
  fontSize: "8px",
  fontWeight: "900",
  letterSpacing: ".9px",
  marginBottom: "4px",
};

const raceWinnerHeroStyle = {
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(145deg,#1b171b,#11141a)",
  border:
    "1px solid rgba(225,6,0,.4)",
  borderRadius: "18px",
  padding: "38px 35px",
  textAlign: "center",
  marginBottom: "20px",
};

const raceWinnerGlowStyle = {
  position: "absolute",
  width: "280px",
  height: "180px",
  borderRadius: "50%",
  background:
    "rgba(225,6,0,.14)",
  filter: "blur(60px)",
  left: "50%",
  top: "-100px",
  transform: "translateX(-50%)",
};

const raceWinnerEyebrowStyle = {
  position: "relative",
  color: "#ff5c55",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1.4px",
};

const raceWinnerNameStyle = {
  position: "relative",
  fontSize: "48px",
  fontWeight: "900",
  letterSpacing: "-2px",
  marginTop: "9px",
};

const raceWinnerSubStyle = {
  position: "relative",
  color: "#737b8c",
  fontSize: "11px",
  marginTop: "5px",
};

const raceReplayButtonStyle = {
  position: "relative",
  marginTop: "22px",
  background: "transparent",
  color: "#ff5c55",
  border:
    "1px solid rgba(225,6,0,.35)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "11px",
};

const podiumSectionStyle = {
  ...largeCardStyle,
  marginBottom: "20px",
};

const sectionHeadingStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "18px",
};

const sectionTitleStyle = {
  fontSize: "20px",
  margin: 0,
};

const sectionMetaStyle = {
  color: "#626b7b",
  fontSize: "8px",
  fontWeight: "900",
  letterSpacing: "1px",
  paddingTop: "3px",
};

const podiumGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,1fr)",
  gap: "12px",
};

const podiumCardStyle = {
  background: "#10141b",
  border:
    "1px solid #242a35",
  borderRadius: "12px",
  padding: "22px 16px",
  textAlign: "center",
};

const podiumWinnerStyle = {
  background:
    "linear-gradient(145deg,rgba(225,6,0,.14),#10141b)",
  border:
    "1px solid rgba(225,6,0,.4)",
};

const podiumPositionStyle = {
  fontSize: "30px",
  marginBottom: "8px",
};

const podiumDriverStyle = {
  fontSize: "23px",
  fontWeight: "900",
};

const podiumFullNameStyle = {
  color: "#737b8c",
  fontSize: "10px",
  marginTop: "3px",
};

const podiumStatsStyle = {
  display: "flex",
  justifyContent:
    "center",
  gap: "15px",
  color: "#626b7b",
  fontSize: "9px",
  marginTop: "16px",
};

const raceFieldCardStyle = {
  ...largeCardStyle,
};

const raceFieldRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "55px minmax(150px,1.4fr) 95px repeat(3,70px) minmax(160px,1fr)",
  alignItems: "center",
  gap: "12px",
  padding: "15px 4px",
  borderBottom:
    "1px solid #202630",
};

const raceFirstRowStyle = {
  background:
    "linear-gradient(90deg,rgba(225,6,0,.08),transparent)",
};

const fieldPositionStyle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#737b8c",
};

const fieldDriverStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const fieldDriverNameStyle = {};

const fieldStatusStyle = {
  fontSize: "8px",
  fontWeight: "900",
};

const finishedBadgeStyle = {
  color: "#4ade80",
};

const dnfBadgeStyle = {
  color: "#f87171",
};

const fieldStatStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const tyreStrategyStyle = {
  display: "flex",
  gap: "5px",
  flexWrap: "wrap",
};

const tyreBadgeStyle = {
  padding: "4px 6px",
  borderRadius: "5px",
  fontSize: "7px",
  fontWeight: "900",
};

/* =====================================================
   OTHER STYLES
===================================================== */

const emptyStateStyle = {
  minHeight: "220px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  textAlign: "center",
};

const miniGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(130px,1fr))",
  gap: "10px",
};

const miniStatStyle = {
  background: "#10141b",
  border:
    "1px solid #242a35",
  borderRadius: "9px",
  padding: "12px",
};

const miniStatLabelStyle = {
  color: "#626b7b",
  fontSize: "8px",
  letterSpacing: ".7px",
  marginBottom: "5px",
};

const mutedStyle = {
  color: "#737b8c",
  fontSize: "12px",
  lineHeight: "1.5",
};

const leaderboardRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  padding: "18px 4px",
  borderBottom:
    "1px solid #242a35",
};

const leaderboardRankStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "12px",
};

const footerStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding:
    "20px 28px 35px",
  display: "flex",
  justifyContent:
    "space-between",
  flexWrap: "wrap",
  gap: "15px",
  color: "#454d5b",
  fontSize: "10px",
  borderTop:
    "1px solid #171c25",
};

export default App;