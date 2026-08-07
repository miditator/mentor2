from fastapi import APIRouter
import database

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Settings"])
@router.post("/settings/update")
def update_setting(data: UpdateSettingData):
    try:
        database.update_user_setting(data.chat_id, data.setting_key, data.setting_value)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}