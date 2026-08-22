from fastapi import APIRouter
import database
import ai_service

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Dictionary"])

@router.post("/words/details")
def word_details(data: WordDetailsData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 🔥 Передаем chat_id
        details = ai_service.get_word_details_ai(data.word, target_lang, chat_id=data.chat_id)

        return {"success": True, "details": details}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/words/edit")
def edit_word_translation(data: EditWordRequest):
    try:
        database.update_user_word(
            chat_id=data.chat_id,
            word_foreign=data.word,
            new_ru=data.new_translation
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/words/delete")
def delete_word(data: dict):
    try:
        chat_id = data.get("chat_id")
        word_id = data.get("word_id")
        word_str = data.get("word")

        # Если фронтенд прислал ID, удаляем по ID (новый надежный метод)
        if word_id:
            database.delete_custom_word_by_id(chat_id, word_id)
        # Резервный старый метод
        elif word_str:
            database.delete_custom_word(chat_id, word_str)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/words/word-count")
def get_word_count_endpoint(chat_id: int):
    """Возвращает актуальное количество слов прямиком из базы"""
    try:
        count = database.get_user_words_count(chat_id)
        return {"success": True, "count": count}
    except Exception as e:
        return {"success": False, "error": str(e)}