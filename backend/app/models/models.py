from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False) # e.g. "admin", "manager", "user"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    dashboards = relationship("DashboardConfiguration", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, nullable=True)
    col_count = Column(Integer, nullable=True)
    status = Column(String(50), default="uploaded", nullable=False) # e.g. "uploaded", "validated", "cleaned", "error"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="datasets")
    analytics_results = relationship("AnalyticsResult", back_populates="dataset", cascade="all, delete-orphan")


class DashboardConfiguration(Base):
    __tablename__ = "dashboard_configurations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    layout_data = Column(JSON, nullable=False) # Stored JSON layout details
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="dashboards")


class AnalyticsResult(Base):
    __tablename__ = "analytics_results"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    summary_statistics = Column(JSON, nullable=True)  # Columns mean, median, etc.
    correlation_matrix = Column(JSON, nullable=True)  # Correlation coefficients
    outliers_detected = Column(JSON, nullable=True)   # Info about outliers
    category_analysis = Column(JSON, nullable=True)   # Category aggregates
    trend_analysis = Column(JSON, nullable=True)      # Time-series trend analysis
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    dataset = relationship("Dataset", back_populates="analytics_results")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(255), nullable=False) # e.g. "UPLOAD_DATASET", "DELETE_DATASET", "CLEAN_DATASET", "LOGIN"
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
