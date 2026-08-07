from fastapi import APIRouter
import database
import ai_service
import sqlite3
from api.schemas import *

router = APIRouter(prefix="/api", tags=["Debug"])


@router.post("/debug/ai_identity")
def debug_ai_identity(data: DebugAiData):
    try:
        response = ai_service.get_ai_identity(chat_id=data.chat_id)
        return {"success": True, "identity": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/debug/db_dump")
def debug_db_dump(chat_id: int):
    try:
        conn = sqlite3.connect(database.DB_NAME, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row["name"] for row in cursor.fetchall()]

        db_data = {}
        for table in tables:
            try:
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [col["name"] for col in cursor.fetchall()]

                if "chat_id" in columns:
                    cursor.execute(f"SELECT * FROM {table} WHERE chat_id = ?", (chat_id,))
                else:
                    cursor.execute(f"SELECT * FROM {table}")

                rows = [dict(row) for row in cursor.fetchall()]
                db_data[table] = rows
            except Exception as e:
                db_data[table] = f"Error reading table: {str(e)}"

        conn.close()
        return {"success": True, "tables": db_data}
    except Exception as e:
        return {"success": False, "error": str(e)}