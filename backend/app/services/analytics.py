import pandas as pd
import numpy as np
import os
from typing import Optional, List
from app.services.cleaning import load_data


def clean_value(val):
    """Helper to convert numpy types to native Python types and handle NaN."""
    if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer, np.int64)):
        return int(val)
    if isinstance(val, (np.floating, np.float64)):
        return float(val)
    if isinstance(val, np.bool_):
        return bool(val)
    return val

def generate_analytics_report(file_path: str, df: Optional[pd.DataFrame] = None) -> dict:
    """
    Computes statistical analysis for a cleaned dataset:
    - Summary statistics (descriptive stats)
    - Correlation matrix
    - Category-based analysis
    - Trend analysis (if dates are present)
    """
    if df is None:
        df = load_data(file_path)
    
   
    summary_stats = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    for col in numeric_cols:
        desc = df[col].describe()
        
       
        col_data = df[col].dropna()
        hist_data = None
        if len(col_data) > 0:
            try:
                counts, bin_edges = np.histogram(col_data, bins=10)
                bin_labels = []
                for i in range(len(bin_edges) - 1):
                    label = f"{clean_value(bin_edges[i]):.1f} - {clean_value(bin_edges[i+1]):.1f}"
                    bin_labels.append(label)
                hist_data = {
                    "counts": [int(c) for c in counts],
                    "bins": bin_labels
                }
            except Exception:
                pass
                
        summary_stats[col] = {
            "mean": clean_value(desc.get("mean")),
            "median": clean_value(df[col].median()),
            "std": clean_value(desc.get("std")),
            "min": clean_value(desc.get("min")),
            "max": clean_value(desc.get("max")),
            "q1": clean_value(desc.get("25%")),
            "q3": clean_value(desc.get("75%")),
            "count": int(desc.get("count", 0)),
            "histogram": hist_data
        }


    
    correlation = {}
    if len(numeric_cols) > 1:
        corr_df = df[numeric_cols].corr()
        for col in corr_df.columns:
            correlation[col] = {k: clean_value(v) for k, v in corr_df[col].to_dict().items()}

    category_analysis = {}
    categorical_cols = []
    for col in df.columns:
        if df[col].dtype == 'object' or df[col].dtype == 'category':
            categorical_cols.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]) and df[col].nunique() < 10:
            categorical_cols.append(col)

    for col in categorical_cols[:3]:
        value_counts = df[col].value_counts().head(10)
        categories_list = []
        
        top_cats = value_counts.index.tolist()
        group_means = {}
        if numeric_cols:
            filtered_df = df[df[col].isin(top_cats)]
            grouped_means_df = filtered_df.groupby(col)[numeric_cols].mean()
            for cat in top_cats:
                if cat in grouped_means_df.index:
                    group_means[cat] = grouped_means_df.loc[cat].to_dict()
                else:
                    group_means[cat] = {}
        
        for cat, count in value_counts.items():
            cat_str = str(cat)
            cat_data = {"category": cat_str, "count": int(count)}
            if numeric_cols:
                cat_data["aggregates"] = {k: clean_value(v) for k, v in group_means.get(cat, {}).items()}
            categories_list.append(cat_data)
        category_analysis[col] = categories_list

    trend_analysis = {}
    date_cols = df.select_dtypes(include=['datetime', 'datetimetz']).columns.tolist()
    
    if not date_cols:
        for col in df.columns:
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce', utc=True)
                    if df[col].notnull().sum() > 0:
                        date_cols.append(col)
                        break
                except Exception:
                    pass

    if date_cols:
        date_col = date_cols[0]
        df_sorted = df.sort_values(by=date_col)
        min_date = df_sorted[date_col].min()
        max_date = df_sorted[date_col].max()
        
        if pd.notna(min_date) and pd.notna(max_date) and (max_date - min_date).days > 365:
            group_freq = 'M'
        else:
            group_freq = 'D'
            
        try:
            temp_date = df_sorted[date_col]
            if temp_date.dt.tz is not None:
                temp_date = temp_date.dt.tz_localize(None)
            df_sorted['period'] = temp_date.dt.to_period(group_freq).astype(str)
            
            grouped = df_sorted.groupby('period')
            periods_list = list(grouped.groups.keys())[:30] 
            
            filtered_df = df_sorted[df_sorted['period'].isin(periods_list)]
            period_counts = filtered_df['period'].value_counts()
            
            period_means = {}
            if numeric_cols:
                period_means_df = filtered_df.groupby('period')[numeric_cols].mean()
                for p in periods_list:
                    if p in period_means_df.index:
                        period_means[p] = period_means_df.loc[p].to_dict()
            
            trend_data = []
            for period in periods_list:
                period_data = {
                    "period": period,
                    "count": int(period_counts.get(period, 0))
                }
                if numeric_cols:
                    period_data["aggregates"] = {k: clean_value(v) for k, v in period_means.get(period, {}).items()}
                trend_data.append(period_data)
            
            trend_analysis = {
                "date_column": date_col,
                "frequency": "Monthly" if group_freq == 'M' else "Daily",
                "data": trend_data
            }
        except Exception:
            pass

    return {
        "summary_statistics": summary_stats,
        "correlation_matrix": correlation,
        "category_analysis": category_analysis,
        "trend_analysis": trend_analysis
    }

def generate_dataset_insights(analytics_result: dict, outliers_detected: Optional[dict] = None) -> list:
    """
    Generates 3 to 5 key insights from the computed analytics metrics.
    """
    insights = []
    
    correlations = analytics_result.get("correlation_matrix", {}) or {}
    strong_corrs = []
    seen = set()
    for col1, targets in correlations.items():
        if targets:
            for col2, val in targets.items():
                if col1 != col2 and val is not None and (col1, col2) not in seen and (col2, col1) not in seen:
                    seen.add((col1, col2))
                    if abs(val) >= 0.7:
                        strong_corrs.append((col1, col2, val))
                    
    strong_corrs.sort(key=lambda x: abs(x[2]), reverse=True)
    for col1, col2, val in strong_corrs[:2]:
        relation = "positive" if val > 0 else "negative"
        insights.append({
            "title": f"Strong Correlation: {col1} & {col2}",
            "description": f"Column '{col1}' and '{col2}' show a strong {relation} correlation ({val:.2f}). Changes in one likely correspond to changes in the other.",
            "type": "success" if val > 0 else "info"
        })
        
    outliers = outliers_detected or analytics_result.get("outliers_detected") or {}
    high_outliers = []
    for col, details in outliers.items():
        if isinstance(details, dict):
            pct = details.get("percentage", 0)
            if pct >= 5.0:
                high_outliers.append((col, details.get("count", 0), pct))
            
    high_outliers.sort(key=lambda x: x[2], reverse=True)
    for col, count, pct in high_outliers[:2]:
        insights.append({
            "title": f"Anomaly Alert: High Outliers in {col}",
            "description": f"Column '{col}' has {count} outliers, representing {pct:.1f}% of the dataset. Consider cleaning or inspecting these values for errors.",
            "type": "warning"
        })
        
    category_analysis = analytics_result.get("category_analysis", {}) or {}
    dominant_cats = []
    for col, categories in category_analysis.items():
        if isinstance(categories, list) and len(categories) > 0:
            total_count = sum(item.get("count", 0) for item in categories)
            if total_count > 0:
                first_cat = categories[0]
                pct = (first_cat.get("count", 0) / total_count) * 100
                if pct >= 50.0:
                    dominant_cats.append((col, first_cat.get("category"), pct))
                    
    for col, cat_name, pct in dominant_cats[:1]:
        insights.append({
            "title": f"Dominant Category in {col}",
            "description": f"The category '{cat_name}' dominates column '{col}', accounting for {pct:.1f}% of all records.",
            "type": "info"
        })
        
    if len(insights) < 3:
        summary_stats = analytics_result.get("summary_statistics", {}) or {}
        num_numeric = len(summary_stats)
        insights.append({
            "title": "Dataset Shape Summary",
            "description": f"Your dataset consists of {num_numeric} numerical features ready for comparative modeling and segmentation analysis.",
            "type": "info"
        })
        
    return insights

