import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_db: Client | None = None


def get_db() -> Client:
    global _db
    if _db is None:
        _db = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _db
