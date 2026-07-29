# ==========================================
# ФАЙЛ: api/ai_service.py
# ==========================================
import json
import re
import base64
import io
import PIL.Image
import config
import loader
import aiPrompts
import database  # 🔥 Добавлен импорт для работы с токенами


# Универсальный адаптер для работы с любыми провайдерами
def ask_ai(prompt: str, temperature: float = 0.7, chat_id: int = None) -> str:
    """
    Универсальный адаптер. Сам решает, куда слать запрос,
    и автоматически списывает токены, если передан chat_id.
    """
    # Проверка баланса перед запросом
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config.get("tokens_left", 0) <= 0:
            raise Exception("⚠️ Лимит токенов исчерпан. Пожалуйста, пополните баланс.")

    used_tokens = 0
    text_response = ""

    if loader.API_TYPE == "openai":
        response = loader.ai_client_openai.chat.completions.create(
            model=loader.CURRENT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature
        )
        text_response = response.choices[0].message.content.strip()
        if response.usage:
            used_tokens = response.usage.total_tokens

    elif loader.API_TYPE == "gemini":
        generation_config = {"temperature": temperature}
        response = loader.ai_client_gemini.generate_content(
            prompt,
            generation_config=generation_config
        )
        text_response = response.text.strip()
        if hasattr(response, 'usage_metadata'):
            used_tokens = response.usage_metadata.total_token_count

    # Списание токенов после успешного ответа
    if chat_id and used_tokens > 0:
        database.decrease_tokens(chat_id, used_tokens)

    return text_response


# Модель для распознавания картинок
vision_model = loader.vision_model


def translate_word_ai(word: str, target_lang: str, chat_id: int, is_russian: bool = False):
    if is_russian:
        prompt = aiPrompts.word_translation_from_ru_prompt(word, target_lang)
    else:
        prompt = aiPrompts.word_translation_from_foreign_prompt(word, target_lang)

    answer = ask_ai(prompt, temperature=0.3)

    if answer == "ERROR_NONSENSE":
        return {"error": "nonsense"}

    is_typo = False
    if answer.startswith("TYPO ||"):
        answer = answer.replace("TYPO ||", "").strip()
        is_typo = True

    parts = answer.split("||")

    # 🔥 Убираем случайные квадратные скобки, если ИИ их добавил
    original_word = parts[0].strip().replace("[", "").replace("]", "") if len(parts) > 0 else word

    meanings_data = []

    if len(parts) > 1:
        translation_part = parts[1].strip()

        if "~~~" in translation_part:
            meanings_str, examples_str = translation_part.split("~~~")

            # 🔥 Очищаем значения и примеры от скобок
            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in meanings_str.split("|") if m.strip()]
            examples_list = [e.replace("[", "").replace("]", "").strip() for e in examples_str.split("|") if e.strip()]

            for i in range(len(meanings_list)):
                meanings_data.append({
                    "meaning": meanings_list[i],
                    "example": examples_list[i] if i < len(examples_list) else ""
                })
        else:
            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in translation_part.split("|") if
                             m.strip()]
            for m in meanings_list:
                meanings_data.append({"meaning": m, "example": ""})

    return {
        "original": original_word,
        "translation": meanings_data[0]["meaning"] if meanings_data else "",
        "is_typo": is_typo,
        "details": {
            "word": original_word,
            "transcription": "",
            "part_of_speech": "",
            "meanings": meanings_data
        }
    }


def generate_task_ai(lang_name: str, target_word: str, difficulty: str, history: list, rule: str = "General Grammar",
                     chat_id: int = None) -> tuple[str, str]:
    prompt = aiPrompts.generate_pure_vocabulary_task_prompt_ver2(lang_name, target_word, difficulty, history, rule)
    content = ask_ai(prompt, temperature=0.7, chat_id=chat_id)
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    ru_phrase = lines[0] if lines else "Ошибка генерации"
    return ru_phrase, rule


def get_task_help_ai(original_phrase: str, lang_name: str, step: int, rule=None, target_word=None,
                     chat_id: int = None) -> str:
    prompt = aiPrompts.webapp_task_help_prompt(original_phrase, lang_name, step, rule, target_word)
    return ask_ai(prompt, temperature=0.5, chat_id=chat_id)


def check_task_ai(original_phrase: str, user_answer: str, lang_name: str, rule="General Grammar", target_word=None,
                  chat_id: int = None) -> str:
    prompt = aiPrompts.webapp_task_check_prompt(original_phrase, user_answer, lang_name, rule, target_word)
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)


def start_intensity_ai(word: str, target_lang: str, difficulty: str, meanings: list = None,
                       chat_id: int = None) -> list:
    if meanings is None:
        meanings = []
    prompt = aiPrompts.generate_word_intensity_prompt(word, target_lang, difficulty, meanings)
    raw_json = ask_ai(prompt, temperature=0.5, chat_id=chat_id)
    match = re.search(r'\[.*\]', raw_json, re.DOTALL)
    clean_json = match.group(0) if match else raw_json
    return json.loads(clean_json)


def check_intensity_ai(original_foreign_phrase: str, russian_task_phrase: str, user_answer: str,
                       chat_id: int = None) -> dict:
    prompt = aiPrompts.check_intensity_answer_prompt(
        original_foreign_phrase=original_foreign_phrase,
        russian_task_phrase=russian_task_phrase,
        user_foreign_answer=user_answer
    )
    raw_json = ask_ai(prompt, temperature=0.2, chat_id=chat_id)
    raw_json = raw_json.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_json)


def help_intensity_ai(russian_phrase: str, foreign_phrase: str, chat_id: int = None) -> str:
    prompt = aiPrompts.intensity_help_prompt(russian_phrase, foreign_phrase)
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)


def extract_words_from_image_ai(base64_image: str, target_lang: str, chat_id: int = None) -> list:
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config.get("tokens_left", 0) <= 0:
            raise Exception("⚠️ Лимит токенов исчерпан.")

    prompt = aiPrompts.extract_words_from_image_prompt(target_lang)
    image_bytes = base64.b64decode(base64_image)
    image = PIL.Image.open(io.BytesIO(image_bytes))

    if image.mode != 'RGB':
        image = image.convert('RGB')

    response = vision_model.generate_content([prompt, image])
    ai_text = response.text.strip()

    if chat_id and hasattr(response, 'usage_metadata'):
        used_tokens = response.usage_metadata.total_token_count
        database.decrease_tokens(chat_id, used_tokens)

    if ai_text.startswith("```json"): ai_text = ai_text[7:]
    if ai_text.startswith("```"): ai_text = ai_text[3:]
    if ai_text.endswith("```"): ai_text = ai_text[:-3]

    return json.loads(ai_text.strip())


def transcribe_audio_ai(audio_file_path: str) -> str:
    # Whisper не отдает токены в таком же формате, тарифицируется по секундам.
    # Оставляем функцию без изменений, лимиты здесь лучше считать по времени аудио.
    with open(audio_file_path, "rb") as audio_file:
        transcript = loader.ai_client_openai.audio.transcriptions.create(
            model=config.AUDIO_MODEL,
            file=audio_file
        )
    return transcript.text


def generate_strict_grammar_task_ai(lang_name: str, target_word: str, difficulty: str, specific_rule: str,
                                    chat_id: int = None) -> str:
    prompt = aiPrompts.generate_strict_grammar_prompt(lang_name, target_word, difficulty, specific_rule)
    try:
        full_prompt = f"[Системная инструкция: Ты возвращаешь только 1 строку текста. Никаких Markdown, никаких тегов.]\n\n{prompt}"
        raw_text = ask_ai(full_prompt, temperature=0.3, chat_id=chat_id)
        raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        raw_text = raw_text.replace("```text", "").replace("```", "").strip()
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        return lines[0] if lines else "Ошибка генерации"
    except Exception as e:
        print(f"❌ Ошибка в generate_strict_grammar_task_ai: {e}")
        if "Лимит" in str(e): raise e
        return "Произошла ошибка при составлении задания."


def free_chat_ai(history: list, lang_name: str, chat_id: int = None) -> str:
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config.get("tokens_left", 0) <= 0:
            return "⚠️ Лимит токенов исчерпан. Пожалуйста, пополните баланс."

    system_content = aiPrompts.generate_free_chat_system_prompt(lang_name)

    if loader.API_TYPE == "openai":
        messages = [{"role": "system", "content": system_content}]
        for msg in history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        try:
            response = loader.ai_client_openai.chat.completions.create(
                model=loader.CURRENT_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1024
            )
            raw_text = response.choices[0].message.content.strip()

            if chat_id and response.usage:
                database.decrease_tokens(chat_id, response.usage.total_tokens)

            return re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        except Exception as e:
            print(f"❌ Ошибка в free_chat_ai (OpenAI): {e}")
            return "Извини, я на секунду потерял связь. Повторишь? 😅"

    else:
        chat_history_str = f"Системные инструкции: {system_content}\n\nИстория диалога:\n"
        for msg in history[-10:]:
            role = "Пользователь" if msg.role == "user" else "Ассистент"
            chat_history_str += f"{role}: {msg.content}\n"
        chat_history_str += "Ассистент:"

        try:
            raw_text = ask_ai(chat_history_str, temperature=0.7, chat_id=chat_id)
            return re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        except Exception as e:
            print(f"❌ Ошибка в free_chat_ai (Gemini): {e}")
            if "Лимит" in str(e): return str(e)
            return "Извини, я на секунду потерял связь. Повторишь? 😅"


def get_word_details_ai(word: str, target_lang: str, chat_id: int = None):
    prompt = aiPrompts.get_word_details_prompt(word, target_lang)
    text = ask_ai(prompt, temperature=0.3, chat_id=chat_id)

    if text.startswith("```json"): text = text[7:]
    if text.startswith("```"): text = text[3:]
    if text.endswith("```"): text = text[:-3]

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {
            "transcription": "-",
            "part_of_speech": "Ошибка",
            "forms": "-",
            "meanings": [{"meaning": "Не удалось разобрать ответ ИИ", "example": text}]
        }


def translate_and_extract_words_ai(text: str, target_lang: str, chat_id: int = None) -> dict:
    prompt = (
        f"Переведи следующий текст на русский язык.\n"
        f"Текст ({target_lang}): \"{text}\"\n\n"
        f"Также извлеки из него все значимые слова на языке {target_lang} (переведи их в начальную форму/лемматизируй) и напиши их перевод.\n"
        f"Верни ответ СТРОГО в формате JSON, без оберток Markdown:\n"
        f"{{\n"
        f"  \"translation\": \"красивый литературный перевод всего текста\",\n"
        f"  \"words\": [\n"
        f"    {{\"word\": \"слово\", \"translation\": \"перевод слова\"}}\n"
        f"  ]\n"
        f"}}"
    )
    raw_json = ask_ai(prompt, temperature=0.3, chat_id=chat_id)
    raw_json = raw_json.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw_json)
    except Exception as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return {"translation": "Ошибка обработки текста.", "words": []}