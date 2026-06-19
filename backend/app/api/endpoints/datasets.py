from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import os
import shutil
import uuid
import pandas as pd
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Dataset, User, AuditLog, AnalyticsResult
from app.schemas.schemas import DatasetResponse, DatabaseImportRequest
from app.api.deps import get_current_user
from app.services.cleaning import clean_dataset_file, load_data
from app.services.analytics import generate_analytics_report


router = APIRouter()

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file size via headers
    if request:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File size exceeds the 100MB upload limit. Please upload a smaller file."
                    )
            except ValueError:
                pass

    file_content_length = file.headers.get("content-length")
    if file_content_length:
        try:
            if int(file_content_length) > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="File size exceeds the 100MB upload limit. Please upload a smaller file."
                )
        except ValueError:
            pass

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".csv", ".xls", ".xlsx"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only CSV and Excel (.xls, .xlsx) files are supported."
        )

    # Generate unique filename to prevent overwrites
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save the file locally
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save file: {str(e)}"
        )

    # Validate actual file size on disk
    if os.path.exists(file_path):
        actual_size = os.path.getsize(file_path)
        if actual_size > MAX_UPLOAD_SIZE:
            try:
                os.remove(file_path)
            except Exception:
                pass
            raise HTTPException(
                status_code=413,
                detail="File size exceeds the 100MB upload limit. Please upload a smaller file."
            )

    # Get row and column counts
    try:
        df = load_data(file_path)
        row_count = len(df)
        col_count = len(df.columns)
    except Exception as e:
        # Clean up file on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse the file contents: {str(e)}"
        )

    # Save record in Database
    dataset = Dataset(
        filename=file.filename,
        file_path=file_path,
        row_count=row_count,
        col_count=col_count,
        status="uploaded",
        user_id=current_user.id
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Log action
    log = AuditLog(user_id=current_user.id, action=f"UPLOAD_DATASET: {dataset.id}")
    db.add(log)
    db.commit()

    # Automatically trigger cleaning and analytics
    try:
        # Set paths for cleaned file
        cleaned_filename = f"cleaned_{unique_filename}"
        cleaned_path = os.path.join(UPLOAD_DIR, cleaned_filename)
        
        # Clean data
        cleaning_details = clean_dataset_file(file_path, cleaned_path)
        
        # Update dataset status and path
        dataset.file_path = cleaned_path
        dataset.status = "cleaned"
        dataset.row_count = cleaning_details["final_rows"]
        db.commit()

        # Run analytics on the cleaned dataset
        analysis_report = generate_analytics_report(cleaned_path)
        
        # Save analysis results
        analytics_result = AnalyticsResult(
            dataset_id=dataset.id,
            summary_statistics=analysis_report["summary_statistics"],
            correlation_matrix=analysis_report["correlation_matrix"],
            outliers_detected=cleaning_details["outliers_detected"],
            category_analysis=analysis_report["category_analysis"],
            trend_analysis=analysis_report["trend_analysis"]
        )
        db.add(analytics_result)
        db.commit()

        # Log completion
        log_clean = AuditLog(user_id=current_user.id, action=f"CLEANED_AND_ANALYZED: {dataset.id}")
        db.add(log_clean)
        db.commit()
        
    except Exception as e:
        dataset.status = "error"
        db.commit()
        # Log failure
        log_err = AuditLog(user_id=current_user.id, action=f"PROCESSING_FAILED: {dataset.id}")
        db.add(log_err)
        db.commit()

    return dataset

@router.post("/import-db", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def import_database_dataset(
    import_req: DatabaseImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_type = import_req.db_type.lower()
    
    if db_type == "sqlite":
        conn_str = import_req.connection_string
        if not conn_str:
            raise HTTPException(
                status_code=400,
                detail="Connection string or file path is required for SQLite."
            )
        if not conn_str.startswith("sqlite:///"):
            conn_url = f"sqlite:///{conn_str}"
        else:
            conn_url = conn_str
            
    elif db_type == "mysql":
        if import_req.connection_string:
            conn_url = import_req.connection_string
        else:
            if not all([import_req.host, import_req.database, import_req.username]):
                raise HTTPException(
                    status_code=400,
                    detail="Host, username, and database name are required for MySQL connection."
                )
            port = import_req.port or 3306
            pwd = f":{import_req.password}" if import_req.password else ""
            conn_url = f"mysql+pymysql://{import_req.username}{pwd}@{import_req.host}:{port}/{import_req.database}"
            
    elif db_type == "postgresql":
        if import_req.connection_string:
            conn_url = import_req.connection_string
        else:
            if not all([import_req.host, import_req.database, import_req.username]):
                raise HTTPException(
                    status_code=400,
                    detail="Host, username, and database name are required for PostgreSQL connection."
                )
            port = import_req.port or 5432
            pwd = f":{import_req.password}" if import_req.password else ""
            conn_url = f"postgresql+psycopg2://{import_req.username}{pwd}@{import_req.host}:{port}/{import_req.database}"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported database type: {import_req.db_type}. Supported types: sqlite, mysql, postgresql"
        )
        
    unique_filename = f"imported_{uuid.uuid4()}.csv"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        engine = create_engine(conn_url)
        df = pd.read_sql_query(import_req.query, engine)
        row_count = len(df)
        col_count = len(df.columns)
        
        if row_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Query returned 0 rows. Cannot import an empty dataset."
            )
            
        df.to_csv(file_path, index=False)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Database connection or query execution failed: {str(e)}"
        )
        
    filename = f"{import_req.dataset_name}.csv" if not import_req.dataset_name.endswith('.csv') else import_req.dataset_name
    dataset = Dataset(
        filename=filename,
        file_path=file_path,
        row_count=row_count,
        col_count=col_count,
        status="uploaded",
        user_id=current_user.id
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    log = AuditLog(user_id=current_user.id, action=f"IMPORT_DATABASE_DATASET: {dataset.id}")
    db.add(log)
    db.commit()

    try:
        cleaned_filename = f"cleaned_{unique_filename}"
        cleaned_path = os.path.join(UPLOAD_DIR, cleaned_filename)
        
        cleaning_details = clean_dataset_file(file_path, cleaned_path)
        
        dataset.file_path = cleaned_path
        dataset.status = "cleaned"
        dataset.row_count = cleaning_details["final_rows"]
        db.commit()

        analysis_report = generate_analytics_report(cleaned_path)
        
        analytics_result = AnalyticsResult(
            dataset_id=dataset.id,
            summary_statistics=analysis_report["summary_statistics"],
            correlation_matrix=analysis_report["correlation_matrix"],
            outliers_detected=cleaning_details["outliers_detected"],
            category_analysis=analysis_report["category_analysis"],
            trend_analysis=analysis_report["trend_analysis"]
        )
        db.add(analytics_result)
        db.commit()

        log_clean = AuditLog(user_id=current_user.id, action=f"CLEANED_AND_ANALYZED: {dataset.id}")
        db.add(log_clean)
        db.commit()
    except Exception as e:
        dataset.status = "error"
        db.commit()
        log_err = AuditLog(user_id=current_user.id, action=f"PROCESSING_FAILED: {dataset.id}")
        db.add(log_err)
        db.commit()

    return dataset

@router.get("/", response_model=List[DatasetResponse])

def get_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Return user's datasets or all datasets if admin/manager
    if current_user.role in ["admin", "manager"]:
        return db.query(Dataset).all()
    return db.query(Dataset).filter(Dataset.user_id == current_user.id).all()

@router.delete("/{dataset_id}", status_code=status.HTTP_200_OK)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Check permissions
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dataset")

    # Delete local file
    if os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
            # If there's an original uncleaned file, delete it too
            # Cleaned files start with "cleaned_"
            filename = os.path.basename(dataset.file_path)
            if filename.startswith("cleaned_"):
                original_filename = filename.replace("cleaned_", "")
                original_path = os.path.join(UPLOAD_DIR, original_filename)
                if os.path.exists(original_path):
                    os.remove(original_path)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()

    # Log action
    log = AuditLog(user_id=current_user.id, action=f"DELETE_DATASET: {dataset_id}")
    db.add(log)
    db.commit()

    return {"detail": "Dataset deleted successfully"}

@router.get("/{dataset_id}/schema")
def get_dataset_schema(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        ext = os.path.splitext(dataset.file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(dataset.file_path, nrows=5)
        else:
            df = pd.read_excel(dataset.file_path, nrows=5)
            
        schema = []
        for col in df.columns:
            dtype_str = "numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
            schema.append({"name": col, "type": dtype_str})
        return schema
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/column/{column_name}")
def get_column_data(
    dataset_id: int,
    column_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        ext = os.path.splitext(dataset.file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(dataset.file_path, usecols=[column_name], nrows=1000)
        else:
            df = pd.read_excel(dataset.file_path, usecols=[column_name], nrows=1000)
            
        values = df[column_name].dropna().tolist()
        return {"column": column_name, "values": values}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/scatter/{x_column}/{y_column}")
def get_scatter_data(
    dataset_id: int,
    x_column: str,
    y_column: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        ext = os.path.splitext(dataset.file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(dataset.file_path, usecols=[x_column, y_column], nrows=2000)
        else:
            df = pd.read_excel(dataset.file_path, usecols=[x_column, y_column], nrows=2000)
            
        df_clean = df[[x_column, y_column]].dropna()
        
        points = []
        for _, row in df_clean.iterrows():
            try:
                points.append({
                    "x": float(row[x_column]),
                    "y": float(row[y_column])
                })
            except (ValueError, TypeError):
                points.append({
                    "x": str(row[x_column]),
                    "y": str(row[y_column])
                })
            
        return {"x_column": x_column, "y_column": y_column, "points": points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


