from fastapi import APIRouter
import database
from api.schemas import *

# 🔥 ДОБАВЛЕН ИМПОРТ ФУНКЦИИ ИЗ utils.py
from utils import start_or_resume_timer

router = APIRouter(prefix="/api", tags=["Users_Profile"])


@router.get("/profile")
def get_user_profile(chat_id: int):
    # 🔥 Запускаем или возобновляем таймер при каждом открытии профиля
    start_or_resume_timer(chat_id)

    config_data = database.get_user_config(chat_id)
    is_new = not config_data or not config_data.get("source_lang") or not config_data.get("difficulty")

    if is_new:
        return {"success": True, "is_new_user": True}

    # 🔥 ИСПОЛЬЗУЕМ НОВУЮ БЫСТРУЮ ФУНКЦИЮ ПОДСЧЕТА
    words_count = database.get_user_words_count(chat_id)
    active_task = database.get_active_task(chat_id)

    phrases_today = database.get_today_completions_count(chat_id)
    words_today = database.get_today_word_completions_count(chat_id)

    words_per_day = config_data.get("words_per_day", 5)
    phrases_per_day = config_data.get("phrases_per_day", 10)

    discoveries = database.get_and_clear_discoveries(chat_id)

    return {
        "success": True,
        "is_new_user": False,
        "language": config_data.get("source_lang"),
        "difficulty": config_data.get("difficulty"),
        "words_count": words_count,
        "words_per_day": words_per_day,
        "phrases_per_day": phrases_per_day,
        "words_today": words_today,
        "phrases_today": phrases_today,
        "active_task": active_task,
        "ai_provider": config_data.get("ai_provider", "groq"),

        # 🔥 ДОБАВЛЯЕМ ПЕРЕДАЧУ НОВЫХ НАСТРОЕК ВО ФРОНТЕНД
        "tts_voice_en": config_data.get("tts_voice_en"),
        "tts_voice_de": config_data.get("tts_voice_de"),
        "tts_rate": config_data.get("tts_rate", "-15%"),

        "discoveries": discoveries
    }


@router.post("/onboarding")
def save_onboarding(data: OnboardingData):
    try:
        database.update_user_setting(data.chat_id, "source_lang", data.language)
        database.update_user_setting(data.chat_id, "difficulty", data.difficulty)

        # Вызов функции для генерации стартовых слов
        from handlers.buttons import seed_initial_words_via_ai
        seed_initial_words_via_ai(data.chat_id, data.language)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# 🔥 ВОТ ЭТОТ ЭНДПОИНТ ТЫ ЗАБЫЛ ДОБАВИТЬ:
@router.get("/profile/word-count")
def get_word_count_endpoint(chat_id: int):
    """Возвращает актуальное количество слов прямиком из базы"""
    try:
        count = database.get_user_words_count(chat_id)
        return {"success": True, "count": count}
    except Exception as e:
        return {"success": False, "error": str(e)}