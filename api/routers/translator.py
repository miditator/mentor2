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


# 🔥 ОНБОВЛЕННЫЙ И МОЩНЫЙ ДВИЖОК РАЗМЕТКИ (РАБОТАЕТ В ФОНЕ)
def apply_semantic_markup(word_foreign: str, word_ru: str, lang: str, chat_id: int = None):
    print(f"\n" + "🕸️" * 30, flush=True)
    print(f"🕸️ [SEMANTIC GRAPH BUILDER] СТАРТ РАЗМЕТКИ (ФОНОВЫЙ ПРОЦЕСС)", flush=True)
    print(f"   • Слово: '{word_foreign}' | Перевод: '{word_ru}' | Язык: '{lang}'", flush=True)

    try:
        if not DB_PATH.exists():
            print(f"❌ [SEMANTIC GRAPH ERROR] База {DB_PATH} не найдена!")
            print("🕸️" * 30 + "\n")
            return

        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()

        # 1. Проверяем, есть ли уже это слово в графах
        cursor.execute("SELECT id FROM global_words WHERE LOWER(word) = LOWER(?) AND LOWER(lang) = LOWER(?)",
                       (word_foreign.strip(), lang.strip()))
        row = cursor.fetchone()

        word_id = None
        if row:
            word_id = row[0]
            print(f"   • СТАТУС В БД: Слово найдено (ID: {word_id}). Проверка связей...")
            cursor.execute("SELECT COUNT(*) FROM word_concept_edges WHERE word_id = ?", (word_id,))
            if cursor.fetchone()[0] > 0:
                print(f"✅ [SEMANTIC GRAPH] Слово '{word_foreign}' уже размечено в графе. Пропуск.")
                print("🕸️" * 30 + "\n")
                conn.close()
                return
        else:
            print(f"   • СТАТУС В БД: Новое слово. Отправляем запрос к ИИ...")

        # 2. Если слова нет или оно пустое — просим ИИ классифицировать его
        categories_str = ", ".join(aiPrompts.SEMANTIC_CATEGORIES)

        prompt = f"""You are a linguistic expert building a semantic graph.
Analyze the word "{word_foreign}" (translation: "{word_ru}", language: {lang}).

Provide the following in STRICT JSON format:
1. "cefr_level": Estimate the CEFR level of this word (A1, A2, B1, B2, or C1).
2. "pos": The part of speech. MUST be strictly one of: "nouns", "verbs", "adjectives", "adverbs". If it's a phrase, choose the primary function.
3. "tags": A list of 1 to 4 semantic categories it belongs to, chosen STRICTLY from this exact list:
[{categories_str}]

Format:
{{
  "cefr_level": "A2",
  "pos": "verbs",
  "tags": ["ACTION", "MOVEMENT"]
}}"""

        full_prompt = f"[Системная инструкция: Верни СТРОГО JSON объект без markdown.]\n\n{prompt}"
        # Вызываем ИИ
        raw_ai = ai_service.ask_ai(full_prompt, temperature=0.1)

        print(f"   🤖 [AI RAW] Ответ нейросети:")
        print(f"      {raw_ai.strip()}")

        # Надежный парсинг JSON от ИИ
        cleaned = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', raw_ai, flags=re.DOTALL).strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        json_str = cleaned[start:end + 1] if start != -1 and end != -1 else cleaned

        data = json.loads(json_str)
        cefr = data.get("cefr_level", "A1").upper()
        pos = data.get("pos", "nouns").lower()
        tags = data.get("tags", [])

        original_pos = pos
        original_cefr = cefr

        if pos not in ["nouns", "verbs", "adjectives", "adverbs"]:
            pos = "nouns"
        if cefr not in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            cefr = "A2"

        if original_pos != pos or original_cefr != cefr:
            print(f"   ⚠️ [FALLBACK] Корректировки: CEFR({original_cefr}->{cefr}), POS({original_pos}->{pos})")

        # 3. Вставляем слово в глобальную таблицу global_words
        if not word_id:
            cursor.execute(
                "INSERT INTO global_words (word, lang, cefr_level, pos) VALUES (?, ?, ?, ?)",
                (word_foreign.strip().lower(), lang.lower(), cefr, pos)
            )
            word_id = cursor.lastrowid
            print(f"   💾 [DB INSERT] Создана запись слова: ID={word_id} | POS={pos} | Уровень={cefr}")

        # 4. Привязываем теги (концепты) в таблицу связей
        added_tags = []
        for tag in tags:
            tag = tag.strip().upper()
            cursor.execute("SELECT id FROM semantic_concepts WHERE name = ?", (tag,))
            concept_row = cursor.fetchone()
            if concept_row:
                concept_id = concept_row[0]
                cursor.execute("INSERT OR IGNORE INTO word_concept_edges (word_id, concept_id) VALUES (?, ?)",
                               (word_id, concept_id))
                added_tags.append(f"{tag} (ID:{concept_id})")
            else:
                print(f"   ⚠️ [TAG WARNING] Концепт '{tag}' не найден! Пропущен.")

        conn.commit()
        conn.close()

        print(f"   ✅ [SUCCESS] Слово '{word_foreign}' интегрировано в семантический граф!")
        print(f"      • Концепты: {', '.join(added_tags)}")
        print("🕸️" * 30 + "\n")

    except Exception as e:
        print(f"❌ [SEMANTIC GRAPH EXCEPTION] Ошибка разметки слова '{word_foreign}': {e}")
        print("🕸️" * 30 + "\n")


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


# 🔥 ДОБАВЛЕН BackgroundTasks ДЛЯ ФОНОВОЙ ОБРАБОТКИ
@router.post("/words/add")
def add_word(data: AddWordData, background_tasks: BackgroundTasks):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        is_added = database.add_custom_word(data.chat_id, data.foreign, data.ru, specific_lang=target_lang)

        # 🔥 Отправляем тяжелую задачу ИИ в фон. Сервер моментально вернет ответ приложению!
        background_tasks.add_task(apply_semantic_markup, data.foreign, data.ru, target_lang, data.chat_id)

        return {
            "success": True,
            "added": is_added,
            "semantic_tags": [],  # Логи ушли в фон
            "word_id": "temp_" + str(int(time.time()))
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/words/all")
def get_dictionary(chat_id: int):
    words = database.get_full_dictionary(chat_id)
    return {"success": True, "words": words}


@router.post("/words/from_image")
def words_from_image(data: ImageWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        ai_result = ai_service.extract_words_from_image_ai(data.image, target_lang, chat_id=data.chat_id)

        original_text = ai_result.get("original", "")
        translation_text = ai_result.get("translation", "")
        ai_words_list = ai_result.get("words", [])

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

        return {
            "success": True,
            "original": original_text,
            "translation": translation_text,
            "words": filtered_words,
            "all_known": len(ai_words_list) > 0 and len(filtered_words) == 0
        }
    except Exception as e:
        print(f"❌ Ошибка в транспортном слое фото: {e}")
        return {"success": False, "error": str(e)}


# 🔥 ДОБАВЛЕН BackgroundTasks И СЮДА
@router.post("/words/add_multiple")
def add_multiple_words(data: AddMultipleWordsData, background_tasks: BackgroundTasks):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        added_count = 0

        for word in data.words:
            if word.foreign and word.ru:
                # Добавляем юзеру моментально
                database.add_custom_word(data.chat_id, word.foreign, word.ru, specific_lang=target_lang)
                added_count += 1

                # 🔥 Закидываем разметку КАЖДОГО слова в фоновую очередь
                background_tasks.add_task(apply_semantic_markup, word.foreign, word.ru, target_lang, data.chat_id)

        return {
            "success": True,
            "added_count": added_count,
            "semantic_logs": {}  # Приложению больше не нужно ждать логи, они печатаются в терминал сервера
        }
    except Exception as e:
        return {"success": False, "error": str(e)}