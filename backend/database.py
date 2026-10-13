
import os

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load settings from backend/.env
load_dotenv()

# Build the connection URL safely, even if the password contains special characters
database_url = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("DATABASE_USER"),
    password=os.getenv("DATABASE_PASSWORD"),
    host=os.getenv("DATABASE_HOST", "localhost"),
    port=int(os.getenv("DATABASE_PORT", "5432")),
    database=os.getenv("DATABASE_NAME"),
)

# Create the database engine
engine = create_engine(database_url, pool_pre_ping=True)

# Create a reusable session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


# Base class for database models
class Base(DeclarativeBase):
    pass


# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Simple connection test
if __name__ == "__main__":
    with engine.connect() as connection:
        result = connection.execute(text("SELECT current_database(), current_user"))
        database_name, database_user = result.one()
        print(f"Connected successfully to database: {database_name}")
        print(f"Connected as user: {database_user}")
