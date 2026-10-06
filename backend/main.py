from fastapi import FastAPI

app = FastAPI(
    title="Privacy-Aware Clinical Care Platform",
    description="Backend API for the healthcare project",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "message": "Healthcare Platform API is running",
        "status": "ok"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }