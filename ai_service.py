# ==========================================
# ФАЙЛ: api/ai_service.py
# ==========================================
import json
import re
import base64
import io
import PIL.Image
import google.generativeai as genai
import config
import loader
import aiPrompts

# Инициализируем Gemini для фото один раз при запуске сервиса

vision_model = loader.vision_model


def translate_word_ai(word: str, target_lang: str) -> dict:
    """Отправляет слово на перевод ИИ и парсит кастомный формат ответов словаря."""
    prompt = aiPrompts.word_translation_prompt(word, target_lang)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    answer = response.choices[0].message.content.strip()

    if answer == "ERROR_NONSENSE":
        return {"error": "nonsense"}

    is_typo = False
    if answer.startswith("TYPO ||"):
        parts = answer.split("||")
        if len(parts) >= 3:
            original_word = parts[1].strip()
            translation = parts[2].strip()
            is_typo = True
    else:
        parts = answer.split("||")
        original_word = parts[0].strip()
        translation = parts[1].strip() if len(parts) > 1 else ""

    return {
        "original": original_word,
        "translation": translation,
        "is_typo": is_typo
    }


def generate_task_ai(lang_name: str, target_word: str, difficulty: str, history: list) -> tuple[str, str]:
    """Генерирует грамматическое задание вокруг целевого слова."""
    prompt = aiPrompts.generate_pure_vocabulary_task_prompt_ver2(lang_name, target_word, difficulty, history)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    content = response.choices[0].message.content.strip()
    lines = [line.strip() for line in content.split('\n') if line.strip()]

    ru_phrase = lines[0]
    rule = lines[1] if len(lines) > 1 else "General Grammar"
    return ru_phrase, rule


def get_task_help_ai(original_phrase: str, lang_name: str, step: int) -> str:
    """Получает подсказку или готовый ответ для грамматического задания."""
    prompt = aiPrompts.webapp_task_help_prompt(original_phrase, lang_name, step)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )
    return response.choices[0].message.content.strip()


def check_task_ai(original_phrase: str, user_answer: str, lang_name: str,rule="General Grammar") -> str:
    """Проверяет ответ пользователя на грамматическое задание."""
    prompt = aiPrompts.webapp_task_check_prompt(original_phrase, user_answer, lang_name,rule)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


def start_intensity_ai(word: str, target_lang: str) -> list:
    """Генерирует 5 прогрессивных фраз для режима Интенсив."""
    prompt = aiPrompts.generate_word_intensity_prompt(word, target_lang)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )
    raw_json = response.choices[0].message.content.strip()

    # Очистка от markdown JSON-разметки
    match = re.search(r'\[.*\]', raw_json, re.DOTALL)
    clean_json = match.group(0) if match else raw_json

    return json.loads(clean_json)


def check_intensity_ai(original_foreign_phrase: str, russian_task_phrase: str, user_answer: str) -> dict:
    """Проверяет перевод фразы в режиме Интенсив."""
    prompt = aiPrompts.check_intensity_answer_prompt(
        original_foreign_phrase=original_foreign_phrase,
        russian_task_phrase=russian_task_phrase,
        user_foreign_answer=user_answer
    )

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    raw_json = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw_json)


def help_intensity_ai(russian_phrase: str, foreign_phrase: str) -> str:
    """Возвращает грамматический разбор для Интенсива при сдаче."""
    prompt = aiPrompts.intensity_help_prompt(russian_phrase, foreign_phrase)

    response = loader.ai_client.chat.completions.create(
        model=config.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


def extract_words_from_image_ai(base64_image: str, target_lang: str) -> list:
    """Обрабатывает base64 картинку через Gemini Vision и возвращает список найденных слов."""
    prompt = aiPrompts.extract_words_from_image_prompt(target_lang)

    # Декодируем картинку из Base64
    image_bytes = base64.b64decode(base64_image)
    image = PIL.Image.open(io.BytesIO(image_bytes))

    # Принудительно убираем альфа-канал прозрачности (защита от падения Gemini)
    if image.mode != 'RGB':
        image = image.convert('RGB')

    response = vision_model.generate_content([prompt, image])
    ai_text = response.text.strip()

    # Очистка маркдауна
    if ai_text.startswith("```json"):
        ai_text = ai_text[7:]
    if ai_text.startswith("```"):
        ai_text = ai_text[3:]
    if ai_text.endswith("```"):
        ai_text = ai_text[:-3]

    return json.loads(ai_text.strip())

# Добавь в api/ai_service.py

def transcribe_audio_ai(audio_file_path: str) -> str:
    """Отправляет аудио-файл в Whisper и возвращает текст."""
    with open(audio_file_path, "rb") as audio_file:
        transcript = loader.ai_client.audio.transcriptions.create(
            model=config.AUDIO_MODEL,
            file=audio_file
        ),
    return transcript.text


def generate_strict_grammar_task_ai(lang_name: str, target_word: str, difficulty: str, specific_rule: str) -> str:
    """Генерирует 1 строку на русском языке строго по заданному правилу грамматики."""

    # 🔥 Вызываем промпт из отдельного файла
    prompt = aiPrompts.generate_strict_grammar_prompt(lang_name, target_word, difficulty, specific_rule)

    try:
        response = loader.ai_client.chat.completions.create(
            model=config.MODEL,
            messages=[
                {"role": "system",
                 "content": "Ты возвращаешь только 1 строку текста. Никаких Markdown, никаких тегов."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2048
        )

        raw_text = response.choices[0].message.content.strip()

        # Зачищаем мысли (для reasoning моделей вроде Qwen)
        raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        raw_text = raw_text.replace("```text", "").replace("```", "").strip()

        # Если модель все же выдала список, берем первую строку
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

        return lines[0] if lines else "Ошибка генерации"

    except Exception as e:
        print(f"❌ Ошибка в generate_strict_grammar_task_ai: {e}")
        return "Произошла ошибка при составлении задания."


import re
import aiPrompts


def free_chat_ai(history: list, lang_name: str) -> str:
    """Свободный диалог с учетом истории сообщений."""
    system_content = aiPrompts.generate_free_chat_system_prompt(lang_name)

    # 1. Сначала ставим системные правила
    messages = [{"role": "system", "content": system_content}]

    # 2. Затем добавляем историю переписки (ограничим 10 последними сообщениями для экономии токенов)
    for msg in history[-10:]:
        # FastAPI/Pydantic оборачивает данные в объекты, поэтому достаем поля через точку
        messages.append({"role": msg.role, "content": msg.content})

    try:
        response = loader.ai_client.chat.completions.create(
            model=config.MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024
        )

        raw_text = response.choices[0].message.content.strip()
        raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        return raw_text

    except Exception as e:
        print(f"❌ Ошибка в free_chat_ai: {e}")
        return "Извини, я на секунду потерял связь. Повторишь? 😅"