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
import database


# Универсальный адаптер для работы с любыми провайдерами
def ask_ai(prompt: str, temperature: float = 0.7, chat_id: int = None) -> str:
    user_provider = "groq"  # Значение по умолчанию

    # 1. Узнаем, какую сеть выбрал юзер
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config and user_config.get("ai_provider"):
            user_provider = user_config.get("ai_provider")

    # 2. Получаем настройки конкретного провайдера из конфига
    provider_config = config.LLM_PROVIDERS.get(user_provider, config.LLM_PROVIDERS["groq"])
    api_type = provider_config["type"]
    model_name = provider_config["model"]

    print(f"\n🚀 [AI ROUTER] Запрос от chat_id: {chat_id} | Нейросеть: {user_provider.upper()} ({model_name}) 🚀\n")

    try:
        # Универсальный обработчик для всех OpenAI-совместимых сетей (Groq, GPT-OSS и др.)
        if api_type == "openai":
            from openai import OpenAI
            client = OpenAI(
                api_key=provider_config["api_key"],
                base_url=provider_config.get("base_url")
            )
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature
            )
            return response.choices[0].message.content.strip()

        # Обработчик для Gemini
        elif api_type == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=provider_config["api_key"])
            client = genai.GenerativeModel(model_name)

            generation_config = {"temperature": temperature}
            response = client.generate_content(
                prompt,
                generation_config=generation_config
            )
            return response.text.strip()

    except Exception as e:
        print(f"❌ Ошибка в ask_ai (Провайдер: {user_provider}): {e}")
        raise e


# Модель для распознавания картинок
vision_model = loader.vision_model


def translate_word_ai(word: str, target_lang: str, chat_id: int, is_russian: bool = False):
    if is_russian:
        prompt = aiPrompts.word_translation_from_ru_prompt(word, target_lang)
    else:
        prompt = aiPrompts.word_translation_from_foreign_prompt(word, target_lang)

    answer = ask_ai(prompt, temperature=0.3, chat_id=chat_id)

    if answer == "ERROR_NONSENSE":
        return {"error": "nonsense"}

    is_typo = False
    if answer.startswith("TYPO ||"):
        answer = answer.replace("TYPO ||", "").strip()
        is_typo = True

    parts = answer.split("||")

    # Убираем случайные квадратные скобки
    raw_word = parts[0].strip().replace("[", "").replace("]", "") if len(parts) > 0 else word

    # 🔥 НОВАЯ ЛОГИКА: Вытаскиваем пояснение и склеиваем его с исходным словом пользователя
    original_word = raw_word
    explanation = ""
    match = re.search(r'^(.*?)\s*\((.*?)\)$', raw_word)
    if match:
        original_word = match.group(1).strip()
        # Добавляем само слово, которое ввел юзер, перед пояснением
        explanation = f"{word} — {match.group(2).strip()}"

    meanings_data = []

    if len(parts) > 1:
        translation_part = parts[1].strip()

        if "~~~" in translation_part:
            meanings_str, examples_str = translation_part.split("~~~")

            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in meanings_str.split("|") if m.strip()]
            examples_list = [e.replace("[", "").replace("]", "").strip() for e in examples_str.split("|") if e.strip()]

            for i in range(len(meanings_list)):
                meanings_data.append({
                    "meaning": meanings_list[i],
                    "example": examples_list[i] if i < len(examples_list) else ""
                })
        else:
            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in translation_part.split("|") if m.strip()]
            for m in meanings_list:
                meanings_data.append({"meaning": m, "example": ""})

    return {
        "original": original_word,
        "translation": meanings_data[0]["meaning"] if meanings_data else "",
        "is_typo": is_typo,
        "details": {
            "word": original_word,
            "transcription": "",
            "part_of_speech": explanation, # 🔥 Теперь тут будет: "went — Past Simple от went"
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


def extract_words_from_image_ai(base64_image: str, target_lang: str, chat_id: int = None) -> dict:
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config.get("tokens_left", 0) <= 0:
            raise Exception("⚠️ Лимит токенов исчерпан.")

    # 🔥 Вызываем промпт из отдельного файла
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

    # Очистка от возможных Markdown-оберток
    if ai_text.startswith("```json"): ai_text = ai_text[7:]
    if ai_text.startswith("```"): ai_text = ai_text[3:]
    if ai_text.endswith("```"): ai_text = ai_text[:-3]

    try:
        return json.loads(ai_text.strip())
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON из картинки: {e}")
        return {"original": "", "translation": "", "words": []}


def transcribe_audio_ai(audio_file_path: str) -> str:
    with open(audio_file_path, "rb") as audio_file:
        transcript = loader.ai_client_openai.audio.transcriptions.create(
            model=config.AUDIO_MODEL,
            file=audio_file
        )
    return transcript.text


def generate_strict_grammar_task_ai(lang_name: str, target_word: str, difficulty: str, specific_rule: str, history: list = None, chat_id: int = None) -> str:
    # 🔥 НОВОЕ: Передаем историю в промпт
    prompt = aiPrompts.generate_strict_grammar_prompt(lang_name, target_word, difficulty, specific_rule, history)
    try:
        full_prompt = f"[Системная инструкция: Ты возвращаешь только 1 строку текста. Никаких Markdown, никаких тегов.]\n\n{prompt}"
        raw_text = ask_ai(full_prompt, temperature=0.3, chat_id=chat_id)
        raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        raw_text = raw_text.replace("```text", "").replace("```", "").strip()
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        return lines[0] if lines else "Ошибка генерации"
    except Exception as e:
        print(f"❌ Ошибка в generate_strict_grammar_task_ai: {e}")
        return "Произошла ошибка при составлении задания."


def free_chat_ai(history: list, lang_name: str, chat_id: int = None) -> str:
    # 🔥 АВТО-ПЕРЕКЛЮЧЕНИЕ ПРОМПТА: Проверяем, есть ли в истории диалога маркер разбора ошибки
    is_error_chat = any("У меня вопрос по моей ошибке" in msg.content for msg in history)

    if is_error_chat:
        system_content = aiPrompts.error_analysis_chat_prompt(lang_name)
    else:
        system_content = aiPrompts.generate_free_chat_system_prompt(lang_name)

    # Формируем историю в виде текста
    chat_history_str = f"Системные инструкции: {system_content}\n\nИстория диалога:\n"
    for msg in history[-10:]:
        role = "Пользователь" if msg.role == "user" else "Ассистент"
        chat_history_str += f"{role}: {msg.content}\n"
    chat_history_str += "Ассистент:"

    try:
        raw_text = ask_ai(chat_history_str, temperature=0.7, chat_id=chat_id)
        return re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
    except Exception as e:
        print(f"❌ Ошибка в free_chat_ai: {e}")
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
    # 🔥 Теперь мы берем промпт из файла aiPrompts.py
    prompt = aiPrompts.translate_and_extract_text_prompt(text, target_lang)

    raw_json = ask_ai(prompt, temperature=0.3, chat_id=chat_id)
    raw_json = raw_json.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw_json)
    except Exception as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return {"translation": "Ошибка обработки текста.", "words": []}


def get_ai_identity(chat_id: int = None) -> str:
    """Функция для отладки, которая опрашивает ИИ о его личности."""
    prompt = aiPrompts.debug_ai_identity_prompt()
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)


def get_error_analysis_ai(message: str, lang_name: str, chat_id: int = None) -> str:
    """Функция для одиночного вопроса по ошибке без сохранения контекста чата."""
    system_prompt = aiPrompts.error_analysis_chat_prompt(lang_name)

    # Формируем итоговый запрос, объединяя инструкции и сообщение пользователя
    full_prompt = f"Системные инструкции: {system_prompt}\n\nСообщение пользователя:\n{message}"

    try:
        raw_text = ask_ai(full_prompt, temperature=0.4, chat_id=chat_id)
        # Очищаем от тегов размышлений, если провайдер их вернул
        return re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
    except Exception as e:
        print(f"❌ Ошибка в get_error_analysis_ai: {e}")
        return "Произошла ошибка при анализе. Попробуйте еще раз."