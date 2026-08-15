from fastapi import APIRouter
import api.content_engine
import database
import ai_service
import random
from api.schemas import *

router = APIRouter(prefix="/api", tags=["Tasks"])

def print_debug_box(title: str, data: dict):
    """Красивая дебаг-функция для вывода параметров и результатов в консоль"""
    print("\n" + "=" * 50)
    print(f"🔍 [DEBUG] {title}")
    print("-" * 50)
    for key, value in data.items():
        print(f"  • {key}: {value}")
    print("=" * 50 + "\n")








@router.post("/tasks/help") # Для других файлов замените URL на /intensity/help и т.д.
def help_task(data: TaskHelpData):
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

@router.post("/tasks/check")
def check_task(data: TaskAnswerData):
    try:
        print_debug_box("POST /tasks/check (INPUT)", data.dict())

        active = database.get_active_task(data.chat_id)
        if not active:
            return {"success": False, "error": "Нет активного задания."}

        reference_phrase = active.get("foreign_phrase", "")

        user_config = database.get_user_config(data.chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        # 🔥 Вызываем новую универсальную функцию (возвращает dict)
        ai_result = ai_service.check_translation_ai(
            original_phrase=active["phrase"],
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
            database.delete_active_task(data.chat_id)
            database.add_successful_completion(data.chat_id)
            result = {"success": True, "is_correct": True, "feedback": f"✅ <b>Отлично! Перевод верный.</b>\n{clean_feedback}"}
        else:
            database.increment_help_count(data.chat_id)
            result = {"success": True, "is_correct": False, "feedback": f"❌ <b>Ошибка:</b>\n{clean_feedback}"}

        print_debug_box("POST /tasks/check (RESULT)", result)
        return result
    except Exception as e:
        print_debug_box("POST /tasks/check (ERROR)", {"error": str(e)})
        return {"success": False, "error": str(e)}



@router.get("/grammar/new-lego")
def get_lego_grammar_task(chat_id: int, rule: str, pattern_tag: str = "default_mix", difficulty: str = None,
                          only_my_vocab: bool = False):
    try:
        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"
        lang_name = "английском" if target_lang == "en" else "немецком"

        final_difficulty = difficulty if difficulty else user_config.get("difficulty", "A1")

        # 🔥 ВЫБОР ИСТОЧНИКА СЛОВА
        if only_my_vocab:
            words = database.get_words_for_grammar_context(chat_id, limit=10)
            raw_target_word = random.choice(words)['foreign'] if words else "server"
        else:
            lang_vocab = api.content_engine.VOCAB_DB.get(target_lang, {})
            level_dict = lang_vocab.get(final_difficulty.upper().replace("А", "A"), {})
            all_level_words = level_dict.get("verbs", []) + level_dict.get("nouns", []) + level_dict.get("adjectives", [])

            if all_level_words:
                chosen_obj = random.choice(all_level_words)

                # 🔥 БРОНЯ: Защитное извлечение данных, независимо от того, что пришло из памяти
                raw_target_word = chosen_obj["word"] if isinstance(chosen_obj, dict) else chosen_obj
                word_id = chosen_obj.get("id", 0) if isinstance(chosen_obj, dict) else 0

                if word_id != 0:
                    database.track_global_word_usage(chat_id, word_id, target_lang)
            else:
                raw_target_word = "server"

        # 🔥 ПРОВЕРКА ЧЕРЕЗ КОНТРОЛЛЕР СЛОВАРЯ
        validation = api.content_engine.check_word_level_and_fallback(raw_target_word, final_difficulty, target_lang)

        target_word = validation["word"] if validation["is_appropriate"] else validation["fallback_word"]
        warning_message = validation.get("message")

        task_data = ai_service.generate_lego_grammar_task_ai(
            lang_name=lang_name,
            target_word=target_word,
            difficulty=final_difficulty,
            rule=rule,
            rule_pattern_tag=pattern_tag,
            lang=target_lang,
            chat_id=chat_id
        )

        ru_phrase = task_data.get("russian_phrase", "Ошибка генерации")
        foreign_phrase = task_data.get("foreign_phrase", "")

        database.save_active_task(chat_id, ru_phrase, rule, foreign_phrase)

        return {
            "success": True,
            "phrase": ru_phrase,
            "target_word": target_word,
            "rule": rule,
            "warning": warning_message
        }
    except Exception as e:
        return {"success": False, "error": str(e)}