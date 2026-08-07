from fastapi import APIRouter
import database
import ai_service
from api.schemas import *

router = APIRouter(prefix="/api", tags=["Live_Chat"])

@router.post("/chat/send")
def send_chat_message(data: ChatMessageData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 🔥 Передаем chat_id
        response_text = ai_service.free_chat_ai(data.history, lang_name, chat_id=data.chat_id)
        return {"success": True, "response": response_text}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/chat/error_analysis")
def analyze_error_chat(data: ErrorAnalysisData):
    try:
        # 1. Получаем настройки пользователя
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 2. Отправляем запрос в изолированную функцию
        answer = ai_service.get_error_analysis_ai(
            message=data.message,
            lang_name=lang_name,
            chat_id=data.chat_id
        )

        # 3. Возвращаем результат
        return {"success": True, "answer": answer}
    except Exception as e:
        return {"success": False, "error": str(e)}