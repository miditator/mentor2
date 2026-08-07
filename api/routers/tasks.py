from fastapi import APIRouter
import database
import ai_service
import random

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Tasks"])

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

        # 🔥 Передаем chat_id
        ru_phrase, final_rule = ai_service.generate_task_ai(lang_name, target_word, difficulty, history, rule,
                                                            chat_id=chat_id)
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

        # 🔥 Передаем chat_id
        ai_feedback = ai_service.get_task_help_ai(
            active["phrase"],
            lang_name,
            data.step,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
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

        # 🔥 Передаем chat_id
        ai_feedback = ai_service.check_task_ai(
            active["phrase"],
            data.answer,
            lang_name,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
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