import joblib
import pandas as pd
import json


# =====================================================
# LOAD MODEL
# =====================================================

model_data = joblib.load(
    "model.pkl"
)

model = model_data[
    "model"
]

features = model_data[
    "features"
]


# =====================================================
# LOAD HISTORICAL DATA
# =====================================================

df = pd.read_csv(
    "historical_f1.csv"
)


# =====================================================
# FIND LATEST SEASON
# =====================================================

latest_season = df[
    "season"
].max()


latest_data = df[
    df["season"] ==
    latest_season
].copy()


# =====================================================
# GET LATEST RECORD FOR EACH DRIVER
# =====================================================

latest_data = (

    latest_data

    .sort_values(
        [
            "driver_id",
            "round"
        ]
    )

    .groupby(
        "driver_id"
    )

    .tail(1)

)


# =====================================================
# CREATE PREDICTION DATA
# =====================================================

prediction_rows = []

driver_names = []


for _, row in (
    latest_data.iterrows()
):

    driver = row[
        "driver"
    ]

    driver_names.append(
        driver
    )

    prediction_rows.append({

        "grid":
            row["grid"],

        "previous_grid":
            row["previous_grid"],

        "average_grid":
            row["average_grid"],

        "previous_finish":
            row["previous_finish"],

        "average_finish":
            row["average_finish"],

        "previous_points":
            row["previous_points"],

        "recent_points":
            row["recent_points"],

        "driver_recent_podiums":
            row[
                "driver_recent_podiums"
            ],

        "driver_recent_wins":
            row[
                "driver_recent_wins"
            ],

        "driver_recent_dnfs":
            row[
                "driver_recent_dnfs"
            ],

        "constructor_previous_points":
            row[
                "constructor_previous_points"
            ],

        "constructor_recent_points":
            row[
                "constructor_recent_points"
            ],

        "constructor_average_finish":
            row[
                "constructor_average_finish"
            ]

    })


# =====================================================
# CREATE DATAFRAME
# =====================================================

X = pd.DataFrame(
    prediction_rows
)


# =====================================================
# MATCH MODEL FEATURE ORDER
# =====================================================

X = X[
    features
]


# =====================================================
# PREDICT
# =====================================================

probabilities = (
    model.predict_proba(
        X
    )
)


classes = model.classes_


# =====================================================
# FIND WIN CLASS
# =====================================================

if 1 in classes:

    win_index = list(
        classes
    ).index(1)

else:

    win_index = 0


# =====================================================
# CREATE RESULTS
# =====================================================

results = {}


for i, driver in enumerate(
    driver_names
):

    probability = float(
        probabilities[i][
            win_index
        ]
    )

    results[
        driver
    ] = probability


# =====================================================
# NORMALIZE
# =====================================================

total = sum(
    results.values()
)


if total > 0:

    for driver in results:

        results[
            driver
        ] = round(
            results[driver]
            / total,
            4
        )


# =====================================================
# SORT
# =====================================================

results = dict(
    sorted(
        results.items(),
        key=lambda item:
            item[1],
        reverse=True
    )
)


# =====================================================
# OUTPUT
# =====================================================

print(
    json.dumps(
        results
    )
)