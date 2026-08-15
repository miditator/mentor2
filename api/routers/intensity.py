from fastapi import APIRouter
import database
import ai_service

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Intensity"])

import random
import api.content_engine
# (Остальные импорты оставляем)

@router.post("/intensity/start")
def start_intensity(data: IntensityStartData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 1. Выбираем одно случайное грамматическое правило для разнообразия
        lang_markers = api.content_engine.MARKERS_DB.get(target_lang, {})
        all_rules = list(lang_markers.keys())
        current_rule = random.choice(all_rules) if all_rules else "General Grammar"

        # 2. Генерируем ОДНУ фразу через наш пуленепробиваемый Lego-движок
        task_data = ai_service.generate_lego_grammar_task_ai(
            lang_name=lang_name,
            target_word=data.word,
            difficulty=data.difficulty,
            rule=current_rule,
            rule_pattern_tag="default_mix",
            lang=target_lang,
            chat_id=data.chat_id
        )

        if "Error" in task_data.get("foreign_phrase", ""):
            return {"success": False, "error": "ИИ не смог сгенерировать фразу. Попробуйте другое слово."}

        # 3. Возвращаем 1 готовую задачу
        return {
            "success": True,
            "task": {
                "phrase": task_data.get("foreign_phrase", ""),
                "translation": task_data.get("russian_phrase", ""),
                "rule": current_rule
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/intensity/check")
def check_intensity(data: IntensityCheckData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        result = ai_service.check_translation_ai(
            original_phrase=data.russian_task_phrase,
            reference_phrase=data.original_foreign_phrase,
            user_answer=data.user_answer,
            lang_name=lang_name,
            rule=data.rule,                 # Берем из запроса
            target_word=data.target_word,   # Берем из запроса
            chat_id=data.chat_id
        )
        return {
            "success": True,
            "is_correct": result.get("is_correct", False),
            "feedback": result.get("feedback", "Нет комментария")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}





@router.post("/intensity/help")
def help_intensity_task(data: IntensityHelpData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 🔥 В интенсиве берем иностранную фразу прямо из запроса, базы тут нет
        reference_phrase = data.reference_phrase

        # Шаг 2+: отдаем готовый ответ без обращения к LLM
        if data.step > 1:
            return {"success": True, "feedback": f"<b>{reference_phrase}</b>"}

        # Шаг 1: Запрашиваем умную подсказку
        ai_feedback = ai_service.get_unified_help_ai(
            russian_phrase=data.original_phrase,
            foreign_phrase=reference_phrase,
            lang_name=lang_name,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
        )

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/intensity/finish")
def finish_intensity(data: IntensityFinishData):
    try:
        result = database.update_word_intensity_progress(data.chat_id, data.word, data.score)
        if data.score > 0:
            for _ in range(data.score):
                database.add_successful_completion(data.chat_id)
        database.add_to_history(data.chat_id, f"Интенсив: {data.word}")
        return {"success": True, "updated": result["updated"]}
    except Exception as e:
        return {"success": False, "error": str(e)}