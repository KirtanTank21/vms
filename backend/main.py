import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import push, notify

load_dotenv()

app = FastAPI(title="VMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(push.router)
app.include_router(notify.router)


@app.get("/health")
def health():
    return {"status": "ok"}
