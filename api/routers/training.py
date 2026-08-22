from fastapi import APIRouter
import database
import json
import random
import aiPrompts
from pydantic import BaseModel
from ai_service import ask_ai  # Убедись, что путь к импорту правильный

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Training"])






@router.get("/train/start")
def start_training(chat_id: int, count: int = 5, source: str = 'user', pos: str = 'mix', mode: str = 'new'):
    try:

        print(f"\n🚀 [API /train/start] Запрос тренировки: chat_id={chat_id}, source={source}, count={count}",
              flush=True)

        # 🔥 ИСПРАВЛЕННЫЙ БЛОК: ФРАЗОВЫЕ ГЛАГОЛЫ (РУССКИЙ В ЗАДАНИИ, ИНОСТРАННЫЕ В ВАРИАНТАХ)

        if source == 'phrasal':
            user_config = database.get_user_config(chat_id)
            current_lang = user_config.get("source_lang", "en") if user_config else "en"

            print(f"\n📦 [API /train/start] Запрос фразовых глаголов для языка: {current_lang}", flush=True)

            # Вызываем нашу новую универсальную функцию из database.py
            words = database.get_phrasal_verbs_by_lang(chat_id, lang=current_lang, limit=count)

            print(f"📦 [API /train/start] Отдаем клиенту слов: {len(words)}", flush=True)
            return {"success": True, "words": words}

        # --- СТАРЫЙ КОД ДЛЯ OXFORD И ЛИЧНОГО СЛОВАРЯ ---
        words = database.get_words_for_training(chat_id, limit=count, mode=mode, source=source, pos=pos)
        result = []

        if source == 'oxford' and words:
            words_to_translate = [{"id": w[0], "foreign": w[1]} for w in words]
            words_json = json.dumps(words_to_translate, ensure_ascii=False)

            prompt = aiPrompts.get_oxford_batch_quiz_prompt(words_json)

            try:
                response_text = ask_ai(prompt, temperature=0.2, chat_id=chat_id)
                cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
                ai_data = json.loads(cleaned_text)
                ai_dict = {item["id"]: item for item in ai_data.get("items", [])}
            except Exception as e:
                print(f"⚠️ Ошибка batch-генерации викторины ИИ: {e}")
                ai_dict = {}

            for w in words:
                word_id, foreign, orig_ru, score = w[0], w[1], w[2], w[3]
                ai_item = ai_dict.get(word_id, {})
                correct_ru = ai_item.get('ru', foreign)
                options = [correct_ru, ai_item.get('wrong1', 'ошибка'), ai_item.get('wrong2', 'сбой')]
                random.shuffle(options)

                result.append({
                    "id": word_id, "foreign": foreign, "ru": correct_ru, "options": options, "score": score
                })

        else:
            for w in words:
                result.append({"id": w[0], "foreign": w[1], "ru": w[2], "score": w[3]})

        return {"success": True, "words": result}
    except Exception as e:
        print(f"❌ Ошибка в start_training: {e}")
        return {"success": False, "error": str(e)}


@router.post("/train/oxford/add_batch")
def add_oxford_batch(data: AddOxfordBatchData):
    try:
        # Превращаем модели Pydantic обратно в список словарей для БД
        words_data = [{"word_id": w.word_id, "foreign": w.foreign, "ru": w.ru} for w in data.words]
        database.add_oxford_words_batch(data.chat_id, words_data)
        return {"success": True}
    except Exception as e:
        print(f"❌ Ошибка в add_oxford_batch: {e}")
        return {"success": False, "error": str(e)}


@router.post("/train/check")
def check_training_answer(data: TrainingAnswerData):
    try:
        mode = getattr(data, 'mode', 'new')
        source = getattr(data, 'source', 'user')
        foreign = getattr(data, 'foreign', '')
        ru = getattr(data, 'ru', '')

        database.update_word_progress(
            chat_id=data.chat_id,
            word_id=data.word_id,
            is_correct=data.is_correct,
            mode=mode,
            source=source,
            foreign=foreign,
            ru=ru
        )
        return {"success": True}
    except Exception as e:
        print(f"❌ Ошибка в check_training_answer: {e}")
        return {"success": False, "error": str(e)}


@router.post("/train/mark_known")
def mark_word_known(data: MarkKnownData):
    try:
        database.mark_word_as_known(data.chat_id, data.word_id, data.word_foreign, data.source)
        return {"success": True}
    except Exception as e:
        print(f"❌ Ошибка в mark_word_known: {e}")
        return {"success": False, "error": str(e)}


@router.post("/train/finish")
def finish_training_session(data: TrainFinishData):
    try:
        database.add_word_completions(data.chat_id, data.count)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}