import re

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

        meanings = data.meanings or []

        # 1. Если значений еще нет (Шаг 0) — пытаемся их найти
        if not meanings:
            conn = database.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT word_ru FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
                (data.chat_id, target_lang, data.word.strip())
            )
            row = cursor.fetchone()
            conn.close()

            if row and row[0]:
                import re
                # Слово есть в базе, разбиваем значения
                meanings = [m.strip() for m in re.split(r'[,;\|/]', row[0]) if m.strip()]
            else:
                # 🛑 СЛОВА НЕТ В БАЗЕ! Вызываем ИИ-переводчик для извлечения значений
                print(f"🔍 [INTENSITY] Слова '{data.word}' нет в БД. Запрашиваем значения у ИИ...")
                translation_data = ai_service.translate_word_ai(data.word, target_lang, data.chat_id)

                # Достаем список значений из ответа переводчика
                raw_meanings = translation_data.get("details", {}).get("meanings", [])
                meanings = [m["meaning"] for m in raw_meanings if "meaning" in m]

                # Защита от сбоя: если ИИ вернул пустой список, берем просто главный перевод
                if not meanings:
                    meanings = [translation_data.get("translation", data.word)]

        # 2. Выбираем текущее значение на основе шага
        target_meaning = meanings[data.step % len(meanings)] if meanings else None

        # 3. УМНЫЙ ВЫБОР ПРАВИЛА (СЛАБЫЕ МЕСТА ИЛИ СЛУЧАЙНОЕ)
        lang_markers = api.content_engine.MARKERS_DB.get(target_lang, {})
        all_rules = list(lang_markers.keys())

        weaknesses = database.get_active_weaknesses(data.chat_id)

        current_rule = "General Grammar"
        if all_rules:
            # С вероятностью 70% даем правило из слабых мест (если они есть)
            if weaknesses and random.random() < 0.70:
                weak_topics = [w["topic"] for w in weaknesses]
                # Фильтруем, чтобы правило точно существовало в базе маркеров
                valid_weak_topics = [t for t in weak_topics if t in all_rules]

                if valid_weak_topics:
                    current_rule = random.choice(valid_weak_topics)
                else:
                    current_rule = random.choice(all_rules)
            else:
                # 30% шанс (или если слабых мест нет) — случайное новое правило
                current_rule = random.choice(all_rules)

        task_data = ai_service.generate_lego_grammar_task_ai(
            lang_name=lang_name,
            target_word=data.word,
            target_meaning=target_meaning,  # 👈 ИИ получит конкретный смысл
            difficulty=data.difficulty,
            rule=current_rule,
            rule_pattern_tag="default_mix",
            lang=target_lang,
            chat_id=data.chat_id
        )

        if "Error" in task_data.get("foreign_phrase", "") or not task_data.get("foreign_phrase"):
            return {"success": False, "error": "ИИ не смог сгенерировать фразу. Попробуйте другое слово."}

        return {
            "success": True,
            "task": {
                "phrase": task_data.get("foreign_phrase", ""),
                "translation": task_data.get("russian_phrase", ""),
                "rule": current_rule
            },
            "meanings": meanings  # 🔥 ВОЗВРАЩАЕМ МАССИВ ЗНАЧЕНИЙ НА ФРОНТЕНД!
        }
    except Exception as e:
        print(f"❌ Ошибка в /intensity/start: {e}")
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
            rule=data.rule,
            target_word=data.target_word,
            chat_id=data.chat_id
        )
        return {
            "success": True,
            "is_correct": result.get("is_correct", False),
            "feedback": result.get("feedback", "Нет комментария"),
            # 🔥 Пробрасываем правильный вариант на фронтенд
            "correct_phrase": result.get("correct_phrase", data.original_foreign_phrase)
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