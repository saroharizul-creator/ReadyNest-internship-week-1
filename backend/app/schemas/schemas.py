from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Any, Dict, List, Optional

# Auth/User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "user"

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Dataset schemas
class DatasetResponse(BaseModel):
    id: int
    filename: str
    row_count: Optional[int]
    col_count: Optional[int]
    status: str
    file_path: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DatabaseImportRequest(BaseModel):
    db_type: str  # "sqlite", "mysql", "postgresql"
    connection_string: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    query: str
    dataset_name: str


# Dashboard configuration schemas
class DashboardCreate(BaseModel):
    name: str
    layout_data: Dict[str, Any]

class DashboardResponse(BaseModel):
    id: int
    name: str
    layout_data: Dict[str, Any]
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics schemas
class AnalyticsResponse(BaseModel):
    id: int
    dataset_id: int
    summary_statistics: Optional[Dict[str, Any]]
    correlation_matrix: Optional[Dict[str, Any]]
    outliers_detected: Optional[Dict[str, Any]]
    category_analysis: Optional[Dict[str, Any]]
    trend_analysis: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# Audit log schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True
