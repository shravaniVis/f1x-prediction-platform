const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// USERS
// =====================================================

// Lightweight multi-user identity. No passwords are required.
// The frontend stores the generated userId in localStorage.

let users = [];
let nextUserId = 1;

function createUser(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return null;
  }

  const newUser = {
    id: nextUserId++,
    name: cleanName.slice(0, 40),
    balance: 10000,
    profit: 0
  };

  users.push(newUser);
  return newUser;
}

function getUserById(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return users.find((item) => item.id === id) || null;
}

function getUserBets(userId) {
  return bets.filter((bet) => bet.userId === userId);
}

function calculateUserProfit(userId) {
  return getUserBets(userId).reduce(
    (total, bet) => total + Number(bet.profitLoss || 0),
    0
  );
}



function requireUser(req, res) {
  const userId =
    (req.body && req.body.userId) ||
    req.query.userId;

  const selectedUser = getUserById(userId);

  if (!selectedUser) {
    res.status(400).json({
      message: "A valid userId is required."
    });
    return null;
  }

  return selectedUser;
}



// =====================================================
// MARKET
// =====================================================

let marketBets = {};

// =====================================================
// PORTFOLIO
// =====================================================

let bets = [];

// =====================================================
// LAST RACE
// =====================================================

let lastRace = null;

// =====================================================
// CURRENT ML PREDICTIONS
// =====================================================

let currentPredictions = {};

// =====================================================
// DRIVER PROFILES
// =====================================================

const driverProfiles = {
  VER: {
    name: "Max Verstappen",
    pace: 0.95,
    consistency: 0.92,
    tyreManagement: 0.90,
    pitStop: 0.92,
    incidentRisk: 0.05
  },

  LEC: {
    name: "Charles Leclerc",
    pace: 0.91,
    consistency: 0.88,
    tyreManagement: 0.86,
    pitStop: 0.88,
    incidentRisk: 0.07
  },

  NOR: {
    name: "Lando Norris",
    pace: 0.89,
    consistency: 0.87,
    tyreManagement: 0.89,
    pitStop: 0.90,
    incidentRisk: 0.06
  }
};

// =====================================================
// DEFAULT DRIVER PROFILE
// =====================================================

function getDriverProfile(driver) {
  if (driverProfiles[driver]) {
    return driverProfiles[driver];
  }

  return {
    name: driver,
    pace: 0.84,
    consistency: 0.82,
    tyreManagement: 0.82,
    pitStop: 0.85,
    incidentRisk: 0.08
  };
}

// =====================================================
// TYRE DATA
// =====================================================

const tyres = {
  SOFT: {
    name: "Soft",
    pace: -0.80,
    degradation: 0.075,
    dryPerformance: 1.0,
    wetPerformance: 1.35
  },

  MEDIUM: {
    name: "Medium",
    pace: 0,
    degradation: 0.045,
    dryPerformance: 1.0,
    wetPerformance: 1.20
  },

  HARD: {
    name: "Hard",
    pace: 0.45,
    degradation: 0.025,
    dryPerformance: 1.0,
    wetPerformance: 1.10
  },

  INTERMEDIATE: {
    name: "Intermediate",
    pace: 1.80,
    degradation: 0.055,
    dryPerformance: 1.25,
    wetPerformance: 1.0
  }
};

// =====================================================
// ML PREDICTIONS
// =====================================================

function getMLPredictions() {
  return new Promise((resolve, reject) => {
    const mlServicePath = path.join(
      __dirname,
      "..",
      "ml-service"
    );

    execFile(
      "python3",
      ["predict.py"],
      {
        cwd: mlServicePath,
        timeout: 8000,
        killSignal: "SIGTERM",
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          console.log(
            "ML prediction error:",
            error.message
          );

          return reject(error);
        }

        try {
          const predictions =
            JSON.parse(stdout.trim());

          resolve(predictions);
        } catch (parseError) {
          console.log(
            "Could not parse ML output:",
            stdout
          );

          reject(parseError);
        }
      }
    );
  });
}

// =====================================================
// INITIALIZE MARKET
// =====================================================

function initializeMarket(predictions) {
  for (const driver of Object.keys(predictions)) {
    if (marketBets[driver] === undefined) {
      marketBets[driver] = 0;
    }
  }
}

// =====================================================
// RANDOM HELPER
// =====================================================

function randomBetween(min, max) {
  return (
    Math.random() *
      (max - min) +
    min
  );
}

// =====================================================
// WEATHER
// =====================================================

function generateWeather() {
  const random = Math.random();

  if (random < 0.60) {
    return {
      condition: "DRY",
      label: "☀️ Dry",
      wetness: 0
    };
  }

  if (random < 0.80) {
    return {
      condition: "CLOUDY",
      label: "☁️ Cloudy",
      wetness: 0.15
    };
  }

  if (random < 0.93) {
    return {
      condition: "LIGHT_RAIN",
      label: "🌦️ Light Rain",
      wetness: 0.55
    };
  }

  return {
    condition: "HEAVY_RAIN",
    label: "🌧️ Heavy Rain",
    wetness: 1
  };
}

// =====================================================
// STARTING TYRE
// =====================================================

function chooseStartingTyre(weather) {
  if (
    weather.condition ===
    "HEAVY_RAIN"
  ) {
    return "INTERMEDIATE";
  }

  if (
    weather.condition ===
    "LIGHT_RAIN"
  ) {
    return Math.random() < 0.7
      ? "INTERMEDIATE"
      : "MEDIUM";
  }

  const random = Math.random();

  if (random < 0.35) {
    return "SOFT";
  }

  if (random < 0.80) {
    return "MEDIUM";
  }

  return "HARD";
}

// =====================================================
// PIT TYRE
// =====================================================

function choosePitTyre(
  currentTyre,
  weather
) {
  if (
    weather.condition ===
    "HEAVY_RAIN"
  ) {
    return "INTERMEDIATE";
  }

  if (
    weather.condition ===
    "LIGHT_RAIN"
  ) {
    return "INTERMEDIATE";
  }

  if (
    currentTyre === "SOFT"
  ) {
    return "MEDIUM";
  }

  if (
    currentTyre === "MEDIUM"
  ) {
    return Math.random() < 0.5
      ? "HARD"
      : "SOFT";
  }

  if (
    currentTyre === "HARD"
  ) {
    return "MEDIUM";
  }

  return "MEDIUM";
}

// =====================================================
// FALLBACK PREDICTIONS
// =====================================================

function generatePredictions() {
  return {
    VER: 0.58,
    LEC: 0.27,
    NOR: 0.15
  };
}

// =====================================================
// ODDS
// =====================================================

function calculateOdds(predictions) {
  const odds = {};

  const totalBets =
    Object.values(marketBets).reduce(
      (sum, value) =>
        sum + Number(value || 0),
      0
    );

  for (const driver in predictions) {
    const probability =
      Number(predictions[driver]);

    if (probability <= 0) {
      odds[driver] = "99.99";
      continue;
    }

    const baseOdds =
      1 / probability;

    let marketImpact = 1;

    const driverBets =
      Number(
        marketBets[driver] || 0
      );

    if (totalBets > 0) {
      const share =
        driverBets /
        totalBets;

      marketImpact =
        1 - share * 0.5;
    }

    odds[driver] = (
      baseOdds *
      marketImpact
    ).toFixed(2);
  }

  return odds;
}

// =====================================================
// EXPECTED VALUE
// =====================================================

function calculateEV(
  probability,
  odds
) {
  odds = parseFloat(odds);

  return (
    probability * odds -
    (1 - probability)
  ).toFixed(2);
}

// =====================================================
// MONTE CARLO SIMULATION
// =====================================================

function runSimulation(predictions) {
  const results = {};

  const driversList =
    Object.keys(predictions);

  driversList.forEach(
    (driver) => {
      results[driver] = 0;
    }
  );

  const totalProbability =
    Object.values(
      predictions
    ).reduce(
      (sum, value) =>
        sum + Number(value),
      0
    );

  for (
    let i = 0;
    i < 10000;
    i++
  ) {
    const random =
      Math.random();

    let cumulative = 0;

    for (
      const driver of driversList
    ) {
      const probability =
        Number(
          predictions[driver]
        ) /
        totalProbability;

      cumulative +=
        probability;

      if (
        random <= cumulative
      ) {
        results[driver]++;
        break;
      }
    }
  }

  for (
    const driver in results
  ) {
    results[driver] =
      Number(
        (
          results[driver] /
          10000
        ).toFixed(3)
      );
  }

  return results;
}

// =====================================================
// RACE SIMULATION
// =====================================================

function simulateRace() {
  const totalLaps = 20;

  const weather =
    generateWeather();

  const predictionDrivers =
    Object.keys(
      currentPredictions
    );

  let raceDrivers = [];

  const probabilities =
    Object.values(
      currentPredictions
    ).map(Number);

  const averageProbability =
    probabilities.length > 0
      ? probabilities.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / probabilities.length
      : 1;

  for (
    const driverCode of predictionDrivers
  ) {
    const driver =
      getDriverProfile(
        driverCode
      );

    const mlProbability =
      Number(
        currentPredictions[
          driverCode
        ]
      );

    // =================================================
    // ML PERFORMANCE FACTOR
    // =================================================

    const mlStrength =
      averageProbability > 0
        ? mlProbability /
          averageProbability
        : 1;

    /*
      Higher ML probability gives
      a controlled pace advantage.

      We deliberately keep the effect
      small so weather, tyres, strategy,
      incidents and randomness still matter.
    */

    const mlPaceBonus =
      Math.max(
        -1.5,
        Math.min(
          1.5,
          (mlStrength - 1) *
            2.5
        )
      );

    let currentTyre =
      chooseStartingTyre(
        weather
      );

    let tyreAge = 0;

    let totalTime = 0;

    let pitStops = 0;

    let incidents = 0;

    let dnf = false;

    let lapsCompleted = 0;

    let tyreHistory = [
      currentTyre
    ];

    // =================================================
    // LAP-BY-LAP SIMULATION
    // =================================================

    for (
      let lap = 1;
      lap <= totalLaps;
      lap++
    ) {
      if (dnf) {
        break;
      }

      tyreAge++;

      const tyre =
        tyres[currentTyre];

      // -----------------------------------------------
      // TYRE DEGRADATION
      // -----------------------------------------------

      let degradation =
        tyre.degradation *
        tyreAge;

      degradation *=
        1 -
        driver.tyreManagement *
          0.25;

      // -----------------------------------------------
      // WEATHER EFFECT
      // -----------------------------------------------

      let weatherPenalty = 0;

      if (
        weather.condition ===
        "DRY"
      ) {
        if (
          currentTyre ===
          "INTERMEDIATE"
        ) {
          weatherPenalty =
            tyre.dryPerformance;
        }
      }

      if (
        weather.condition ===
        "CLOUDY"
      ) {
        if (
          currentTyre ===
          "INTERMEDIATE"
        ) {
          weatherPenalty =
            tyre.dryPerformance *
            0.4;
        }
      }

      if (
        weather.condition ===
        "LIGHT_RAIN"
      ) {
        if (
          currentTyre === "SOFT" ||
          currentTyre === "MEDIUM" ||
          currentTyre === "HARD"
        ) {
          weatherPenalty =
            tyre.wetPerformance *
            weather.wetness;
        }
      }

      if (
        weather.condition ===
        "HEAVY_RAIN"
      ) {
        if (
          currentTyre !==
          "INTERMEDIATE"
        ) {
          weatherPenalty =
            tyre.wetPerformance *
            2;
        }
      }

      // -----------------------------------------------
      // BASE LAP TIME
      // -----------------------------------------------

      let baseLapTime =
        90 +
        (1 - driver.pace) *
          10;

      // -----------------------------------------------
      // ML EFFECT
      // -----------------------------------------------

      baseLapTime -=
        mlPaceBonus;

      // -----------------------------------------------
      // CONSISTENCY
      // -----------------------------------------------

      const consistencyNoise =
        randomBetween(
          -0.4,
          0.4
        ) *
        (1 -
          driver.consistency);

      // -----------------------------------------------
      // FINAL LAP TIME
      // -----------------------------------------------

      let lapTime =
        baseLapTime +
        tyre.pace +
        degradation +
        weatherPenalty +
        consistencyNoise;

      // -----------------------------------------------
      // INCIDENT
      // -----------------------------------------------

      if (
        Math.random() <
        driver.incidentRisk *
          0.02
      ) {
        incidents++;

        lapTime +=
          randomBetween(
            5,
            20
          );
      }

      // -----------------------------------------------
      // PIT STRATEGY
      // -----------------------------------------------

      let shouldPit = false;

      if (lap === 10) {
        shouldPit = true;
      }

      if (
        weather.condition ===
          "LIGHT_RAIN" &&
        lap === 14 &&
        currentTyre !==
          "INTERMEDIATE"
      ) {
        shouldPit = true;
      }

      if (
        weather.condition ===
          "HEAVY_RAIN" &&
        lap === 5 &&
        currentTyre !==
          "INTERMEDIATE"
      ) {
        shouldPit = true;
      }

      if (shouldPit) {
        pitStops++;

        lapTime +=
          randomBetween(
            18,
            23
          );

        currentTyre =
          choosePitTyre(
            currentTyre,
            weather
          );

        tyreAge = 0;

        tyreHistory.push(
          currentTyre
        );
      }

      // -----------------------------------------------
      // DNF
      // -----------------------------------------------

      if (
        Math.random() <
        driver.incidentRisk *
          0.002
      ) {
        dnf = true;

        incidents++;

        break;
      }

      totalTime +=
        lapTime;

      lapsCompleted++;
    }

    raceDrivers.push({
      driver:
        driverCode,

      name:
        driver.name,

      mlProbability:
        Number(
          (
            mlProbability *
            100
          ).toFixed(2)
        ),

      totalTime:
        totalTime,

      lapsCompleted:
        lapsCompleted,

      pitStops:
        pitStops,

      incidents:
        incidents,

      dnf:
        dnf,

      tyreStrategy:
        tyreHistory
    });
  }

  // =================================================
  // SORT RESULTS
  // =================================================

  raceDrivers.sort(
    (a, b) => {
      if (
        a.lapsCompleted !==
        b.lapsCompleted
      ) {
        return (
          b.lapsCompleted -
          a.lapsCompleted
        );
      }

      if (
        a.dnf !== b.dnf
      ) {
        return a.dnf
          ? 1
          : -1;
      }

      return (
        a.totalTime -
        b.totalTime
      );
    }
  );

  // =================================================
  // ASSIGN POSITIONS
  // =================================================

  raceDrivers =
    raceDrivers.map(
      (driver, index) => ({
        position:
          index + 1,

        driver:
          driver.driver,

        name:
          driver.name,

        mlProbability:
          driver.mlProbability,

        totalTime:
          Number(
            driver.totalTime.toFixed(
              3
            )
          ),

        lapsCompleted:
          driver.lapsCompleted,

        pitStops:
          driver.pitStops,

        incidents:
          driver.incidents,

        dnf:
          driver.dnf,

        tyreStrategy:
          driver.tyreStrategy
      })
    );

  return {
    laps:
      totalLaps,

    weather:
      weather.condition,

    weatherLabel:
      weather.label,

    results:
      raceDrivers,

    winner:
      raceDrivers.length > 0
        ? raceDrivers[0].driver
        : null
  };
}

// =====================================================
// ROOT
// =====================================================

app.get(
  "/",
  (req, res) => {
    res.send(
      "F1 Backend Running 🚀"
    );
  }
);

// =====================================================
// PREDICTIONS
// =====================================================

app.get(
  "/predictions",
  async (req, res) => {
    let predictions;

    try {
      predictions =
        await getMLPredictions();

      currentPredictions =
        predictions;

      initializeMarket(
        predictions
      );

      console.log(
        "Using ML predictions:",
        predictions
      );
    } catch (error) {
      console.log(
        "Using fallback predictions."
      );

      predictions =
        generatePredictions();

      currentPredictions =
        predictions;

      initializeMarket(
        predictions
      );
    }

    const odds =
      calculateOdds(
        predictions
      );

    const ev = {};

    for (
      const driver in predictions
    ) {
      ev[driver] =
        calculateEV(
          predictions[
            driver
          ],
          odds[driver]
        );
    }

    const simulation =
      runSimulation(
        predictions
      );

    res.json({
      predictions,
      odds,
      ev,
      simulation,
      marketBets
    });
  }
);

// =====================================================
// USER
// =====================================================

app.post(
  "/user",
  (req, res) => {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Name is required"
      });
    }

    const newUser = createUser(name);
    res.status(201).json(newUser);
  }
);

app.get(
  "/user",
  (req, res) => {
    const selectedUser = requireUser(req, res);

    if (!selectedUser) {
      return;
    }

    selectedUser.profit = Number(
      calculateUserProfit(selectedUser.id).toFixed(2)
    );

    res.json(selectedUser);
  }
);

// =====================================================
// PLACE BET
// =====================================================

app.post(
  "/bet",
  (req, res) => {
    const selectedUser = requireUser(req, res);

    if (!selectedUser) {
      return;
    }

    const { driver, amount } = req.body;

    if (!driver || !amount) {
      return res.status(400).json({
        message: "Missing driver or amount"
      });
    }

    if (!currentPredictions[driver]) {
      return res.status(400).json({
        message: "Driver is not available in the current market"
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    if (selectedUser.balance < numericAmount) {
      return res.status(400).json({
        message: "Not enough balance"
      });
    }

    initializeMarket(currentPredictions);

    const odds = calculateOdds(currentPredictions);
    const entryOdds = parseFloat(odds[driver]);

    selectedUser.balance -= numericAmount;
    marketBets[driver] += numericAmount;

    bets.push({
      id: Date.now() + Math.random(),
      userId: selectedUser.id,
      driver: driver,
      amount: numericAmount,
      odds: entryOdds,
      status: "OPEN",
      payout: 0,
      profitLoss: 0
    });

    res.json({
      message: "Trade placed",
      userId: selectedUser.id,
      balance: Number(selectedUser.balance.toFixed(2)),
      marketBets: marketBets
    });
  }
);

// =====================================================
// SETTLE RACE
// =====================================================

app.post(
  "/settle",
  (req, res) => {
    const selectedUser = requireUser(req, res);

    if (!selectedUser) {
      return;
    }

    if (Object.keys(currentPredictions).length === 0) {
      return res.status(400).json({
        message: "Predictions have not loaded yet."
      });
    }

    const openBets = bets.filter(
      (bet) => bet.status === "OPEN"
    );

    if (openBets.length === 0) {
      return res.json({
        message: "There are no open trades to settle.",
        winner: lastRace ? lastRace.winner : null,
        winnings: 0,
        profit: 0,
        balance: Number(selectedUser.balance.toFixed(2)),
        race: lastRace
      });
    }

    // One race is shared by all users. All currently open bets
    // are settled against the same simulated race.
    const race = simulateRace();
    const winner = race.winner;

    bets.forEach((bet) => {
      if (bet.status !== "OPEN") {
        return;
      }

      const betUser = getUserById(bet.userId);

      if (!betUser) {
        return;
      }

      if (bet.driver === winner) {
        const payout = bet.amount * bet.odds;
        const profit = payout - bet.amount;

        bet.status = "WON";
        bet.payout = Number(payout.toFixed(2));
        bet.profitLoss = Number(profit.toFixed(2));
        betUser.balance += payout;
      } else {
        bet.status = "LOST";
        bet.payout = 0;
        bet.profitLoss = -bet.amount;
      }
    });

    users.forEach((item) => {
      item.profit = Number(
        calculateUserProfit(item.id).toFixed(2)
      );
    });

    const selectedUserBets = getUserBets(selectedUser.id);

    const totalWinnings = selectedUserBets
      .filter((bet) => bet.status === "WON")
      .reduce((total, bet) => total + bet.payout, 0);

    const totalProfit = selectedUserBets
      .filter((bet) => bet.status !== "OPEN")
      .reduce((total, bet) => total + bet.profitLoss, 0);

    for (const driver in marketBets) {
      marketBets[driver] = 0;
    }

    lastRace = race;

    res.json({
      winner: winner,
      winnings: Number(totalWinnings.toFixed(2)),
      profit: Number(totalProfit.toFixed(2)),
      balance: Number(selectedUser.balance.toFixed(2)),
      race: race
    });
  }
);

// =====================================================
// LAST RACE
// =====================================================

app.get(
  "/race",
  (req, res) => {
    if (!lastRace) {
      return res.json({
        message:
          "No race has been simulated yet."
      });
    }

    res.json(
      lastRace
    );
  }
);

// =====================================================
// PORTFOLIO
// =====================================================

app.get(
  "/portfolio",
  (req, res) => {
    const selectedUser = requireUser(req, res);

    if (!selectedUser) {
      return;
    }

    res.json(getUserBets(selectedUser.id));
  }
);

// =====================================================
// PORTFOLIO SUMMARY
// =====================================================

app.get(
  "/portfolio-summary",
  (req, res) => {
    const selectedUser = requireUser(req, res);

    if (!selectedUser) {
      return;
    }

    const userBets = getUserBets(selectedUser.id);

    let totalInvested = 0;
    let totalPayout = 0;
    let totalProfitLoss = 0;

    let wonTrades = 0;
    let lostTrades = 0;
    let openTrades = 0;

    userBets.forEach((bet) => {
      totalInvested += bet.amount;
      totalPayout += bet.payout;
      totalProfitLoss += bet.profitLoss;

      if (bet.status === "WON") wonTrades++;
      if (bet.status === "LOST") lostTrades++;
      if (bet.status === "OPEN") openTrades++;
    });

    const roi = totalInvested > 0
      ? (totalProfitLoss / totalInvested) * 100
      : 0;

    selectedUser.profit = Number(
      calculateUserProfit(selectedUser.id).toFixed(2)
    );

    res.json({
      totalInvested: Number(totalInvested.toFixed(2)),
      totalPayout: Number(totalPayout.toFixed(2)),
      totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      wonTrades: wonTrades,
      lostTrades: lostTrades,
      openTrades: openTrades,
      totalTrades: userBets.length
    });
  }
);

// =====================================================
// LEADERBOARD
// =====================================================

app.get(
  "/leaderboard",
  (req, res) => {
    const leaderboard = users
      .map((item) => ({
        ...item,
        profit: Number(
          calculateUserProfit(item.id).toFixed(2)
        )
      }))
      .sort((a, b) => b.profit - a.profit);

    res.json(leaderboard);
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  5000,
  () => {
    console.log(
      "Server running on http://localhost:5000"
    );
  }
);