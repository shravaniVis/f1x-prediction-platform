## 🌐 Live Demo

Try F1X here:

https://f1x-prediction-platform-1.onrender.com


# F1X — AI-Powered F1 Prediction & Trading Platform

F1X is an AI-powered Formula 1 prediction and simulated trading platform that combines machine learning, probabilistic modeling, and race simulation into an interactive dashboard.

## Overview

F1X uses historical Formula 1 data to estimate each driver's probability of winning a race. These predictions are transformed into simulated market odds and used by users to place virtual trades.

The platform then runs a probabilistic race simulation using factors such as driver pace, tyre strategy, degradation, weather, pit stops, incidents, and ML-derived performance strength.

## Features

- AI-powered F1 race win predictions
- Random Forest prediction model
- Driver probability and market analysis
- Simulated betting/trading market
- Expected Value (EV) calculations
- Probabilistic race simulation
- Tyre strategy and degradation
- Weather and race incidents
- User-specific virtual portfolios
- Multi-user trading
- Global leaderboard
- Portfolio performance tracking
- Interactive F1-inspired dashboard

## Machine Learning

The prediction model uses a chronological train/test split:

- Training seasons: 2021–2024
- Testing season: 2025
- Training records: 400
- Testing records: 100

### Model

- Random Forest
- 300 trees
- Maximum depth: 8
- Minimum samples per leaf: 3
- Balanced class weighting

### Features

- Grid position
- Previous grid
- Average grid
- Previous finish
- Average finish
- Previous points
- Recent points
- Driver recent podiums
- Driver recent wins
- Driver recent DNFs
- Constructor previous points
- Constructor recent points
- Constructor average finish

### Model Performance

| Metric | Score |
|---|---:|
| Accuracy | 94.00% |
| Precision | 42.86% |
| Recall | 60.00% |
| F1 Score | 50.00% |
| ROC-AUC | 0.956 |

Because race wins are highly imbalanced, precision, recall, F1, and ROC-AUC are considered alongside accuracy.

## Architecture

```text
React Frontend
      │
      ▼
Express Backend
      │
      ├── Prediction API
      ├── Trading API
      ├── Portfolio API
      ├── Race Simulation
      └── Leaderboard
              │
              ▼
        Python ML Service
              │
              ▼
       Random Forest Model
## Tech Stack

### Frontend
- React
- Axios
- Recharts
- CSS

### Backend
- Node.js
- Express

### Machine Learning
- Python
- Scikit-learn
- Pandas
- NumPy

Race Simulation

The race engine is probabilistic rather than a deterministic prediction.

ML probabilities influence driver performance, while the simulation introduces additional race factors such as:

Weather
Tyre compounds
Tyre degradation
Pit stops
Driver pace
Incidents
Random variation

This allows the same prediction model to produce different simulated race outcomes.

Project Structure

f1-platform/
├── frontend/
├── backend/
├── ml-service/
├── .gitignore
└── README.md

Disclaimer

F1X is an educational simulation project. It does not predict or reproduce actual Formula 1 race outcomes and does not involve real-money betting.

Author

Shravani
