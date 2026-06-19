from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import pandas as pd
from app.core.database import get_db
from app.models.models import AnalyticsResult, Dataset, User
from app.schemas.schemas import AnalyticsResponse
from app.api.deps import get_current_user

class FilterRequest(BaseModel):
    filter_column: str
    filter_value: str


router = APIRouter()

@router.get("/{dataset_id}", response_model=AnalyticsResponse)
def get_analytics(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve dataset and verify permissions
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset's analytics")

    # Get analytics result
    result = db.query(AnalyticsResult).filter(AnalyticsResult.dataset_id == dataset_id).first()
    if not result:
        raise HTTPException(
            status_code=404, 
            detail="Analytics results not found or processing is still in progress."
        )
        
    return result

@router.post("/{dataset_id}/filter", response_model=AnalyticsResponse)
def get_filtered_analytics(
    dataset_id: int,
    filter_req: FilterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset's analytics")
        
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        from app.services.cleaning import load_data
        from app.services.analytics import generate_analytics_report
        
        df = load_data(dataset.file_path)
        
        col = filter_req.filter_column
        val = filter_req.filter_value
        
        if col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                try:
                    if "." in val:
                        val = float(val)
                    else:
                        val = int(val)
                except ValueError:
                    pass
            elif pd.api.types.is_bool_dtype(df[col]):
                val = val.lower() == 'true'
                
            filtered_df = df[df[col] == val]
        else:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found in dataset schema")
            
        if len(filtered_df) == 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Filtering by {col}='{val}' resulted in 0 rows. Cannot calculate metrics."
            )
            
        report = generate_analytics_report(dataset.file_path, df=filtered_df)
        
        return AnalyticsResult(
            dataset_id=dataset_id,
            summary_statistics=report["summary_statistics"],
            correlation_matrix=report["correlation_matrix"],
            outliers_detected={},
            category_analysis=report["category_analysis"],
            trend_analysis=report["trend_analysis"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filtered analytics failed: {str(e)}")

