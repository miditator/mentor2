# ==========================================
# ФАЙЛ: api/profile.py
# ==========================================
import zipfile

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import database
import ai_service
import random
import os
from fastapi.responses import StreamingResponse
from gtts import gTTS
import io
import sqlite3
import re
from bs4 import BeautifulSoup
import ebooklib
from ebooklib import epub
import tempfile

import mobi # Нужно установить: pip install mobi

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
    rule: str = None
    target_word: str = None


class TaskAnswerData(BaseModel):
    chat_id: int
    answer: str
    rule: str = None
    target_word: str = None


class UpdateSettingData(BaseModel):
    chat_id: int
    setting_key: str
    setting_value: str


class IntensityStartData(BaseModel):
    chat_id: int
    word: str
    difficulty: str
    meanings: list[str] = []  # 🔥 Добавили прием массива значений


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
    target_word: str = None


class GrammarHelpData(BaseModel):
    chat_id: int
    original_phrase: str
    step: int
    rule: str = None
    target_word: str = None  # 🔥 Добавили целевое слово


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

class WordDetailsData(BaseModel):
    chat_id: int
    word: str

class EditWordRequest(BaseModel):
    chat_id: int
    word: str
    new_translation: str

class IntensityFinishData(BaseModel):
    chat_id: int
    word: str
    score: int

class TranslateTextData(BaseModel):
    chat_id: int
    text: str

class DeleteWordData(BaseModel):
    chat_id: int
    word: str

class TrainFinishData(BaseModel):
    chat_id: int
    count: int
# --- ЭНДПОИНТЫ ПРОФИЛЯ И НАСТРОЕК ---


@router.get("/profile")
def get_user_profile(chat_id: int, username: str = "Пользователь"):
    database.update_user_setting(chat_id, "username", username)

    config_data = database.get_user_config(chat_id)
    is_new = not config_data or not config_data.get("source_lang") or not config_data.get("difficulty")

    if is_new:
        return {"success": True, "is_new_user": True, "username": username}

    words = database.get_full_dictionary(chat_id)
    words_count = len(words) if words else 0
    active_task = database.get_active_task(chat_id)

    # 🔥 Фразы и слова за сегодня
    phrases_today = database.get_today_completions_count(chat_id)
    words_today = database.get_today_word_completions_count(chat_id)

    words_per_day = config_data.get("words_per_day", 5)
    phrases_per_day = config_data.get("phrases_per_day", 10)

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
        "username": config_data.get("username", username),
        "active_task": active_task
    }


@router.post("/onboarding")
def save_onboarding(data: OnboardingData):
    try:
        database.update_user_setting(data.chat_id, "source_lang", data.language)
        database.update_user_setting(data.chat_id, "difficulty", data.difficulty)

        # Вызов функции для генерации стартовых слов (если она нужна)
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

        word_to_translate = data.foreign.strip()
        is_russian = bool(re.search(r'[а-яА-ЯёЁ]', word_to_translate))


        result = ai_service.translate_word_ai(word_to_translate, target_lang, data.chat_id, is_russian)

        if "error" in result and result["error"] == "nonsense":
            return {"success": False, "error": "nonsense"}

        return {
            "success": True,
            "original": result["original"],
            "translation": result["translation"],
            "is_typo": result.get("is_typo", False),
            "details": result.get("details", {})  # 🔥 Отдаем details на фронтенд
        }
    except Exception as e:
        return {"success": False, "error": str(e)}



@router.post("/words/add")
def add_word(data: AddWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 🔥 Сохраняем результат: True (новое) или False (уже было)
        is_added = database.add_custom_word(data.chat_id, data.foreign, data.ru, specific_lang=target_lang)

        # Отдаем этот статус на фронтенд
        return {"success": True, "added": is_added}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/words/all")
def get_dictionary(chat_id: int):
    words = database.get_full_dictionary(chat_id)
    return {"success": True, "words": words}


# --- ЭНДПОИНТЫ ГРАММАТИЧЕСКИХ ЗАДАНИЙ (TASKS) ---

@router.get("/tasks/new")
def get_new_task(chat_id: int, rule: str = "General Grammar", force: bool = False):
    try:
        if force:
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

        words = database.get_words_for_grammar_context(chat_id, limit=10)
        if words:
            chosen_word = random.choice(words)
            target_word = f"«{chosen_word['foreign']}» (перевод: {chosen_word['ru']})"
        else:
            target_word = "любое базовое слово"

        history = database.get_today_phrases_list(chat_id)
        ru_phrase, final_rule = ai_service.generate_task_ai(lang_name, target_word, difficulty, history, rule)
        database.save_active_task(chat_id, ru_phrase, final_rule)

        return {"success": True, "phrase": ru_phrase, "rule": final_rule, "target_word": target_word}
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

        ai_feedback = ai_service.get_task_help_ai(
            active["phrase"],
            lang_name,
            data.step,
            rule=data.rule,
            target_word=data.target_word
        )

        if data.step == 2:
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

        ai_feedback = ai_service.check_task_ai(
            active["phrase"],
            data.answer,
            lang_name,
            rule=data.rule,
            target_word=data.target_word
        )

        is_correct = ai_feedback.upper().startswith("ПРАВИЛЬНО")

        if is_correct:
            database.delete_active_task(data.chat_id)
            database.add_to_history(data.chat_id, active["phrase"])
            database.add_successful_completion(data.chat_id)
            return {"success": True, "is_correct": True, "feedback": "✅ <b>Отлично! Перевод верный.</b>"}
        else:
            database.increment_help_count(data.chat_id)
            return {"success": True, "is_correct": False, "feedback": f"❌ <b>Ошибка:</b>\n{ai_feedback}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- ЭНДПОИНТЫ ТОЧЕЧНОЙ ТРЕНИРОВКИ ГРАММАТИКИ ---

@router.get("/grammar/new")
def get_grammar_task(chat_id: int, rule: str, difficulty: str = None):  # 🔥 Добавлен прием difficulty с фронта
    try:
        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 🔥 Если уровень передан с фронтенда (напр. "B2"), используем его, иначе дефолтный юзера
        final_difficulty = difficulty if difficulty else user_config.get("difficulty", "A1")

        words = database.get_words_for_grammar_context(chat_id, limit=10)
        if words:
            chosen_word = random.choice(words)
            target_word = f"«{chosen_word['foreign']}» (перевод: {chosen_word['ru']})"
        else:
            target_word = "любое базовое слово"

        # 🔥 Передаем final_difficulty
        ru_phrase = ai_service.generate_strict_grammar_task_ai(lang_name, target_word, final_difficulty, rule)

        return {"success": True, "phrase": ru_phrase, "target_word": target_word}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grammar/check")
def check_grammar_task(data: GrammarCheckData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        ai_feedback = ai_service.check_task_ai(
            data.original_phrase,
            data.answer,
            lang_name,
            rule=data.rule,
            target_word=data.target_word
        )

        is_correct = ai_feedback.upper().startswith("ПРАВИЛЬНО")

        if is_correct:
            database.add_successful_completion(data.chat_id)
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

        # 🔥 Передаем целевое слово в подсказку
        ai_feedback = ai_service.get_task_help_ai(
            data.original_phrase,
            lang_name,
            data.step,
            rule=data.rule,
            target_word=data.target_word
        )

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- ОСТАЛЬНЫЕ ЭНДПОИНТЫ (Тренировки, Интенсив, Фото, Аудио, Чат) ---
# Оставлены без изменений, они в полном порядке

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



@router.post("/intensity/start")
def start_intensity(data: IntensityStartData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 🔥 Передаем data.difficulty и data.meanings в сервис ИИ
        phrases_list = ai_service.start_intensity_ai(data.word, target_lang, data.difficulty, data.meanings)

        if len(phrases_list) < 5:
            return {"success": False, "error": "ИИ вернул неполный список"}

        # 🔥 Возвращаем обратно реальную сложность вместо жестко прописанного текста
        return {"success": True, "phrases": phrases_list, "difficulty": data.difficulty}
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

@router.post("/intensity/finish")
def finish_intensity(data: IntensityFinishData):
    try:
        # Обновляем процент выученности слова
        result = database.update_word_intensity_progress(data.chat_id, data.word, data.score)

        # 🔥 Засчитываем в прогресс каждую успешно пройденную фразу из интенсива (если балл > 0)
        if data.score > 0:
            for _ in range(data.score):
                database.add_successful_completion(data.chat_id)

        # 🔥 Засчитываем интенсив в дневную историю фраз
        database.add_to_history(data.chat_id, f"Интенсив: {data.word}")
        return {"success": True, "updated": result["updated"]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/words/from_image")
def words_from_image(data: ImageWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        ai_words_list = ai_service.extract_words_from_image_ai(data.image, target_lang)
        existing_words_raw = database.get_full_dictionary(data.chat_id) or []
        existing_foreign = set()

        for w in existing_words_raw:
            if isinstance(w, (list, tuple)) and len(w) > 0:
                existing_foreign.add(str(w[0]).lower().strip())
            elif isinstance(w, dict) and "foreign" in w:
                existing_foreign.add(w["foreign"].lower().strip())

        filtered_words = []
        for ai_word in ai_words_list:
            word_str = ai_word.get("foreign", "").lower().strip()
            if word_str and word_str not in existing_foreign:
                filtered_words.append(ai_word)

        return {
            "success": True,
            "words": filtered_words,
            "all_known": len(ai_words_list) > 0 and len(filtered_words) == 0
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


@router.post("/speech/recognize")
async def recognize_speech(chat_id: int, file: UploadFile = File(...)):
    temp_path = f"temp_audio_{chat_id}.ogg"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())
    try:
        text = ai_service.transcribe_audio_ai(temp_path)
        return {"success": True, "text": text}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/speech/tts")
def text_to_speech(text: str, lang: str = "en"):
    try:
        # Генерируем речь
        tts = gTTS(text=text, lang=lang)
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)

        # Отдаем аудиопоток прямо в браузер
        return StreamingResponse(audio_io, media_type="audio/mpeg")
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/chat/send")
def send_chat_message(data: ChatMessageData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        response_text = ai_service.free_chat_ai(data.history, lang_name)
        return {"success": True, "response": response_text}
    except Exception as e:
        return {"success": False, "error": str(e)}



@router.post("/words/details")
def word_details(data: WordDetailsData):
    try:
        # 1. Достаем глобальные настройки пользователя через правильный метод БД
        user_config = database.get_user_config(data.chat_id)

        # 2. Берем глобальный язык приложения
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 3. Передаем слово и язык в сервис ИИ
        details = ai_service.get_word_details_ai(data.word, target_lang)

        return {"success": True, "details": details}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/words/edit")
def edit_word_translation(data: EditWordRequest):
    try:
        # Здесь вы вызываете функцию базы данных, которая находит слово по chat_id и word,
        # и перезаписывает его перевод (ru) на data.new_translation
        database.update_user_word(
            chat_id=data.chat_id,
            word_foreign=data.word,
            new_ru=data.new_translation
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/words/delete")
def delete_word(data: DeleteWordData):
    try:
        # ⚠️ ВНИМАНИЕ: Проверь точное название функции в твоем database.py!
        database.delete_custom_word(data.chat_id, data.word)
        return {"success": True}
    except Exception as e:
        print(f"❌ Ошибка удаления слова из БД: {e}")
        return {"success": False, "error": str(e)}


@router.post("/translate/text")
def translate_smart_text(data: TranslateTextData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 1. Запрашиваем у ИИ перевод текста и извлечение слов
        ai_result = ai_service.translate_and_extract_words_ai(data.text, target_lang)

        # 2. Получаем словарь пользователя, чтобы отсеять слова, которые он уже знает
        existing_words_raw = database.get_full_dictionary(data.chat_id) or []
        existing_foreign = set()

        for w in existing_words_raw:
            if isinstance(w, (list, tuple)) and len(w) > 0:
                existing_foreign.add(str(w[0]).lower().strip())
            elif isinstance(w, dict) and "foreign" in w:
                existing_foreign.add(w["foreign"].lower().strip())

        filtered_words = []
        for ai_word in ai_result.get("words", []):
            word_str = ai_word.get("word", "").lower().strip()
            # Отсекаем, если слово уже есть в базе
            if word_str and word_str not in existing_foreign:
                filtered_words.append(ai_word)

        return {
            "success": True,
            "translation": ai_result.get("translation", ""),
            "new_words": filtered_words
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/train/finish")
def finish_training_session(data: TrainFinishData):
    try:
        database.add_word_completions(data.chat_id, data.count)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/debug/db_dump")
def debug_db_dump(chat_id: int):
    try:
        conn = sqlite3.connect(database.DB_NAME, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Получаем список всех таблиц в базе
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row["name"] for row in cursor.fetchall()]

        db_data = {}
        for table in tables:
            try:
                # Проверяем структуру таблицы на наличие колонки chat_id
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [col["name"] for col in cursor.fetchall()]

                if "chat_id" in columns:
                    cursor.execute(f"SELECT * FROM {table} WHERE chat_id = ?", (chat_id,))
                else:
                    # Если таблицы вроде системных не имеют chat_id, выводим целиком
                    cursor.execute(f"SELECT * FROM {table}")

                rows = [dict(row) for row in cursor.fetchall()]
                db_data[table] = rows
            except Exception as e:
                db_data[table] = f"Error reading table: {str(e)}"

        conn.close()
        return {"success": True, "tables": db_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/books/upload")
async def upload_book(chat_id: int, file: UploadFile = File(...)):
    temp_file_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        extracted_text = ""
        filename = file.filename.lower()

        # =======================================================
        # ЗАПАСНОЙ ПЛАН: Очищаем имя файла от мусора Флибусты
        # =======================================================
        # 1. Убираем расширения (.fb2, .epub, .zip)
        clean_title = re.sub(r'\.(fb2|epub|mobi|txt|zip)+$', '', file.filename, flags=re.IGNORECASE)
        # 2. Убираем идущие в конце цифры Флибусты (например, .639291)
        clean_title = re.sub(r'\.\d+$', '', clean_title)
        # 3. Заменяем подчеркивания и тире на пробелы
        clean_title = clean_title.replace('_', ' ')
        book_title = clean_title

        # =======================================================
        # ОСНОВНОЙ ПЛАН: Чтение с сортировкой файлов
        # =======================================================
        if filename.endswith(".epub"):
            try:
                with zipfile.ZipFile(temp_file_path, 'r') as archive:
                    # 🔥 ДОБАВЛЕНО SORTED(): Читаем файлы строго по порядку (01, 02, 03...)
                    for item in sorted(archive.namelist()):
                        # Ищем название в EPUB
                        if item.endswith('.opf'):
                            opf_data = archive.read(item).decode('utf-8', errors='ignore')
                            title_match = re.search(r'<dc:title[^>]*>(.*?)</dc:title>', opf_data, re.IGNORECASE)
                            if title_match:
                                book_title = title_match.group(1)

                        if item.endswith(('.html', '.htm', '.xhtml', '.xml')):
                            if 'META-INF' in item or 'toc.ncx' in item or 'content.opf' in item:
                                continue
                            raw_data = archive.read(item).decode('utf-8', errors='ignore')
                            extracted_text += raw_data + "\n"
            except zipfile.BadZipFile:
                # Если это переименованный FB2, ищем тег book-title
                with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                    extracted_text = f.read()
                    title_match = re.search(r'<book-title[^>]*>(.*?)</book-title>', extracted_text, re.IGNORECASE)
                    if title_match:
                        book_title = title_match.group(1)

        elif filename.endswith(".fb2") or filename.endswith(".fb2.epub"):
            with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
                title_match = re.search(r'<book-title[^>]*>(.*?)</book-title>', extracted_text, re.IGNORECASE)
                if title_match:
                    book_title = title_match.group(1)

        elif filename.endswith(".txt"):
            with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        elif filename.endswith(".mobi"):
            import mobi
            tempdir, filepath = mobi.extract(temp_file_path)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        else:
            os.remove(temp_file_path)
            return {"success": False, "error": "Неподдерживаемый формат."}

        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        # Очистка текста
        extracted_text = re.sub(r'<binary.*?>.*?</binary>', '', extracted_text, flags=re.DOTALL)
        extracted_text = re.sub(r'</p>|</div>|</title>|</h1>|</h2>|</h3>|<br\s*/?>|<empty-line\s*/?>', '\n\n',
                                extracted_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'<[^>]+>', '', extracted_text)

        if len(clean_text.strip()) < 50 and len(extracted_text.strip()) > 50:
            clean_text = extracted_text

        clean_text = re.sub(r'[ \t]+', ' ', clean_text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text).strip()

        if not clean_text:
            return {"success": False, "error": "Файл оказался пустым."}

        chunk_size = 1500
        chunks = []
        text_length = len(clean_text)
        pos = 0

        while pos < text_length:
            end_pos = pos + chunk_size
            if end_pos >= text_length:
                chunks.append(clean_text[pos:].strip())
                break

            space_pos = clean_text.rfind('\n\n', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = clean_text.rfind('\n', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = clean_text.rfind(' ', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = end_pos

            chunks.append(clean_text[pos:space_pos].strip())

            if clean_text[space_pos:space_pos + 2] == '\n\n':
                pos = space_pos + 2
            else:
                pos = space_pos + 1

        # 🔥 ВОЗВРАЩАЕМ НАЗВАНИЕ НА ФРОНТЕНД
        return {"success": True, "chunks": chunks, "title": book_title.strip()}

    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"success": False, "error": f"Ошибка сервера: {str(e)}"}