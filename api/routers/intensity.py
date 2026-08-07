from fastapi import APIRouter
import database
import ai_service

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Intensity"])

@router.post("/intensity/start")
def start_intensity(data: IntensityStartData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 🔥 Передаем chat_id
        phrases_list = ai_service.start_intensity_ai(data.word, target_lang, data.difficulty, data.meanings,
                                                     chat_id=data.chat_id)

        if len(phrases_list) < 5:
            return {"success": False, "error": "ИИ вернул неполный список"}

        return {"success": True, "phrases": phrases_list, "difficulty": data.difficulty}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/intensity/check")
def check_intensity(data: IntensityCheckData):
    try:
        # 🔥 Передаем chat_id
        result = ai_service.check_intensity_ai(
            original_foreign_phrase=data.original_foreign_phrase,
            russian_task_phrase=data.russian_task_phrase,
            user_answer=data.user_answer,
            chat_id=data.chat_id
        )
        return {
            "success": True,
            "is_correct": result.get("is_correct", False),
            "feedback": result.get("feedback", "Нет комментария")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/intensity/help")
def help_intensity(data: IntensityHelpData):
    try:
        # 🔥 Передаем chat_id
        explanation = ai_service.help_intensity_ai(data.russian_phrase, data.foreign_phrase, chat_id=data.chat_id)
        return {"success": True, "explanation": explanation}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/intensity/finish")
def finish_intensity(data: IntensityFinishData):
    try:
        result = database.update_word_intensity_progress(data.chat_id, data.word, data.score)
        if data.score > 0:
            for _ in range(data.score):
                database.add_successful_completion(data.chat_id)
        database.add_to_history(data.chat_id, f"Интенсив: {data.word}")
        return {"success": True, "updated": result["updated"]}
    except Exception as e:
        return {"success": False, "error": str(e)}