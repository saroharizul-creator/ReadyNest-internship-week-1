from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
import os
import io
import pandas as pd

from app.core.database import get_db
from app.models.models import Dataset, User, AuditLog, AnalyticsResult
from app.api.deps import get_current_user
from app.services.cleaning import load_data
from app.services.analytics import generate_dataset_insights

router = APIRouter()

@router.get("/summary/{dataset_id}")
def get_dataset_summary_report(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    analytics = db.query(AnalyticsResult).filter(AnalyticsResult.dataset_id == dataset_id).first()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics data not found")

    # Log action
    log = AuditLog(user_id=current_user.id, action=f"VIEW_REPORT: {dataset_id}")
    db.add(log)
    db.commit()

    # Create analytical dict representation for insights generator
    analytics_dict = {
        "summary_statistics": analytics.summary_statistics,
        "correlation_matrix": analytics.correlation_matrix,
        "outliers_detected": analytics.outliers_detected,
        "category_analysis": analytics.category_analysis,
        "trend_analysis": analytics.trend_analysis
    }
    insights = generate_dataset_insights(analytics_dict)

    return {
        "dataset_name": dataset.filename,
        "rows": dataset.row_count,
        "columns": dataset.col_count,
        "uploaded_at": dataset.uploaded_at,
        "summary_statistics": analytics.summary_statistics,
        "outliers_detected": analytics.outliers_detected,
        "category_analysis": analytics.category_analysis,
        "trend_analysis": analytics.trend_analysis,
        "insights": insights
    }


@router.get("/export/{dataset_id}")
def export_dataset(
    dataset_id: int,
    format: str = "csv", # e.g. "csv", "excel"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Cleaned data file not found on server")

    # Log export action
    log = AuditLog(user_id=current_user.id, action=f"EXPORT_DATASET: {dataset_id} in {format} format")
    db.add(log)
    db.commit()

    df = load_data(dataset.file_path)

    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename=cleaned_{dataset.filename}"
        return response
        
    elif format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Cleaned Data')
        output.seek(0)
        
        response = StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        # Force download by setting headers
        base_name = os.path.splitext(dataset.filename)[0]
        response.headers["Content-Disposition"] = f"attachment; filename=cleaned_{base_name}.xlsx"
        return response

    else:
        raise HTTPException(status_code=400, detail="Invalid export format. Supported formats are: csv, excel.")
