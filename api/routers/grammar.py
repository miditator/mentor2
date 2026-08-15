from fastapi import APIRouter
import database
import ai_service
import random

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Grammar"])

import api.content_engine




@router.post("/grammar/check")
def check_grammar_task(data: GrammarCheckData):
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        active = database.get_active_task(data.chat_id)
        reference_phrase = active.get("foreign_phrase", "") if active else ""

        # 🔥 Вызываем новую универсальную функцию (возвращает dict)
        ai_result = ai_service.check_translation_ai(
            original_phrase=data.original_phrase,
            reference_phrase=reference_phrase,
            user_answer=data.answer,
            lang_name=lang_name,
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
        )

        # 🔥 Достаем готовые значения прямо из JSON-словаря
        is_correct = ai_result.get("is_correct", False)
        clean_feedback = ai_result.get("feedback", "Нет комментария")

        if is_correct:
            database.add_successful_completion(data.chat_id)
            return {"success": True, "is_correct": True, "feedback": f"✅ <b>Отлично! Перевод верный.</b>\n{clean_feedback}"}
        else:
            return {"success": True, "is_correct": False, "feedback": f"❌ <b>Ошибка:</b>\n{clean_feedback}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grammar/help") # Для других файлов замените URL на /intensity/help и т.д.
def help_task(data: GrammarHelpData): # Имя схемы (GrammarHelpData) оставляем как было в конкретном файле
    try:
        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # Достаем правильный ответ из активного задания
        active = database.get_active_task(data.chat_id)
        reference_phrase = active.get("foreign_phrase", "") if active else ""

        # 🔥 ЭКОНОМИЯ ТОКЕНОВ: Если это кнопка "Сдаюсь" (шаг 2+), просто отдаем ответ из БД
        if hasattr(data, 'step') and data.step > 1:
            return {"success": True, "feedback": f"<b>{reference_phrase}</b>"}

        # 🔥 Если шаг 1 (Подсказка) — генерируем умный ответ через единую функцию
        ai_feedback = ai_service.get_unified_help_ai(
            russian_phrase=data.original_phrase,
            foreign_phrase=reference_phrase,
            lang_name=lang_name,
            rule=getattr(data, 'rule', None),               # Передаст None, если правила нет (в интенсиве)
            target_word=getattr(data, 'target_word', None), # Передаст None, если слова нет
            chat_id=data.chat_id
        )

        return {"success": True, "feedback": ai_feedback}
    except Exception as e:
        return {"success": False, "error": str(e)}