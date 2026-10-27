"""Database engine, sessionmaker, and declarative base."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Create engine with pre-ping to handle connection drops gracefully on hosting providers like Render
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a database session and safely closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
