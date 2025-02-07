import warnings
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import glob
from collections import defaultdict

# Suppress warnings
warnings.filterwarnings("ignore", category=pd.errors.PerformanceWarning)

# Define target variables
targets = ['isHomeWinner', 'isUnder']

# Get all training files and new game files
training_files = glob.glob('/content/Files/*.json')
new_game_files = glob.glob('/content/NewGames/*.json')

# List to store final predictions (flat array)
final_predictions = []

# Dictionary to store selections grouped by training file
selections = defaultdict(list)

# Normalize numerical features (kept as per original code)
numerical_features = [
    'homeAvgDefAllowedPoints', 'homeAvgDefAllowedEfg_pct', 'homeAvgDefCreatedFt_rate',
    'homeAvgDefOff_rtg', 'homeAvgDefPace', 'homeAvgDefTov_pct',
    'homeAvgDefAllowedPointsQ1', 'homeAvgDefAllowedPointsQ2', 'homeAvgDefAllowedPointsQ3', 'homeAvgDefAllowedPointsQ4',
    'homeAvgOffensePoints', 'homeAvgOffenseAllowedEfg_pct', 'homeAvgOffenseCreatedFt_rate',
    'homeAvgOffenseOff_rtg', 'homeAvgOffensePace', 'homeAvgOffenseTov_pct',
    'homeAvgOffensePointsQ1', 'homeAvgOffensePointsQ2', 'homeAvgOffensePointsQ3', 'homeAvgOffensePointsQ4',
    'awayAvgDefAllowedPoints', 'awayAvgDefAllowedEfg_pct', 'awayAvgDefCreatedFt_rate',
    'awayAvgDefOff_rtg', 'awayAvgDefPace', 'awayAvgDefTov_pct',
    'awayAvgDefAllowedPointsQ1', 'awayAvgDefAllowedPointsQ2', 'awayAvgDefAllowedPointsQ3', 'awayAvgDefAllowedPointsQ4',
    'awayAvgOffensePoints', 'awayAvgOffenseAllowedEfg_pct', 'awayAvgOffenseCreatedFt_rate',
    'awayAvgOffenseOff_rtg', 'awayAvgOffensePace', 'awayAvgOffenseTov_pct',
    'awayAvgOffensePointsQ1', 'awayAvgOffensePointsQ2', 'awayAvgOffensePointsQ3', 'awayAvgOffensePointsQ4'
]

# Process each training file and build models
models_dict = {}  # Store models per training file
scalers_dict = {}  # Store scalers per training file

for file_path in training_files:
    filename = file_path.split("/")[-1]  # Extract filename

    with open(file_path, 'r') as f:
        data = json.load(f)

    df = pd.DataFrame(data)

    # Handle missing values for numeric columns
    numeric_cols = df.select_dtypes(include=['number']).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

    # Encode categorical variables
    df = pd.get_dummies(df, drop_first=True)

    # Normalize numerical features (if they exist in the DataFrame)
    existing_numerical_features = [col for col in numerical_features if col in df.columns]
    if existing_numerical_features:
        scaler = StandardScaler()
        df[existing_numerical_features] = scaler.fit_transform(df[existing_numerical_features])
        scalers_dict[filename] = scaler  # Store the scaler for later use
    else:
        print(f"Warning: No numerical features found in {filename}. Skipping scaling.")

    # Train models for each target
    models_rf = {}
    models_lr = {}

    for target in targets:
        if target not in df.columns:
            continue  # Skip if target column doesn't exist

        X = df.drop(targets, axis=1, errors='ignore')
        y = df[target]

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train RandomForest
        model_rf = RandomForestClassifier(n_estimators=100, random_state=42)
        model_rf.fit(X_train, y_train)

        # Train Logistic Regression
        model_lr = LogisticRegression(max_iter=1000, random_state=42)
        model_lr.fit(X_train, y_train)

        # Store models
        models_rf[target] = model_rf
        models_lr[target] = model_lr

        # Evaluate models
        accuracy_rf = accuracy_score(y_test, model_rf.predict(X_test))
        accuracy_lr = accuracy_score(y_test, model_lr.predict(X_test))
        print(f'[{filename}] Accuracy for {target}: RF={accuracy_rf:.4f}, LR={accuracy_lr:.4f}')

    models_dict[filename] = {'rf': models_rf, 'lr': models_lr, 'features': X.columns}

# Process each new game file against all trained models
for new_game_filename in new_game_files:
    new_game_name = new_game_filename.split("/")[-1]

    with open(new_game_filename, 'r') as f:
        new_data = json.load(f)

    new_df = pd.DataFrame(new_data)
    game_column = new_df['key'].copy()

    # Encode new data
    new_df = pd.get_dummies(new_df, drop_first=True)

    # Evaluate this file against all trained models
    for training_filename, model_data in models_dict.items():
        rf_models = model_data['rf']
        lr_models = model_data['lr']
        features = model_data['features']
        scaler = scalers_dict[training_filename]  # Get the corresponding scaler

        # Add missing columns
        missing_cols = set(features) - set(new_df.columns)
        for col in missing_cols:
            new_df[col] = 0

        # Reorder to match training features
        new_X = new_df[features]

        # Normalize numerical features
        new_X[numerical_features] = scaler.transform(new_X[numerical_features])

        # Store results for this file
        for i in range(len(new_X)):
            result = {
                "file": training_filename,
                "evaluated_file": new_game_name,
                "key": game_column.iloc[i],
                "predictions": {}
            }
            for target in targets:
                if target not in rf_models or target not in lr_models:
                    continue

                model_rf = rf_models[target]
                model_lr = lr_models[target]

                # Get prediction probabilities
                prob_rf = model_rf.predict_proba(new_X.iloc[[i]])[0]
                prob_lr = model_lr.predict_proba(new_X.iloc[[i]])[0]

                result["predictions"][target] = {
                    "RandomForest": {
                        "prediction": int(np.argmax(prob_rf)),
                        "probability": float(max(prob_rf))
                    },
                    "LogisticRegression": {
                        "prediction": int(np.argmax(prob_lr)),
                        "probability": float(max(prob_lr))
                    }
                }

                # If both models agree, store selection
                if np.argmax(prob_rf) == np.argmax(prob_lr):
                    avg_prob = (float(max(prob_rf)) + float(max(prob_lr))) / 2
                    std_dev = np.std([float(max(prob_rf)), float(max(prob_lr))])
                    selection = {
                        "file": training_filename,
                        "evaluated_file": new_game_name,
                        "key": game_column.iloc[i],
                        "target": target,
                        "prediction": int(np.argmax(prob_rf)),
                        "probability_rf": float(max(prob_rf)),
                        "probability_lr": float(max(prob_lr)),
                        "average_probability": avg_prob,
                        "standard_deviation": std_dev
                    }
                    selections[training_filename].append(selection)

            # Append result to final_predictions (FLAT ARRAY)
            final_predictions.append(result)

# Save final results as a flat array
with open('/content/final_predictions.json', 'w') as outfile:
    json.dump(final_predictions, outfile, indent=4)

# Save selections grouped by training file
with open('/content/selections.json', 'w') as outfile:
    json.dump(selections, outfile, indent=4)

print("Final predictions saved to /content/final_predictions.json")
print("Selections saved to /content/selections.json")
