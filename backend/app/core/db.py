"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
from sqlmodel import Session, create_engine, select, SQLModel

from app import crud
from app.core.config import settings
from app.models import User, UserCreate

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # For local development we auto-create tables to unblock UI/API integration
    # Note: Production should use Alembic migrations instead.
    if settings.ENVIRONMENT == "local":
        SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        # 从 email 中提取 username（@ 之前的部分）
        username = settings.FIRST_SUPERUSER.split("@")[0]
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            username=username,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)
