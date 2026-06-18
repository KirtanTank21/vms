import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from routers import push, notify

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )
    yield


app = FastAPI(title="VMS API", lifespan=lifespan)

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
