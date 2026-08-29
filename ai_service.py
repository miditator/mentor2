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
import live_chat_database


def ask_ai(prompt: str, temperature: float = 0.7, chat_id: int = None, use_search: bool = False,
           override_model: str = None) -> str:
    """
    Универсальная точка запроса к ИИ.
    use_search=True включает доступ в Google Поиск для Gemini.
    override_model позволяет принудительно использовать быструю модель (например, для роутера).
    """
    import config
    user_provider = config.ACTIVE_LLM_PROVIDER

    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config and user_config.get("ai_provider"):
            pass

    provider_config = config.LLM_PROVIDERS.get(user_provider, config.LLM_PROVIDERS[config.ACTIVE_LLM_PROVIDER])
    api_type = provider_config["type"]

    # 🔥 Строгая привязка модели: берем override_model, если передан, иначе из конфига провайдера
    model_name = override_model if override_model else provider_config["models"]
    api_key = provider_config["api_key"]

    try:
        answer = ""
        if api_type == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=provider_config.get("base_url"))
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature
            )
            answer = response.choices[0].message.content.strip()

        elif api_type == "gemini":
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            # Формируем конфигурацию вызова
            gen_config = {"temperature": temperature}

            # 🔥 Включаем Google Search ТОЛЬКО если use_search=True
            if use_search:
                gen_config["tools"] = [types.Tool(google_search=types.GoogleSearch())]

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**gen_config)
            )
            answer = response.text.strip()

        return answer.replace("*", "")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Ошибка в ask_ai (Провайдер: {user_provider}, Модель: {model_name}): {error_msg}")

        # 🔥 Мягкий перехват лимитов Gemini (429)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return '{"reply": "⚠️ <b>Превышен лимит запросов к ИИ.</b> Google Gemini требует подождать пару минут, прежде чем продолжить.", "translation": "⚠️ Лимит запросов ИИ", "words": [], "is_correct": false}'

        return '{"reply": "⚠️ Произошла непредвиденная ошибка при обращении к ИИ.", "translation": "Ошибка ИИ", "words": [], "is_correct": false}'





def translate_word_ai(word: str, target_lang: str, chat_id: int, is_russian: bool = False):
    import re
    import aiPrompts

    lang_name = "АНГЛИЙСКОМУ" if target_lang == 'en' else "НЕМЕЦКОМУ"

    # 1. Формируем промпт с жестким запретом на чужие языки
    if is_russian:
        prompt = aiPrompts.word_translation_from_ru_prompt(word, target_lang)
    else:
        base_prompt = aiPrompts.word_translation_from_foreign_prompt(word, target_lang)
        # 🔥 Добавляем "Анти-Полиглот" броню прямо к промпту
        prompt = f"{base_prompt}\n\n[КРИТИЧЕСКОЕ ПРАВИЛО]: Если слово '{word}' объективно НЕ существует в {lang_name} языке (например, это слово из другого языка вроде 'warum' для английского), ты ОБЯЗАН вернуть ровно одну строку: ERROR_WRONG_LANGUAGE"

    # Снижаем температуру до 0.1, чтобы ИИ был максимально строгим словарем
    answer = ask_ai(prompt, temperature=0.1, chat_id=chat_id)

    # 2. Аккуратно перехватываем ошибки и возвращаем их текстом
    if answer.strip() == "ERROR_WRONG_LANGUAGE":
        return {"error": "wrong_language"}
    if answer.strip() == "ERROR_NONSENSE":
        return {"error": "nonsense"}

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

    print(f"\n" + "=" * 60)
    print(f"🕵️‍♂️ [RULE AUDIT LOG] Проверка перевода для chat_id: {chat_id}")
    print(f"   • Правило (тема): '{rule}'")
    print(f"   • Исходное задание: '{original_phrase}'")
    print(f"   • Ответ пользователя: '{user_answer}'")
    print(f"------------------------------------------------------------")
    print(f"🤖 Сырой ответ ИИ (включая <think>):\n{raw_text}")
    print(f"=" * 60 + "\n")

    cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
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

    try:
        parsed_data = json.loads(json_str)

        if chat_id and rule and rule != "General Grammar":
            is_correct = parsed_data.get("is_correct", False)
            rule_followed = parsed_data.get("rule_followed", True)

            print(f"📊 [WEAKNESS ANALYZER RESULTS]")
            print(f"   • Общий вердикт (is_correct): {is_correct}")
            print(f"   • Аудит правила (rule_followed): {rule_followed}")
            print(f"   • Комментарий (feedback): {parsed_data.get('feedback')}")

            if is_correct:
                database.heal_weakness(chat_id, rule)
                print(f"   💊 [HEAL] Слабое место '{rule}' подлечено.")
            else:
                if not rule_followed:
                    database.add_or_update_weakness(chat_id, rule)
                    print(f"   ⚠️ [WEAKNESS ADDED] Ошибка в самом правиле! Слабое место зафиксировано.")
                else:
                    print(f"   🛡️ [PROTECTION] Ошибка в лексике, но правило соблюдено. Слабое место НЕ ухудшено.")

        return parsed_data
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON в check_translation_ai: {e}\nОтвет ИИ: {json_str}")
        return {"is_correct": False, "feedback": "Произошла ошибка при анализе ответа. Попробуйте еще раз."}





def get_unified_help_ai(russian_phrase: str, foreign_phrase: str, lang_name: str, rule: str = None, target_word: str = None, chat_id: int = None) -> str:
    prompt = aiPrompts.unified_help_prompt(russian_phrase, foreign_phrase, lang_name, rule, target_word)
    # Температура 0.3 даст стабильный и четкий ответ без лишней воды
    return ask_ai(prompt, temperature=0.3, chat_id=chat_id)


def extract_words_from_image_ai(base64_image: str, target_lang: str, chat_id: int = None) -> dict:
    from google import genai
    import config
    import aiPrompts

    prompt = aiPrompts.extract_words_from_image_prompt(target_lang)
    image_bytes = base64.b64decode(base64_image)
    image = PIL.Image.open(io.BytesIO(image_bytes))
    if image.mode != 'RGB': image = image.convert('RGB')

    # 🔥 Используем новый SDK (как и во всем остальном проекте)
    client = genai.Client(api_key=config.GEMINI_KEY)
    response = client.models.generate_content(
        model=config.VISION_MODEL,
        contents=[prompt, image]
    )
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
    from openai import OpenAI
    import config

    # 1. ЖЕСТКО берем конфиг Groq для аудио (игнорируем ACTIVE_LLM_PROVIDER)
    groq_config = config.LLM_PROVIDERS.get("groq")
    if not groq_config or not groq_config.get("api_key"):
        raise Exception("Ключ Groq не найден в config.LLM_PROVIDERS. Для Whisper нужен ключ!")

    # 2. Создаем клиент библиотеки OpenAI, но направляем его на сверхбыстрые сервера Groq
    client = OpenAI(
        api_key=groq_config["api_key"],
        base_url=groq_config.get("base_url")
    )

    # 3. Берем твою модель из конфига ("whisper-large-v3")
    model_name = getattr(config, 'AUDIO_MODEL', 'whisper-large-v3')

    # 4. Моментально расшифровываем аудио
    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=model_name,
            file=audio_file
        )

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
                                  chat_id: int = None, target_meaning: str = None) -> dict:
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
    ai_rule_instruction = content_engine.AI_RULE_INSTRUCTIONS_EN.get(
        payload["rule_name"],
        payload["rule_name"]  # Если инструкции нет, оставляем оригинальное название
    )

    lang_markers = content_engine.MARKERS_DB.get(lang, {})
    rule_data = lang_markers.get(payload["rule_name"], {})
    available_markers = rule_data.get("markers", [])

    if available_markers:
        print(f"\n🎯 [MARKER SELECTION] Выбор маркера для правила: '{payload['rule_name']}'")
        print(f"   • Доступные маркеры в базе: {available_markers}")

        # Показываем только стату по тем маркерам, которые сейчас нужны
        relevant_stats = {m: marker_stats.get(m, 0) for m in available_markers}
        print(f"   • Статистика пользователя по ним: {relevant_stats}")

        marker = content_engine.pick_least_used(available_markers, marker_stats, count=1)[0]
        print(f"   ✅ Выбран наименее используемый маркер: '{marker}'\n")
    else:
        marker = payload.get("mandatory_marker")
        print(f"\n🎯 [MARKER SELECTION] Маркеры в MARKERS_DB не найдены. Используем фолбэк: '{marker}'\n")

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

    task_theme = payload.get("target_theme", "Общая лексика")

    prompt = aiPrompts.generate_lego_task_prompt(
        lang_name=lang_name, target_word=t_word,
        rule_name=ai_rule_instruction,  # 👈 ПЕРЕДАЕМ ИИ ИНСТРУКЦИЮ!
        mandatory_marker=marker, background_words=bg_words, difficulty=difficulty,
        theme=task_theme,target_meaning=target_meaning
    )

    try:
        # --- ЭТАП 1: СОЗДАТЕЛЬ ---
        ai_creator_start = time.time()

        full_prompt = f"[Системная инструкция: Верни результат СТРОГО в формате JSON. Рассуждения пиши только внутри тега <think>, а за его пределами выведи чистый JSON объект без markdown блоков кода.]\n\n{prompt}"

        print("\n" + "🧠" * 35)
        print("🧠 [FINAL AI PROMPT] ОТПРАВЛЯЕМ В НЕЙРОСЕТЬ (СОЗДАТЕЛЬ):")
        print(full_prompt)
        print("🧠" * 35 + "\n")

        raw_text = ask_ai(full_prompt, temperature=0.5, chat_id=chat_id)
        print(f"⏱️ [TIMING] Создатель: {time.time() - ai_creator_start:.4f} сек.")

        print("\n" + "🤖" * 35)
        print("🤖 [AI RAW RESPONSE] ПОЛУЧЕНО ОТ НЕЙРОСЕТИ (СОЗДАТЕЛЬ):")
        print(raw_text)
        print("🤖" * 35 + "\n")

        # Очистка и парсинг ответа Создателя
        cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
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

        # --- ЭТАП 2: ВАЛИДАТОР (ЛИТЕРАТУРНЫЙ РЕДАКТОР) ---
        english_phrase = final_json.get("foreign_phrase", "")
        draft_russian = final_json.get("russian_phrase", "")

        if english_phrase and draft_russian:
            val_start_time = time.time()
            print("\n" + "✍️" * 35)
            print("✍️ [VALIDATOR AI] ПРОВЕРКА И УЛУЧШЕНИЕ РУССКОГО ПЕРЕВОДА:")
            print(f"   • Оригинал (EN): {english_phrase}")
            print(f"   • Черновик (RU): {draft_russian}")

            validator_prompt = aiPrompts.translation_validator_prompt(english_phrase, draft_russian, ai_rule_instruction)
            val_full_prompt = f"[Системная инструкция: Верни результат СТРОГО в формате JSON без markdown блоков кода.]\n\n{validator_prompt}"

            val_raw_text = ask_ai(val_full_prompt, temperature=0.1, chat_id=chat_id)
            print(f"⏱️ [TIMING] Валидатор: {time.time() - val_start_time:.4f} сек.")

            val_cleaned = re.sub(r'<think>.*?</think>', '', val_raw_text, flags=re.DOTALL).strip()
            val_code_block = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', val_cleaned, re.DOTALL)
            if val_code_block:
                val_json_str = val_code_block.group(1)
            else:
                val_start = val_cleaned.find('{')
                val_end = val_cleaned.rfind('}')
                if val_start != -1 and val_end != -1 and val_end > val_start:
                    val_json_str = val_cleaned[val_start:val_end + 1]
                else:
                    val_json_str = val_cleaned

            try:
                val_data = json.loads(val_json_str)
                final_russian = val_data.get("russian_phrase", draft_russian)
                final_json["russian_phrase"] = final_russian
                print(f"   ✅ Улучшенный перевод: {final_russian}")
            except Exception as e:
                print(f"❌ Ошибка парсинга JSON валидатора: {e}. Оставляем черновой перевод.")

            print("✍️" * 35 + "\n")

        # --- ЭТАП 3: ТРЕКИНГ В БД ---
        if chat_id:
            if marker:
                database.track_grammar_usage(chat_id, marker, "marker")
            for bg_id in payload.get("used_background_ids", []):
                database.track_grammar_usage(chat_id, bg_id, "background")

        print(f"⏱️ [TIMING] ✨ ИТОГО (Создатель + Валидатор): {time.time() - total_start_time:.4f} сек.\n")
        
        # 🔥 ДОБАВЛЯЕМ СТАТИСТИКУ ДЛЯ "РЕНТГЕНА ЗАДАНИЯ"
        final_json["xray"] = {
            "rule": payload["rule_name"],
            "target_word": t_word,
            "theme": task_theme,
            "bg_words": bg_words,
            "marker": marker,
            "time": round(time.time() - total_start_time, 2)
        }

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





# ==========================================
# ДОБАВИТЬ В ai_service.py
# ==========================================

def get_web_context(query: str, max_results: int = 3) -> str:
    """Ищет информацию в DuckDuckGo и возвращает сжатый текст для Gemini."""
    if not query or query.lower() == "none" or query.lower() == "null":
        return ""
    try:
        from ddgs import DDGS
        print(f"🌍 [WEB SEARCH] Ищу в DuckDuckGo: '{query}'")
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

        if not results:
            return ""

        context = "СВЕЖАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА (Используй её для ответа, если она релевантна):\n"
        for r in results:
            context += f"- {r.get('body')}\n"
        return context + "\n"
    except Exception as e:
        print(f"❌ [WEB SEARCH ERROR] Ошибка поиска: {e}")
        return ""

# ==========================================
# ЖИВОЙ ЧАТ С ИИ-МЕНТОРОМ
# ==========================================


def analyze_chat_topic(user_text: str, existing_topics: list) -> dict:



    router_start = time.time()
    router_prompt = aiPrompts.dynamic_topic_router_prompt(user_text, existing_topics)

    raw_route = ask_ai(
        f"[Верни СТРОГО JSON]\n{router_prompt}",
        temperature=0.1,
        override_model=config.ROUTER_MODEL
    )
    print(f"   ⏱ [Тайминг] Роутер: {time.time() - router_start:.4f} сек.", flush=True)

    clean_route = re.sub(r'<think>.*?</think>', '', raw_route, flags=re.DOTALL).strip()
    match = re.search(r'\{.*\}', clean_route, re.DOTALL)

    if match:
        return json.loads(match.group(0))
    return {"topic": "General", "is_new": False, "needs_stats": False, "search_query": None, "wants_new_rule": False}


def generate_mentor_reply(user_text: str, topic_data: dict, nodes: list, history: list,
                          user_stats: dict = None, active_weaknesses: list = None,
                          suggested_rules: list = None, web_context: str = "") -> dict:

    from google import genai
    from google.genai import types

    chat_prompt = aiPrompts.dynamic_mentor_chat_prompt(
        user_text, topic_data, nodes, history, user_stats, active_weaknesses, suggested_rules
    )

    if web_context:
        chat_prompt = f"{web_context}\n{chat_prompt}"

    llm_start = time.time()
    try:
        print(f"🧠 [LLM REQUEST] Отправка запроса ИИ-ментору...", flush=True)
        client = genai.Client(api_key=config.GEMINI_KEY)
        response = client.models.generate_content(
            model=config.LIVE_CHAT_MODEL,
            contents=f"[Верни СТРОГО JSON]\n{chat_prompt}",
            config=types.GenerateContentConfig(temperature=0.6)
        )
        raw_response = response.text.replace("*", "")
    except Exception as e:
        print(f"❌ [LIVE CHAT ERROR] {e}", flush=True)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            return {"reply": "⚠️ <b>Превышен лимит запросов к ИИ.</b> Подожди пару минут."}
        return {"reply": "⚠️ Извини, небольшая заминка с сетью. Можешь повторить?"}

    print(f"   ⏱ [Тайминг] Основной ИИ: {time.time() - llm_start:.4f} сек.", flush=True)

    clean_resp = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
    match_resp = re.search(r'\{.*\}', clean_resp, re.DOTALL)

    if match_resp:
        return json.loads(match_resp.group(0))
    return {"reply": clean_resp}


def analyze_text_intent(chat_id: int, user_text: str, target_lang: str) -> dict:
    import live_chat_database


    clean_text = user_text.strip()

    # ====================================================
    # 🔥 1. ПРИОРИТЕТНЫЙ ПЕРЕХВАТЧИК КОМАНД
    # ====================================================
    # Проверяем, начинается ли текст (^) со слов-маркеров
    trigger_pattern = r'^(озвучь(те)?\s*(мне)?\s*(фразу)?|переведи(те)?|как сказать( на .*?)?)\b'

    if re.search(trigger_pattern, clean_text, re.IGNORECASE):
        # Вырезаем маркер, оставляем саму фразу
        text_to_translate = re.sub(trigger_pattern, '', clean_text, flags=re.IGNORECASE).strip()
        text_to_translate = re.sub(r'^(пожалуйста|на английский|на немецкий)\s+', '', text_to_translate,
                                   flags=re.IGNORECASE).strip()

        # Если после слова "переведи" ничего нет
        if not text_to_translate:
            return {"intent": "CHAT", "clean_text": "Что именно перевести?"}

        return {"intent": "VOICE_OVER", "clean_text": text_to_translate}

    # ====================================================
    # 🔥 2. МАРШРУТИЗАЦИЯ ПО ЯЗЫКУ
    # ====================================================
    has_cyrillic = bool(re.search(r'[А-Яа-яЁёІіЇїЄєҐґ]', clean_text))
    word_count = len(clean_text.split())

    # Если маркеров в начале не было, а кириллица есть — это обычный чат
    if has_cyrillic:
        return {"intent": "CHAT", "clean_text": clean_text}

    # 1-2 иностранных слова — это анализ (словарь)
    if not has_cyrillic and word_count <= 2:
        return {"intent": "ANALYSIS", "clean_text": clean_text}

    # ====================================================
    # 3. НЕПОНЯТНЫЙ ИНОСТРАННЫЙ ТЕКСТ -> СПРАШИВАЕМ ИИ
    # ====================================================
    history = live_chat_database.get_recent_chat_history(chat_id, limit=4)
    chat_history_str = "Диалог только начат."
    if history:
        chat_history_str = ""
        for msg in history:
            prefix = "Пользователь" if msg['role'] == "user" else "Ментор"
            chat_history_str += f"{prefix}: {msg['content']}\n"

    prompt = aiPrompts.get_text_intent_prompt(clean_text, chat_history_str, target_lang)

    try:
        import config
        # 🔥 Используем быструю модель для роутера
        raw_response = ask_ai(prompt, temperature=0.1, chat_id=chat_id, override_model=config.ROUTER_MODEL)

        clean_json = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
        clean_json = clean_json.replace("```json", "").replace("```", "").strip()

        data = json.loads(clean_json)
        return {
            "intent": data.get("intent", "ANALYSIS"),
            "clean_text": data.get("clean_text", clean_text)
        }
    except Exception as e:
        print(f"❌ Ошибка в analyze_text_intent: {e}")
        return {"intent": "ANALYSIS", "clean_text": clean_text}


def analyze_audio_grammar_gemini(file_path: str, transcript: str, target_lang: str, chat_id: int = None) -> dict:
    from google import genai
    from google.genai import types
    import config
    import json
    import re

    # Жестко используем Gemini, так как нам нужна его мультимодальность (умение слушать аудио)
    provider_config = config.LLM_PROVIDERS.get("gemini")
    api_key = provider_config["api_key"]
    model_name = config.ANALYZE_AUDIO_MODEL  # Оптимальная модель для аудио

    client = genai.Client(api_key=api_key)
    lang_name = "английском" if target_lang == "en" else "немецком"

    prompt = f"""Ты — заботливый языковой ментор. Ученик произнес фразу на {lang_name} языке.
Я прикрепил аудиофайл с его голосом. Текст, который распознала система: "{transcript}"

Сделай полный анализ его произношения и грамматики.
АЛГОРИТМ:
1. Переведи фразу на русский.
2. ПРОСЛУШАЙ АУДИО. Оцени качество произношения (акцент, правильность звуков, интонацию).
3. Проверь грамматику в сказанной фразе.
4. Если есть серьезная ошибка, выяви слабую тему.

Верни СТРОГО JSON без markdown:
{{
    "ru_translation": "Точный перевод на русский язык",
    "feedback": "Подробный разбор произношения и грамматики. Укажи на ошибки или похвали.",
    "detected_weakness": "Название грамматической темы (например 'Past Simple'), в которой допущена ошибка. Если ошибок нет - null."
}}"""

    try:
        # Загружаем аудиофайл напрямую в сервера Google
        uploaded_file = client.files.upload(file=file_path)

        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, uploaded_file],
            config=types.GenerateContentConfig(temperature=0.3)
        )

        cleaned_text = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', response.text, flags=re.DOTALL).strip()
        start = cleaned_text.find('{')
        end = cleaned_text.rfind('}')
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start:end + 1]

        return json.loads(cleaned_text)
    except Exception as e:
        import traceback
        print(f"❌ [CRITICAL AUDIO ERROR] Ошибка в analyze_audio_grammar_gemini: {e}")
        traceback.print_exc()  # Выведет точную строку и причину в консоль
        return {
            "ru_translation": transcript,
            "feedback": f"Ошибка связи с Gemini: {str(e)}",
            "detected_weakness": None
        }

# 🔥 Быстрая оперативная память для сравнения произношения (не засоряет БД)
PRONUNCIATION_MEMORY = {}





def analyze_audio_pronunciation_gemini(file_path: str, transcript: str, target_lang: str, chat_id: int = None) -> dict:
    from google import genai
    from google.genai import types


    print(f"\n" + "🎙️" * 30)
    print(f"🎙️ [PRONUNCIATION LOG] НАЧАЛО АНАЛИЗА ДЛЯ chat_id: {chat_id}")

    # 1. Достаем краткий список прошлых ошибок из ОЗУ
    past_errors = PRONUNCIATION_MEMORY.get(chat_id, "")
    print(f"   • Ошибки из прошлой попытки (память): {past_errors if past_errors else '[Нет прошлой памяти / Первая попытка]'}")

    provider_config = config.LLM_PROVIDERS.get("gemini")
    api_key = provider_config["api_key"]
    model_name = config.ANALYZE_AUDIO_MODEL

    client = genai.Client(api_key=api_key)
    lang_name = "английском" if target_lang == "en" else "немецком"

    prompt = aiPrompts.pronunciation_analysis_prompt(transcript, lang_name, past_errors)
    print(f"   • Сгенерированный промпт отправлен в модель {model_name}")

    try:
        uploaded_file = client.files.upload(file=file_path)

        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, uploaded_file],
            config=types.GenerateContentConfig(temperature=0.2)
        )

        raw_resp = response.text
        print(f"   • Сырой ответ от Gemini:\n{raw_resp}")

        clean_response_text = raw_resp.replace("*", "")

        cleaned_text = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', clean_response_text, flags=re.DOTALL).strip()
        start = cleaned_text.find('{')
        end = cleaned_text.rfind('}')
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start:end + 1]

        data = json.loads(cleaned_text)

        # 2. Сохраняем новые ошибки в память
        new_core_errors = data.get('core_errors', '')
        if chat_id:
            PRONUNCIATION_MEMORY[chat_id] = new_core_errors
            print(f"   ✅ Новые ошибки записаны в память для chat_id {chat_id}: {new_core_errors}")

        print(f"🎙️ [PRONUNCIATION LOG] АНАЛИЗ УСПЕШНО ЗАВЕРШЕН")
        print("🎙️" * 30 + "\n")

        return data
    except Exception as e:
        print(f"❌ Ошибка в analyze_audio_pronunciation_gemini: {e}")
        print("🎙️" * 30 + "\n")
        return {
            "recognized_text": "-",
            "ru_translation": transcript,
            "feedback": "Не удалось проанализировать произношение через Gemini.",
            "core_errors": ""
        }

def analyze_text_grammar_ai(text: str, target_lang: str, chat_id: int = None) -> dict:
            import json
            import re
            import aiPrompts

            # 🔥 Генерируем промпт через наш генератор
            prompt = aiPrompts.text_grammar_analysis_prompt(text, target_lang)

            raw_text = ask_ai(prompt, temperature=0.2, chat_id=chat_id)

            cleaned_text = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', raw_text, flags=re.DOTALL).strip()
            start = cleaned_text.find('{')
            end = cleaned_text.rfind('}')
            if start != -1 and end != -1:
                cleaned_text = cleaned_text[start:end + 1]

            try:
                return json.loads(cleaned_text)
            except Exception as e:
                print(f"❌ Ошибка в analyze_text_grammar_ai: {e}")
                return {"ru_translation": text, "feedback": "Не удалось проанализировать грамматику.",
                        "detected_weakness": None}


def batch_classify_semantic_ai(words_data: list, chat_id: int = None) -> dict:
    """Массово классифицирует неразмеченные слова по макро-кластерам."""
    import config
    import json
    import re
    import time
    import aiPrompts

    # Формируем список: "apple (яблоко), run (бежать)"
    words_list_str = ", ".join([f"{item['word']} ({item['translation']})" for item in words_data])

    prompt = aiPrompts.batch_semantic_classification_prompt(words_list_str)

    print(f"\n🧠 [BATCH AI] Отправляем {len(words_data)} слов на ИИ-сортировку...", flush=True)
    print(f"   • Модель: {config.ROUTER_MODEL}", flush=True)
    start_time = time.time()

    try:
        # Используем быструю модель-роутер для мгновенной сортировки
        raw_text = ask_ai(f"[Верни СТРОГО JSON]\n{prompt}", temperature=0.1, chat_id=chat_id,
                          override_model=config.ROUTER_MODEL)

        clean_json = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
        clean_json = clean_json.replace("```json", "").replace("```", "").strip()

        result = json.loads(clean_json)

        print(f"   ⏱ [Тайминг] AI-сортировка завершена за {time.time() - start_time:.4f} сек.", flush=True)
        print(f"   ✅ [BATCH AI] Успешно размечено слов: {len(result)}", flush=True)

        return result
    except Exception as e:
        print(f"   ❌ [BATCH AI ERROR] Ошибка: {e}", flush=True)
        return {}