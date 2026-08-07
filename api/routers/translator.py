from fastapi import APIRouter
import database
import ai_service
import re
from api.schemas import *

router = APIRouter(prefix="/api", tags=["Translator"])

@router.post("/words/translate")
def translate_word(data: TranslateWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        word_to_translate = data.foreign.strip()
        is_russian = bool(re.search(r'[а-яА-ЯёЁ]', word_to_translate))

        # Передаем chat_id
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

        # 🔥 Передаем chat_id
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


@router.post("/words/add")
def add_word(data: AddWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        is_added = database.add_custom_word(data.chat_id, data.foreign, data.ru, specific_lang=target_lang)
        return {"success": True, "added": is_added}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/words/all")
def get_dictionary(chat_id: int):
    words = database.get_full_dictionary(chat_id)
    return {"success": True, "words": words}

@router.post("/words/from_image")
@router.post("/words/from_image")
def words_from_image(data: ImageWordData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # 🔥 Теперь ИИ возвращает словарь с оригиналом, переводом и словами
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
            # Поддержка разных форматов ИИ (foreign или word)
            word_str = ai_word.get("foreign", ai_word.get("word", "")).lower().strip()
            if "word" in ai_word:
                ai_word["foreign"] = ai_word["word"]  # Нормализация для фронта

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