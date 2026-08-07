from fastapi import APIRouter
import database
import ai_service
import random

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Grammar"])


@router.get("/grammar/new")
@router.get("/grammar/new")
def get_grammar_task(chat_id: int, rule: str, difficulty: str = None):
    try:
        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        final_difficulty = difficulty if difficulty else user_config.get("difficulty", "A1")

        words = database.get_words_for_grammar_context(chat_id, limit=10)
        if words:
            chosen_word = random.choice(words)
            target_word = f"«{chosen_word['foreign']}» (перевод: {chosen_word['ru']})"
        else:
            target_word = "любое базовое слово"

        # 🔥 НОВОЕ: Достаем историю фраз за сегодня
        history = database.get_today_phrases_list(chat_id)

        # 🔥 Передаем историю в сервис
        ru_phrase = ai_service.generate_strict_grammar_task_ai(
            lang_name, target_word, final_difficulty, rule, history=history, chat_id=chat_id
        )

        return {"success": True, "phrase": ru_phrase, "target_word": target_word}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grammar/check")
def check_grammar_task(data: GrammarCheckData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 🔥 Передаем chat_id
        ai_feedback = ai_service.check_task_ai(
            data.original_phrase,
            data.answer,
            lang_name,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
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

        # 🔥 Передаем chat_id
        ai_feedback = ai_service.get_task_help_ai(
            data.original_phrase,
            lang_name,
            data.step,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
        )

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}