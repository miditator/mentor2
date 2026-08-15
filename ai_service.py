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
import time
from api import content_engine


def ask_ai(prompt: str, temperature: float = 0.7, chat_id: int = None) -> str:
    user_provider = "groq"
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config and user_config.get("ai_provider"):
            user_provider = user_config.get("ai_provider")

    provider_config = config.LLM_PROVIDERS.get(user_provider, config.LLM_PROVIDERS["groq"])
    api_type = provider_config["type"]
    model_name = provider_config["models"]

    print(f"\n🚀 [AI ROUTER] Запрос от chat_id: {chat_id} | Нейросеть: {user_provider.upper()} ({model_name}) 🚀\n")

    try:
        answer = ""
        if api_type == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=provider_config["api_key"], base_url=provider_config.get("base_url"))
            response = client.chat.completions.create(model=model_name, messages=[{"role": "user", "content": prompt}], temperature=temperature)
            answer = response.choices[0].message.content.strip()
        elif api_type == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=provider_config["api_key"])
            client = genai.GenerativeModel(model_name)
            response = client.generate_content(prompt, generation_config={"temperature": temperature})
            answer = response.text.strip()

        return answer.replace("*", "")
    except Exception as e:
        print(f"❌ Ошибка в ask_ai (Провайдер: {user_provider}): {e}")
        raise e


vision_model = loader.vision_model


def translate_word_ai(word: str, target_lang: str, chat_id: int, is_russian: bool = False):
    prompt = aiPrompts.word_translation_from_ru_prompt(word, target_lang) if is_russian else aiPrompts.word_translation_from_foreign_prompt(word, target_lang)
    answer = ask_ai(prompt, temperature=0.3, chat_id=chat_id)

    if answer.strip() == "ERROR_NONSENSE":
        raise Exception("Это слово не существует или содержит слишком много опечаток. Проверьте правильность написания! 🕵️‍♂️")

    is_typo = False
    if answer.startswith("TYPO ||"):
        answer = answer.replace("TYPO ||", "").strip()
        is_typo = True

    parts = answer.split("||")
    raw_word = parts[0].strip().replace("[", "").replace("]", "") if len(parts) > 0 else word

    original_word = raw_word
    explanation = ""
    match = re.search(r'^(.*?)\s*\((.*?)\)$', raw_word)
    if match:
        original_word = match.group(1).strip()
        explanation = f"{word} — {match.group(2).strip()}"

    meanings_data = []
    if len(parts) > 1:
        translation_part = parts[1].strip()
        if "~~~" in translation_part:
            meanings_str, examples_str = translation_part.split("~~~")
            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in meanings_str.split("|") if m.strip()]
            examples_list = [e.replace("[", "").replace("]", "").strip() for e in examples_str.split("|") if e.strip()]
            for i in range(len(meanings_list)):
                meanings_data.append({"meaning": meanings_list[i], "example": examples_list[i] if i < len(examples_list) else ""})
        else:
            meanings_list = [m.replace("[", "").replace("]", "").strip() for m in translation_part.split("|") if m.strip()]
            for m in meanings_list:
                meanings_data.append({"meaning": m, "example": ""})

    return {
        "original": original_word,
        "translation": meanings_data[0]["meaning"] if meanings_data else "",
        "is_typo": is_typo,
        "details": {"word": original_word, "transcription": "", "part_of_speech": explanation, "meanings": meanings_data, "is_typo": is_typo}
    }


def check_translation_ai(original_phrase: str, reference_phrase: str, user_answer: str, lang_name: str, rule: str,
                         target_word: str, chat_id: int = None) -> dict:
    prompt = aiPrompts.unified_translation_check_prompt(
        original_phrase=original_phrase,
        reference_phrase=reference_phrase,
        user_answer=user_answer,
        lang_name=lang_name,
        rule=rule,
        target_word=target_word
    )

    raw_text = ask_ai(prompt, temperature=0.2, chat_id=chat_id)

    # Очищаем от <think> и markdown
    cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()

    # 2. Ищем JSON внутри блоков кода ```json ... ``` или ``` ... ```
    code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, re.DOTALL)
    if code_block_match:
        json_str = code_block_match.group(1)
    else:
        # 3. Если блоков кода нет, ищем первую '{' и последнюю '}' во всем тексте (отсекая лишние рассуждения ИИ)
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1 and end > start:
            json_str = cleaned[start:end + 1]
        else:
            json_str = cleaned

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON в check_translation_ai: {e}\nОтвет ИИ: {json_str}")
        return {"is_correct": False, "feedback": "Произошла ошибка при анализе ответа. Попробуйте еще раз."}







def get_unified_help_ai(russian_phrase: str, foreign_phrase: str, lang_name: str, rule: str = None, target_word: str = None, chat_id: int = None) -> str:
    prompt = aiPrompts.unified_help_prompt(russian_phrase, foreign_phrase, lang_name, rule, target_word)
    # Температура 0.3 даст стабильный и четкий ответ без лишней воды
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)










def extract_words_from_image_ai(base64_image: str, target_lang: str, chat_id: int = None) -> dict:


    prompt = aiPrompts.extract_words_from_image_prompt(target_lang)
    image_bytes = base64.b64decode(base64_image)
    image = PIL.Image.open(io.BytesIO(image_bytes))
    if image.mode != 'RGB': image = image.convert('RGB')

    response = vision_model.generate_content([prompt, image])
    ai_text = response.text.strip()



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
        transcript = loader.ai_client_openai.audio.transcriptions.create(model=config.AUDIO_MODEL, file=audio_file)
    return transcript.text




def free_chat_ai(history: list, lang_name: str, chat_id: int = None) -> str:
    is_error_chat = any("У меня вопрос по моей ошибке" in msg.content for msg in history)
    system_content = aiPrompts.error_analysis_chat_prompt(lang_name) if is_error_chat else aiPrompts.generate_free_chat_system_prompt(lang_name)

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
        return {"transcription": "-", "part_of_speech": "Ошибка", "forms": "-", "meanings": [{"meaning": "Не удалось разобрать ответ ИИ", "example": text}]}


def translate_and_extract_words_ai(text: str, target_lang: str, chat_id: int = None) -> dict:
    prompt = aiPrompts.translate_and_extract_text_prompt(text, target_lang)
    raw_json = ask_ai(prompt, temperature=0.3, chat_id=chat_id).replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw_json)
    except Exception as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return {"translation": "Ошибка обработки текста.", "words": []}


def get_ai_identity(chat_id: int = None) -> str:
    prompt = aiPrompts.debug_ai_identity_prompt()
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)


def get_error_analysis_ai(message: str, lang_name: str, chat_id: int = None) -> str:
    system_prompt = aiPrompts.error_analysis_chat_prompt(lang_name)
    full_prompt = f"Системные инструкции: {system_prompt}\n\nСообщение пользователя:\n{message}"
    try:
        raw_text = ask_ai(full_prompt, temperature=0.4, chat_id=chat_id)
        return re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
    except Exception as e:
        print(f"❌ Ошибка в get_error_analysis_ai: {e}")
        return "Произошла ошибка при анализе. Попробуйте еще раз."


def generate_lego_grammar_task_ai(lang_name: str, target_word: str, difficulty: str, rule: str,
                                  rule_pattern_tag: str = "default_mix", lang: str = "en",
                                  chat_id: int = None) -> dict:
    total_start_time = time.time()

    db_start_time = time.time()
    marker_stats = database.get_grammar_usage_stats(chat_id, "marker") if chat_id else {}
    bg_stats = database.get_grammar_usage_stats(chat_id, "background") if chat_id else {}

    payload = content_engine.generate_task_payload(
        target_word=target_word,
        rule_name=rule,
        rule_pattern_tag=rule_pattern_tag,
        user_level=difficulty,
        lang=lang,
        marker_stats=marker_stats,
        bg_stats=bg_stats
    )

    t_word = payload["target_word"]
    r_name = payload["rule_name"].split(':')[0].strip()

    lang_markers = content_engine.MARKERS_DB.get(lang, {})
    rule_data = lang_markers.get(payload["rule_name"], {})
    available_markers = rule_data.get("markers", [])

    if available_markers:
        marker = content_engine.pick_least_used(available_markers, marker_stats, count=1)[0]
    else:
        marker = payload.get("mandatory_marker")

    bg_raw = payload["background_words"]

    diff_upper = difficulty.strip().upper().replace("А", "A")
    if diff_upper in ["A1", "A2"]:
        bg_words = bg_raw[:2]
    elif diff_upper in ["B1", "B2"]:
        bg_words = bg_raw[:4]
    else:
        bg_words = bg_raw[:5]

    print(f"✂️ [AI SERVICE] Фоновые слова ({diff_upper}): {bg_words}")
    print(f"⏱️ [TIMING] БД: {time.time() - db_start_time:.4f} сек.")

    prompt = aiPrompts.generate_lego_task_prompt(
        lang_name=lang_name, target_word=t_word, rule_name=r_name,
        mandatory_marker=marker, background_words=bg_words, difficulty=difficulty
    )

    try:
        ai_creator_start = time.time()

        full_prompt = f"[Системная инструкция: Верни результат СТРОГО в формате JSON. Рассуждения пиши только внутри тега <think>, а за его пределами выведи чистый JSON объект без markdown блоков кода.]\n\n{prompt}"

        # 🔥 ЛОГИРОВАНИЕ ПРОМПТА
        print("\n" + "🧠" * 35)
        print("🧠 [FINAL AI PROMPT] ОТПРАВЛЯЕМ В НЕЙРОСЕТЬ:")
        print(full_prompt)
        print("🧠" * 35 + "\n")

        raw_text = ask_ai(full_prompt, temperature=0.5, chat_id=chat_id)
        print(f"⏱️ [TIMING] Создатель: {time.time() - ai_creator_start:.4f} сек.")

        # 🔥 НОВЫЙ БЛОК: ЛОГИРОВАНИЕ СЫРОГО ОТВЕТА ОТ ИИ
        print("\n" + "🤖" * 35)
        print("🤖 [AI RAW RESPONSE] ПОЛУЧЕНО ОТ НЕЙРОСЕТИ:")
        print(raw_text)
        print("🤖" * 35 + "\n")

        # 1. Удаляем теги рассуждений ИИ
        cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()

        # 2. Надежно извлекаем JSON из текста
        code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, re.DOTALL)
        if code_block_match:
            json_str = code_block_match.group(1)
        else:
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = cleaned[start:end + 1]
            else:
                json_str = cleaned

        final_json = json.loads(json_str)

        # 3. Трекинг использования маркеров и фоновых слов в БД
        if chat_id:
            if marker:
                database.track_grammar_usage(chat_id, marker, "marker")
            for bg_id in payload.get("used_background_ids", []):
                database.track_grammar_usage(chat_id, bg_id, "background")

        print(f"⏱️ [TIMING] ✨ ИТОГО: {time.time() - total_start_time:.4f} сек.\n")
        return final_json

    except Exception as e:
        print(f"❌ Ошибка в generate_lego_grammar_task_ai: {e}")
        raise Exception(f"{str(e)}")


def classify_word_semantic_ai(word: str, translation: str, chat_id: int = None) -> list:
    prompt = aiPrompts.semantic_classification_prompt(word, translation)

    raw_text = ask_ai(prompt, temperature=0.1, chat_id=chat_id)
    clean_json = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip().replace("```json", "").replace(
        "```", "").strip()

    try:
        data = json.loads(clean_json)
        return data.get("tags", [])
    except Exception as e:
        print(f"❌ Ошибка парсинга JSON семантики: {e}")
        return []
