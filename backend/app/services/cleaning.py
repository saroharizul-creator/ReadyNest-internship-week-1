import pandas as pd
import numpy as np
import os

def load_data(file_path: str) -> pd.DataFrame:
    """Helper to load csv or excel file."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.csv':
        return pd.read_csv(file_path)
    elif ext in ['.xls', '.xlsx']:
        return pd.read_excel(file_path)
    else:
        raise ValueError("Unsupported file format. Please upload CSV or Excel.")

def clean_dataset_file(file_path: str, output_path: str) -> dict:
    """
    Cleans dataset:
    - Removes duplicate rows
    - Detects and counts missing values, fills numeric with median, categoric with mode
    - Formats date columns if found
    - Outlier detection metrics
    """
    df = load_data(file_path)
    initial_rows = len(df)
    
    df.drop_duplicates(inplace=True)
    duplicates_removed = initial_rows - len(df)
    
    missing_before = df.isnull().sum().to_dict()
    missing_total = int(df.isnull().sum().sum())
    
    for col in df.columns:
        if df[col].isnull().any():
            if pd.api.types.is_numeric_dtype(df[col]):
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
            else:
                mode_val = df[col].mode()
                if not mode_val.empty:
                    df[col] = df[col].fillna(mode_val[0])
                else:
                    df[col] = df[col].fillna("Unknown")
                    
    date_columns_formatted = []
    for col in df.columns:
        if df[col].dtype == 'object':
            sample = df[col].dropna().head(100)
            if len(sample) > 0:
                try:
                    converted_sample = pd.to_datetime(sample, errors='coerce', utc=True)
                    if converted_sample.notnull().sum() / len(sample) > 0.7:
                        df[col] = pd.to_datetime(df[col], errors='coerce', utc=True)
                        date_columns_formatted.append(col)
                except Exception:
                    pass

    outliers_info = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]) and not pd.api.types.is_bool_dtype(df[col]):
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            outliers_count = int(((df[col] < lower_bound) | (df[col] > upper_bound)).sum())
            if outliers_count > 0:
                outliers_info[col] = {
                    "count": outliers_count,
                    "percentage": round((outliers_count / len(df)) * 100, 2)
                }

    ext = os.path.splitext(output_path)[1].lower()
    if ext == '.csv':
        df.to_csv(output_path, index=False)
    else:
        df.to_excel(output_path, index=False)

    return {
        "initial_rows": initial_rows,
        "final_rows": len(df),
        "duplicates_removed": duplicates_removed,
        "missing_values_handled": {
            "total": missing_total,
            "columns": {k: int(v) for k, v in missing_before.items() if v > 0}
        },
        "date_columns_formatted": date_columns_formatted,
        "outliers_detected": outliers_info
    }
