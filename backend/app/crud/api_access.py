"""CRUD operations for API access configurations."""
import uuid

from sqlmodel import Session, select

from app.models import ApiAccessConfig, ApiAccessConfigCreate, ApiAccessConfigUpdate


def create_api_access_config(*, session: Session, create: ApiAccessConfigCreate) -> ApiAccessConfig:
    db_obj = ApiAccessConfig.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_api_access_config(*, session: Session, id: uuid.UUID) -> ApiAccessConfig | None:
    return session.get(ApiAccessConfig, id)


def list_api_access_configs(*, session: Session) -> list[ApiAccessConfig]:
    return list(session.exec(
        select(ApiAccessConfig).order_by(ApiAccessConfig.created_at.desc())
    ).all())


def update_api_access_config(
    *, session: Session, db_obj: ApiAccessConfig, update: ApiAccessConfigUpdate
) -> ApiAccessConfig:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_api_access_config(*, session: Session, db_obj: ApiAccessConfig) -> None:
    session.delete(db_obj)
    session.commit()
