import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, dashboard
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="F1 Lab BD")

origens_permitidas = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"]
)

app.include_router(auth.router, prefix="/auth")
app.include_router(dashboard.router)