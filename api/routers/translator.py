from fastapi import APIRouter, BackgroundTasks
import database
import ai_service
import re
import sqlite3
import time
import json
from pathlib import Path
from api.schemas import *
import aiPrompts

router = APIRouter(prefix="/api", tags=["Translator"])

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "semantic_dictionary.db"


# 🔥 ДВИЖОК РАЗМЕТКИ (ТЕПЕРЬ ВОЗВРАЩАЕТ ТЕГИ ДЛЯ ПЛАШКИ)
def apply_semantic_markup(word_foreign: str, word_ru: str, lang: str, chat_id: int = None) -> dict:
    print(f"\n🕸️ [SEMANTIC GRAPH BUILDER] СТАРТ РАЗМЕТКИ")
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()

        # 1. Проверяем, есть ли уже это слово в графах
        cursor.execute("SELECT id FROM global_words WHERE LOWER(word) = LOWER(?) AND LOWER(lang) = LOWER(?)",
                       (word_foreign.strip(), lang.strip()))
        row = cursor.fetchone()

        if row:
            word_id = row[0]
            # Слово уже было в графе у кого-то другого. Просто отдаем его теги!
            cursor.execute("""
                           SELECT c.name
                           FROM semantic_concepts c
                                    JOIN word_concept_edges e ON c.id = e.concept_id
                           WHERE e.word_id = ?
                           """, (word_id,))
            existing_tags = [r[0] for r in cursor.fetchall()]
            conn.close()
            return {"tags": existing_tags}

        # 2. Если слова в графе нет — просим ИИ
        import aiPrompts
        categories_str = ", ".join(aiPrompts.SEMANTIC_CATEGORIES)
        prompt = f"""You are a linguistic expert building a semantic graph.
Analyze the word "{word_foreign}" (translation: "{word_ru}", language: {lang}).

Provide the following in STRICT JSON format:
1. "cefr_level": Estimate the CEFR level of this word (A1, A2, B1, B2, or C1).
2. "pos": The part of speech. MUST be strictly one of: "nouns", "verbs", "adjectives", "adverbs".
3. "tags": A list of 1 to 4 semantic categories it belongs to, chosen STRICTLY from this exact list:
[{categories_str}]

Format:
{{
  "cefr_level": "B2",
  "pos": "verbs",
  "tags": ["ACTION", "EMOTION"]
}}"""
        full_prompt = f"[Системная инструкция: Верни СТРОГО JSON объект без markdown.]\n\n{prompt}"
        raw_ai = ai_service.ask_ai(full_prompt, temperature=0.1)

        cleaned = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', raw_ai, flags=re.DOTALL).strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        json_str = cleaned[start:end + 1] if start != -1 and end != -1 else cleaned

        data = json.loads(json_str)
        cefr = data.get("cefr_level", "A1").upper()
        pos = data.get("pos", "nouns").lower()
        tags = data.get("tags", [])

        if pos not in ["nouns", "verbs", "adjectives", "adverbs"]: pos = "nouns"
        if cefr not in ["A1", "A2", "B1", "B2", "C1", "C2"]: cefr = "A2"

        # 3. Вставляем новое слово
        cursor.execute(
            "INSERT INTO global_words (word, lang, cefr_level, pos) VALUES (?, ?, ?, ?)",
            (word_foreign.strip().lower(), lang.lower(), cefr, pos)
        )
        word_id = cursor.lastrowid

        # 4. Привязываем теги и собираем их для UI
        ui_tags = []
        for tag in tags:
            tag = tag.strip().upper()
            cursor.execute("SELECT id FROM semantic_concepts WHERE name = ?", (tag,))
            concept_row = cursor.fetchone()
            if concept_row:
                concept_id = concept_row[0]
                cursor.execute("INSERT OR IGNORE INTO word_concept_edges (word_id, concept_id) VALUES (?, ?)",
                               (word_id, concept_id))
                ui_tags.append(tag)

        conn.commit()
        conn.close()
        return {"tags": ui_tags}

    except Exception as e:
        print(f"❌ Ошибка разметки: {e}")
        return {"tags": []}


# 🔥 ДОБАВЛЕНИЕ СЛОВА ИЗ ПРИЛОЖЕНИЯ (ПРОВЕРКА НА ОКСФОРД!)
@router.post("/words/add")
def add_word(data: AddWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 1. СМОТРИМ: ЕСТЬ ЛИ СЛОВО В ОКСФОРДЕ?
        is_in_oxford = database.is_word_in_oxford(data.foreign, target_lang)

        # 2. Добавляем юзеру
        is_added = database.add_custom_word(data.chat_id, data.foreign, data.ru, specific_lang=target_lang)

        if is_added:
            # 3. Делаем разметку (или достаем существующую из графа)
            semantic_result = apply_semantic_markup(data.foreign, data.ru, target_lang, data.chat_id)

            # 4. 🔥 ЕСЛИ ЕГО НЕ БЫЛО В ОКСФОРДЕ — ЭТО ОТКРЫТИЕ!
            is_discovery = not is_in_oxford

            return {
                "success": True,
                "added": True,
                "is_new_discovery": is_discovery,
                "semantic_tags": semantic_result.get("tags", []),
                "word_id": "temp_" + str(int(time.time()))
            }

        return {"success": True, "added": False}
    except Exception as e:
        return {"success": False, "error": str(e)}


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
            "details": result.get("details", {})
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/translate/text")
def translate_smart_text(data: TranslateTextData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        ai_result = ai_service.translate_and_extract_words_ai(data.text, target_lang, chat_id=data.chat_id)

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
            if word_str and word_str not in existing_foreign:
                filtered_words.append(ai_word)

        return {
            "success": True,
            "translation": ai_result.get("translation", ""),
            "new_words": filtered_words
        }
    except Exception as e:
        return {"success": False, "error": str(e)}





@router.get("/words/all")
def get_dictionary(chat_id: int):
    words = database.get_full_dictionary(chat_id)
    return {"success": True, "words": words}


@router.post("/words/from_image")
def words_from_image(data: ImageWordData):
    print(f"\n📸 [IMAGE API ROUTE] Получен запрос на обработку картинки для chat_id: {data.chat_id}", flush=True)
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        print(f"   • Целевой язык: {target_lang}", flush=True)

        ai_result = ai_service.extract_words_from_image_ai(data.image, target_lang, chat_id=data.chat_id)
        print(f"   • ИИ успешно ответил. Тип ответа: {type(ai_result)}", flush=True)

        original_text = ai_result.get("original", "")
        translation_text = ai_result.get("translation", "")
        ai_words_list = ai_result.get("words", [])
        print(f"   • Распознано слов от ИИ: {len(ai_words_list)}", flush=True)

        existing_words_raw = database.get_full_dictionary(data.chat_id) or []
        existing_foreign = set()

        for w in existing_words_raw:
            if isinstance(w, (list, tuple)) and len(w) > 0:
                existing_foreign.add(str(w[0]).lower().strip())
            elif isinstance(w, dict) and "foreign" in w:
                existing_foreign.add(w["foreign"].lower().strip())

        filtered_words = []
        for ai_word in ai_words_list:
            word_str = ai_word.get("foreign", ai_word.get("word", "")).lower().strip()
            if "word" in ai_word:
                ai_word["foreign"] = ai_word["word"]

            if word_str and word_str not in existing_foreign:
                filtered_words.append(ai_word)

        print(f"   • После фильтрации словаря осталось новых слов: {len(filtered_words)}", flush=True)

        return {
            "success": True,
            "original": original_text,
            "translation": translation_text,
            "words": filtered_words,
            "all_known": len(ai_words_list) > 0 and len(filtered_words) == 0
        }
    except Exception as e:
        import traceback
        print(f"❌ [IMAGE API ROUTE] Ошибка в транспортном слове фото: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        return {"success": False, "error": str(e)}


# 🔥 ДОБАВЛЕН BackgroundTasks И СЮДА
@router.post("/words/add_multiple")
def add_multiple_words(data: AddMultipleWordsData, background_tasks: BackgroundTasks):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        added_count = 0
        discovered_words = []  # 👈 Собираем уникальные находки

        for word in data.words:
            if word.foreign and word.ru:
                # 1. Проверяем по Оксфорду мгновенно
                is_in_oxford = database.is_word_in_oxford(word.foreign, target_lang)

                # 2. Добавляем в словарь пользователя
                is_added = database.add_custom_word(data.chat_id, word.foreign, word.ru, specific_lang=target_lang)

                if is_added:
                    added_count += 1

                    if not is_in_oxford:
                        discovered_words.append(word.foreign)

                    # 3. Отправляем в фон на долгую и умную разметку ИИ (UI не ждет)
                    background_tasks.add_task(apply_semantic_markup, word.foreign, word.ru, target_lang, data.chat_id)

        return {
            "success": True,
            "added_count": added_count,
            "discoveries": discovered_words  # 👈 Отдаем список находок фронтенду
        }
    except Exception as e:
        return {"success": False, "error": str(e)}