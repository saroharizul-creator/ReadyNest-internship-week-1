from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import DashboardConfiguration, User, AuditLog
from app.schemas.schemas import DashboardCreate, DashboardResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
def create_dashboard(
    dashboard_in: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dashboard = DashboardConfiguration(
        name=dashboard_in.name,
        layout_data=dashboard_in.layout_data,
        user_id=current_user.id
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)

    # Log action
    log = AuditLog(user_id=current_user.id, action=f"CREATE_DASHBOARD: {dashboard.id}")
    db.add(log)
    db.commit()

    return dashboard

@router.get("/", response_model=List[DashboardResponse])
def get_dashboards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["admin", "manager"]:
        return db.query(DashboardConfiguration).all()
    return db.query(DashboardConfiguration).filter(DashboardConfiguration.user_id == current_user.id).all()

@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dashboard = db.query(DashboardConfiguration).filter(DashboardConfiguration.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if dashboard.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")
        
    return dashboard

@router.delete("/{dashboard_id}", status_code=status.HTTP_200_OK)
def delete_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dashboard = db.query(DashboardConfiguration).filter(DashboardConfiguration.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if dashboard.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dashboard")

    db.delete(dashboard)
    db.commit()

    # Log action
    log = AuditLog(user_id=current_user.id, action=f"DELETE_DASHBOARD: {dashboard_id}")
    db.add(log)
    db.commit()

    return {"detail": "Dashboard deleted successfully"}
