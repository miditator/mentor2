# ==========================================
# ФАЙЛ: api/profile.py
# ==========================================
from fastapi import APIRouter
from pydantic import BaseModel
import database
import ai_service  # 🔥 ПОДКЛЮЧАЕМ НАШ НОВЫЙ ВЫДЕЛЕННЫЙ СЕРВИС ИИ
import random

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
    rule: str = None


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

class GrammarCheckData(BaseModel):
    chat_id: int
    original_phrase: str
    answer: str
    rule: str

class GrammarHelpData(BaseModel):
    chat_id: int
    original_phrase: str
    step: int

class TrainingAnswerData(BaseModel):
    chat_id: int
    word_id: int
    is_correct: bool

class ChatMessageItem(BaseModel):
    role: str
    content: str

class ChatMessageData(BaseModel):
    chat_id: int
    history: list[ChatMessageItem]

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
            # 🔥 1. ПЕРЕД удалением сохраняем надоевшую фразу в историю, чтобы ИИ ее больше не выдавал
            active = database.get_active_task(chat_id)
            if active:
                database.add_to_history(chat_id, active["phrase"])
            database.delete_active_task(chat_id)

        active = database.get_active_task(chat_id)
        if active:
            return {
                "success": True,
                "phrase": active["phrase"],
                "rule": active.get("rule", "General Grammar"),
                "target_word": active.get("target_word", "базовое слово")
            }

        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"
        difficulty = user_config.get("difficulty", "A1")

        # 🔥 2. Берем список из 10 слов и выбираем одно СЛУЧАЙНОЕ
        # Это не даст боту застрять на одном слове при пропуске задания
        words = database.get_words_for_grammar_context(chat_id, limit=10)
        if words:
            chosen_word = random.choice(words)
            target_word = f"«{chosen_word['foreign']}» (перевод: {chosen_word['ru']})"
        else:
            target_word = "любое базовое слово"

        # Теперь история будет содержать даже те фразы, которые ты пропустил
        history = database.get_today_phrases_list(chat_id)

        ru_phrase, rule = ai_service.generate_task_ai(lang_name, target_word, difficulty, history)

        database.save_active_task(chat_id, ru_phrase, rule)

        return {"success": True, "phrase": ru_phrase, "rule": rule, "target_word": target_word}
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
            # 🔥 Сохраняем фразу в историю, чтобы не повторилась завтра
            database.add_to_history(data.chat_id, active["phrase"])
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

        ai_feedback = ai_service.check_task_ai(active["phrase"], data.answer, lang_name,data.rule)

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


@router.get("/grammar/new")
def get_grammar_task(chat_id: int, rule: str):
    try:
        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"
        difficulty = user_config.get("difficulty", "A1")

        # Берем случайное слово из словаря пользователя (или базовое)
        words = database.get_words_for_grammar_context(chat_id, limit=10)
        if words:
            import random
            chosen_word = random.choice(words)
            target_word = f"«{chosen_word['foreign']}» (перевод: {chosen_word['ru']})"
        else:
            target_word = "любое базовое слово"

        # 🔥 Используем отдельную функцию ИИ, чтобы не ломать логику обычных заданий
        ru_phrase = ai_service.generate_strict_grammar_task_ai(lang_name, target_word, difficulty, rule)

        # Мы НЕ сохраняем это в БД! Возвращаем сразу на фронт.
        return {"success": True, "phrase": ru_phrase, "target_word": target_word}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grammar/check")
def check_grammar_task(data: GrammarCheckData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # Можно переиспользовать существующую функцию проверки, она универсальная
        ai_feedback = ai_service.check_task_ai(data.original_phrase, data.answer, lang_name, data.rule)
        is_correct = ai_feedback.upper().startswith("ПРАВИЛЬНО")

        if is_correct:
            return {"success": True, "is_correct": True, "feedback": "✅ <b>Отлично! Перевод верный.</b>"}
        else:
            return {"success": True, "is_correct": False, "feedback": f"❌ <b>Ошибка:</b>\n{ai_feedback}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grammar/help")
def help_grammar_task(data: GrammarHelpData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # Переиспользуем универсальную функцию подсказки
        ai_feedback = ai_service.get_task_help_ai(data.original_phrase, lang_name, data.step)

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/chat/send")
def send_chat_message(data: ChatMessageData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # Передаем историю диалога в сервис
        response_text = ai_service.free_chat_ai(data.history, lang_name)
        return {"success": True, "response": response_text}
    except Exception as e:
        return {"success": False, "error": str(e)}