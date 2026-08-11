import requests
import pandas as pd
import numpy as np
import joblib
import json

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)


# =====================================================
# SETTINGS
# =====================================================

SEASONS = [
    2021,
    2022,
    2023,
    2024,
    2025
]

TRAIN_SEASONS = [
    2021,
    2022,
    2023,
    2024
]

TEST_SEASONS = [
    2025
]

API_URL = "https://api.jolpi.ca/ergast/f1"


# =====================================================
# FETCH HISTORICAL DATA
# =====================================================

def fetch_season(season):

    url = (
        f"{API_URL}/"
        f"{season}/results.json?limit=1000"
    )

    print(
        f"Fetching {season}..."
    )

    response = requests.get(
        url,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    races = (
        data["MRData"]
        ["RaceTable"]
        ["Races"]
    )

    rows = []

    for race in races:

        race_name = race["raceName"]

        round_number = int(
            race["round"]
        )

        results = race["Results"]

        for result in results:

            driver = result["Driver"]

            constructor = result[
                "Constructor"
            ]

            position_text = result.get(
                "position",
                "0"
            )

            try:

                position = int(
                    position_text
                )

            except ValueError:

                position = 0

            grid = int(
                result.get(
                    "grid",
                    0
                )
            )

            points = float(
                result.get(
                    "points",
                    0
                )
            )

            rows.append({

                "season":
                    season,

                "round":
                    round_number,

                "race":
                    race_name,

                "driver_id":
                    driver["driverId"],

                "driver":
                    driver.get(
                        "code",
                        driver["driverId"]
                    ),

                "constructor":
                    constructor[
                        "constructorId"
                    ],

                "grid":
                    grid,

                "points":
                    points,

                "finish_position":
                    position,

                "won":
                    1
                    if position == 1
                    else 0

            })

    return rows


# =====================================================
# DOWNLOAD DATA
# =====================================================

all_rows = []

for season in SEASONS:

    try:

        rows = fetch_season(
            season
        )

        all_rows.extend(
            rows
        )

    except Exception as error:

        print(
            f"Could not fetch {season}:",
            error
        )


df = pd.DataFrame(
    all_rows
)

if df.empty:

    raise RuntimeError(
        "No historical data was downloaded."
    )


print()

print(
    f"Downloaded "
    f"{len(df)} race-driver records."
)


# =====================================================
# SORT DATA
# =====================================================

df = df.sort_values(
    [
        "driver_id",
        "season",
        "round"
    ]
).reset_index(
    drop=True
)


# =====================================================
# BASIC DRIVER FEATURES
# =====================================================

df["previous_points"] = (

    df.groupby("driver_id")
    ["points"]
    .shift(1)
    .fillna(0)

)


df["previous_grid"] = (

    df.groupby("driver_id")
    ["grid"]
    .shift(1)
    .fillna(10)

)


df["previous_finish"] = (

    df.groupby("driver_id")
    ["finish_position"]
    .shift(1)
    .fillna(10)

)


df["average_finish"] = (

    df.groupby("driver_id")
    ["finish_position"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .mean()
    )
    .fillna(10)

)


df["average_grid"] = (

    df.groupby("driver_id")
    ["grid"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .mean()
    )
    .fillna(10)

)


df["recent_points"] = (

    df.groupby("driver_id")
    ["points"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .sum()
    )
    .fillna(0)

)


# =====================================================
# DRIVER FORM FEATURES
# =====================================================

# Podium = finishing 1st, 2nd or 3rd

df["podium"] = (
    (
        df["finish_position"] >= 1
    )
    &
    (
        df["finish_position"] <= 3
    )
).astype(int)


df["driver_recent_podiums"] = (

    df.groupby("driver_id")
    ["podium"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .sum()
    )
    .fillna(0)

)


# Recent wins

df["driver_recent_wins"] = (

    df.groupby("driver_id")
    ["won"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .sum()
    )
    .fillna(0)

)


# Recent DNFs / non-classified results

df["dnf"] = (
    df["finish_position"] == 0
).astype(int)


df["driver_recent_dnfs"] = (

    df.groupby("driver_id")
    ["dnf"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .sum()
    )
    .fillna(0)

)


# =====================================================
# CONSTRUCTOR FEATURES
# =====================================================

# Previous constructor points

df["constructor_previous_points"] = (

    df.groupby("constructor")
    ["points"]
    .shift(1)
    .fillna(0)

)


# Constructor's recent points

df["constructor_recent_points"] = (

    df.groupby("constructor")
    ["points"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .sum()
    )
    .fillna(0)

)


# Constructor recent average finish

df["constructor_average_finish"] = (

    df.groupby("constructor")
    ["finish_position"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            5,
            min_periods=1
        )
        .mean()
    )
    .fillna(10)

)


# =====================================================
# FEATURES
# =====================================================

features = [

    # Qualifying / grid
    "grid",
    "previous_grid",
    "average_grid",

    # Driver race performance
    "previous_finish",
    "average_finish",

    # Driver points / form
    "previous_points",
    "recent_points",

    # Driver form
    "driver_recent_podiums",
    "driver_recent_wins",
    "driver_recent_dnfs",

    # Constructor performance
    "constructor_previous_points",
    "constructor_recent_points",
    "constructor_average_finish"

]


# =====================================================
# TRAIN / TEST SPLIT
# =====================================================

train_df = df[
    df["season"].isin(
        TRAIN_SEASONS
    )
].copy()


test_df = df[
    df["season"].isin(
        TEST_SEASONS
    )
].copy()


X_train = train_df[
    features
]

y_train = train_df[
    "won"
]


X_test = test_df[
    features
]

y_test = test_df[
    "won"
]


# =====================================================
# DATASET SUMMARY
# =====================================================

print()

print(
    "===================================="
)

print(
    "CHRONOLOGICAL DATASET"
)

print(
    "===================================="
)

print(
    f"Training seasons: "
    f"{TRAIN_SEASONS}"
)

print(
    f"Testing seasons:  "
    f"{TEST_SEASONS}"
)

print()

print(
    f"Training records: "
    f"{len(train_df)}"
)

print(
    f"Testing records:  "
    f"{len(test_df)}"
)

print()

print(
    f"Training wins: "
    f"{int(y_train.sum())}"
)

print(
    f"Testing wins: "
    f"{int(y_test.sum())}"
)

print()

print(
    "Features:"
)

for feature in features:

    print(
        f"- {feature}"
    )


# =====================================================
# TRAIN RANDOM FOREST
# =====================================================

model = RandomForestClassifier(

    n_estimators=300,

    max_depth=8,

    min_samples_leaf=3,

    random_state=42,

    class_weight="balanced"

)


print()

print(
    "===================================="
)

print(
    "TRAINING MODEL"
)

print(
    "===================================="
)

print(
    "Random Forest:"
)

print(
    "Trees: 300"
)

print(
    "Max depth: 8"
)

print(
    "Min samples per leaf: 3"
)

print(
    "Class weighting: balanced"
)

print()

print(
    "Training..."
)


model.fit(
    X_train,
    y_train
)


print(
    "Training complete."
)


# =====================================================
# PREDICTIONS
# =====================================================

predictions = model.predict(
    X_test
)


probabilities = (
    model.predict_proba(
        X_test
    )[:, 1]
)


# =====================================================
# METRICS
# =====================================================

accuracy = accuracy_score(
    y_test,
    predictions
)


precision = precision_score(
    y_test,
    predictions,
    zero_division=0
)


recall = recall_score(
    y_test,
    predictions,
    zero_division=0
)


f1 = f1_score(
    y_test,
    predictions,
    zero_division=0
)


try:

    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )

except ValueError:

    roc_auc = 0.0


cm = confusion_matrix(
    y_test,
    predictions
)


# =====================================================
# MODEL PERFORMANCE
# =====================================================

print()

print(
    "===================================="
)

print(
    "MODEL PERFORMANCE"
)

print(
    "===================================="
)

print(
    f"Accuracy : "
    f"{accuracy * 100:.2f}%"
)

print(
    f"Precision: "
    f"{precision * 100:.2f}%"
)

print(
    f"Recall   : "
    f"{recall * 100:.2f}%"
)

print(
    f"F1 Score : "
    f"{f1 * 100:.2f}%"
)

print(
    f"ROC-AUC  : "
    f"{roc_auc:.3f}"
)


# =====================================================
# CONFUSION MATRIX
# =====================================================

print()

print(
    "===================================="
)

print(
    "CONFUSION MATRIX"
)

print(
    "===================================="
)

print(
    cm
)


# =====================================================
# CLASSIFICATION REPORT
# =====================================================

print()

print(
    "===================================="
)

print(
    "CLASSIFICATION REPORT"
)

print(
    "===================================="
)

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# =====================================================
# FEATURE IMPORTANCE
# =====================================================

feature_importance = {}

for feature, importance in zip(
    features,
    model.feature_importances_
):

    feature_importance[
        feature
    ] = float(
        importance
    )


feature_importance = dict(
    sorted(
        feature_importance.items(),
        key=lambda item:
            item[1],
        reverse=True
    )
)


print()

print(
    "===================================="
)

print(
    "FEATURE IMPORTANCE"
)

print(
    "===================================="
)

for feature, importance in (
    feature_importance.items()
):

    print(
        f"{feature:<30}"
        f"{importance:.4f}"
    )


# =====================================================
# SAVE MODEL
# =====================================================

model_data = {

    "model":
        model,

    "features":
        features

}


joblib.dump(
    model_data,
    "model.pkl"
)


# =====================================================
# SAVE METRICS
# =====================================================

metrics = {

    "evaluation_type":
        "chronological",

    "train_seasons":
        TRAIN_SEASONS,

    "test_seasons":
        TEST_SEASONS,

    "accuracy":
        round(
            float(accuracy),
            4
        ),

    "precision":
        round(
            float(precision),
            4
        ),

    "recall":
        round(
            float(recall),
            4
        ),

    "f1_score":
        round(
            float(f1),
            4
        ),

    "roc_auc":
        round(
            float(roc_auc),
            4
        ),

    "training_samples":
        int(
            len(X_train)
        ),

    "testing_samples":
        int(
            len(X_test)
        ),

    "total_records":
        int(
            len(df)
        ),

    "training_wins":
        int(
            y_train.sum()
        ),

    "testing_wins":
        int(
            y_test.sum()
        ),

    "features":
        features,

    "feature_importance":
        feature_importance,

    "confusion_matrix":
        cm.tolist()

}


with open(
    "metrics.json",
    "w"
) as file:

    json.dump(
        metrics,
        file,
        indent=4
    )


# =====================================================
# SAVE DATASET
# =====================================================

df.to_csv(
    "historical_f1.csv",
    index=False
)


# =====================================================
# FINAL OUTPUT
# =====================================================

print()

print(
    "===================================="
)

print(
    "FILES CREATED"
)

print(
    "===================================="
)

print(
    "✓ model.pkl"
)

print(
    "✓ historical_f1.csv"
)

print(
    "✓ metrics.json"
)

print()

print(
    "Enhanced training complete 🏎️🤖"
)