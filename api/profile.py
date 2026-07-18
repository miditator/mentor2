# ==========================================
# ФАЙЛ: api/profile.py
# ==========================================
from fastapi import APIRouter
from pydantic import BaseModel
import database
import ai_service  # 🔥 ПОДКЛЮЧАЕМ НАШ НОВЫЙ ВЫДЕЛЕННЫЙ СЕРВИС ИИ

router = APIRouter(
    prefix="/api",
    tags=["Profile"]
)


# --- PYDANTIC МОДЕЛИ ВАЛИДАЦИИ ДАННЫХ ---
class OnboardingData(BaseModel):
    chat_id: int
    language: str
    difficulty: str


class TranslateWordData(BaseModel):
    chat_id: int
    foreign: str


class AddWordData(BaseModel):
    chat_id: int
    foreign: str
    ru: str


class TaskHelpData(BaseModel):
    chat_id: int
    step: int


class TaskAnswerData(BaseModel):
    chat_id: int
    answer: str


class UpdateSettingData(BaseModel):
    chat_id: int
    setting_key: str
    setting_value: str


class IntensityStartData(BaseModel):
    chat_id: int
    word: str


class IntensityCheckData(BaseModel):
    chat_id: int
    original_foreign_phrase: str
    russian_task_phrase: str
    user_answer: str


class IntensityHelpData(BaseModel):
    chat_id: int
    russian_phrase: str
    foreign_phrase: str


class ImageWordData(BaseModel):
    chat_id: int
    image: str


class WordItem(BaseModel):
    foreign: str
    ru: str


class AddMultipleWordsData(BaseModel):
    chat_id: int
    words: list[WordItem]


# --- ЭНДПОИНТЫ ПРОФИЛЯ И НАСТРОЕК ---

@router.get("/profile")
def get_user_profile(chat_id: int):
    config_data = database.get_user_config(chat_id)
    is_new = not config_data or not config_data.get("source_lang") or not config_data.get("difficulty")

    if is_new:
        return {"success": True, "is_new_user": True}

    words = database.get_full_dictionary(chat_id)
    words_count = len(words) if words else 0

    return {
        "success": True,
        "is_new_user": False,
        "language": config_data.get("source_lang"),
        "difficulty": config_data.get("difficulty"),
        "words_count": words_count,
        "words_per_day": config_data.get("words_per_day", 10)
    }


@router.post("/onboarding")
def save_onboarding(data: OnboardingData):
    try:
        database.update_user_setting(data.chat_id, "source_lang", data.language)
        database.update_user_setting(data.chat_id, "difficulty", data.difficulty)

        from handlers.buttons import seed_initial_words_via_ai
        seed_initial_words_via_ai(data.chat_id, data.language)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/settings/update")
def update_setting(data: UpdateSettingData):
    try:
        database.update_user_setting(data.chat_id, data.setting_key, data.setting_value)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- ЭНДПОИНТЫ СЛОВАРЯ И ПЕРЕВОДА ---

@router.post("/words/translate")
def translate_word(data: TranslateWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        result = ai_service.translate_word_ai(data.foreign, target_lang)

        if "error" in result and result["error"] == "nonsense":
            return {"success": False, "error": "nonsense"}

        return {
            "success": True,
            "original": result["original"],
            "translation": result["translation"],
            "is_typo": result["is_typo"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/words/add")
def add_word(data: AddWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        database.add_custom_word(data.chat_id, data.foreign, data.ru, specific_lang=target_lang)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/words/all")
def get_dictionary(chat_id: int):
    words = database.get_full_dictionary(chat_id)
    return {"success": True, "words": words}


# --- ЭНДПОИНТЫ ГРАММАТИЧЕСКИХ ЗАДАНИЙ (TASKS) ---

@router.get("/tasks/new")
def get_new_task(chat_id: int, force: bool = False):
    try:
        if force:
            database.delete_active_task(chat_id)

        active = database.get_active_task(chat_id)
        if active:
            return {
                "success": True,
                "phrase": active["phrase"],
                "rule": active.get("rule", "General Grammar")
            }

        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"
        difficulty = user_config.get("difficulty", "A1")

        words = database.get_words_for_grammar_context(chat_id, limit=1)
        target_word = f"«{words[0]['foreign']}» (перевод: {words[0]['ru']})" if words else "любое базовое слово"

        history = database.get_today_phrases_list(chat_id)

        ru_phrase, rule = ai_service.generate_task_ai(lang_name, target_word, difficulty, history)

        database.save_active_task(chat_id, ru_phrase, rule)
        return {"success": True, "phrase": ru_phrase, "rule": rule}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/tasks/help")
def get_task_help(data: TaskHelpData):
    try:
        active = database.get_active_task(data.chat_id)
        if not active:
            return {"success": False, "error": "Нет активного задания."}

        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        ai_feedback = ai_service.get_task_help_ai(active["phrase"], lang_name, data.step)

        if data.step == 2:
            database.delete_active_task(data.chat_id)

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/tasks/check")
def check_task(data: TaskAnswerData):
    try:
        active = database.get_active_task(data.chat_id)
        if not active:
            return {"success": False, "error": "Нет активного задания."}

        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        ai_feedback = ai_service.check_task_ai(active["phrase"], data.answer, lang_name)

        is_correct = ai_feedback.upper().startswith("ПРАВИЛЬНО")

        if is_correct:
            database.delete_active_task(data.chat_id)
            database.add_to_history(data.chat_id, active["phrase"])
            return {"success": True, "is_correct": True, "feedback": "✅ <b>Отлично! Перевод верный.</b>"}
        else:
            database.increment_help_count(data.chat_id)
            return {"success": True, "is_correct": False, "feedback": f"❌ <b>Ошибка:</b>\n{ai_feedback}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- ЭНДПОИНТЫ ТРЕНИРОВКИ ПОВТОРЕНИЯ ---

@router.get("/train/start")
def start_training(chat_id: int, count: int = 5):
    try:
        words = database.get_words_for_training(chat_id, limit_new=count)
        result = [{"id": w[0], "foreign": w[1], "ru": w[2], "score": w[3]} for w in words]
        return {"success": True, "words": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/train/check")
def check_training_answer(data: TrainingAnswerData):
    try:
        database.update_word_progress(data.word_id, data.is_correct)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- ЭНДПОИНТЫ РЕЖИМА ИНТЕНСИВ (INTENSITY) ---

@router.post("/intensity/start")
def start_intensity(data: IntensityStartData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        phrases_list = ai_service.start_intensity_ai(data.word, target_lang)

        if len(phrases_list) < 5:
            return {"success": False, "error": "ИИ вернул неполный список"}

        return {"success": True, "phrases": phrases_list, "difficulty": "Прогрессивная (A1 ➔ B2)"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/intensity/check")
def check_intensity(data: IntensityCheckData):
    try:
        result = ai_service.check_intensity_ai(
            original_foreign_phrase=data.original_foreign_phrase,
            russian_task_phrase=data.russian_task_phrase,
            user_answer=data.user_answer
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
        explanation = ai_service.help_intensity_ai(data.russian_phrase, data.foreign_phrase)
        return {"success": True, "explanation": explanation}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- НОВЫЕ ЭНДПОИНТЫ ОБРАБОТКИ ФОТО ---

@router.post("/words/from_image")
def words_from_image(data: ImageWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        words_list = ai_service.extract_words_from_image_ai(data.image, target_lang)

        return {
            "success": True,
            "words": words_list
        }
    except Exception as e:
        print(f"❌ Ошибка в транспортном слое фото: {e}")
        return {"success": False, "error": str(e)}


@router.post("/words/add_multiple")
def add_multiple_words(data: AddMultipleWordsData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        added_count = 0
        for word in data.words:
            if word.foreign and word.ru:
                database.add_custom_word(data.chat_id, word.foreign, word.ru, specific_lang=target_lang)
                added_count += 1

        return {
            "success": True,
            "added_count": added_count
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# В api/profile.py
from fastapi import UploadFile, File
import os


@router.post("/speech/recognize")
async def recognize_speech(chat_id: int, file: UploadFile = File(...)):
    temp_path = f"temp_audio_{chat_id}.ogg"

    # Сохраняем файл
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    # Обрабатываем через сервис
    try:
        text = ai_service.transcribe_audio_ai(temp_path)
        return {"success": True, "text": text}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)  # Удаляем временный файл