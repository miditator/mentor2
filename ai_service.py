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


def ask_ai(prompt: str, temperature: float = 0.7, chat_id: int = None) -> str:
    """
    Универсальная точка запроса к ИИ.
    Сейчас работает на Gemini (из config.ACTIVE_LLM_PROVIDER),
    но сохраняет логику переключения для будущих обновлений.
    """
    # По умолчанию берем глобальный провайдер из config.py
    user_provider = config.ACTIVE_LLM_PROVIDER

    # Если в будущем захотим снова включить выбор для пользователей,
    # этот блок автоматически подхватит их настройки из базы:
    if chat_id:
        user_config = database.get_user_config(chat_id)
        if user_config and user_config.get("ai_provider"):
            # Раскомментируй строку ниже, когда решишь вернуть выбор провайдера:
            # user_provider = user_config.get("ai_provider")
            pass

    provider_config = config.LLM_PROVIDERS.get(user_provider, config.LLM_PROVIDERS[config.ACTIVE_LLM_PROVIDER])
    api_type = provider_config["type"]
    model_name = provider_config["models"]
    api_key = provider_config["api_key"]

    print(f"\n🚀 [AI ROUTER] Запрос от chat_id: {chat_id} | Нейросеть: {user_provider.upper()} ({model_name}) 🚀\n")

    try:
        answer = ""
        if api_type == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=provider_config.get("base_url"))
            response = client.chat.completions.create(model=model_name, messages=[{"role": "user", "content": prompt}], temperature=temperature)
            answer = response.choices[0].message.content.strip()
        elif api_type == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
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

        # 🔥 МАГИЯ СЛАБЫХ МЕСТ: Автоматическая диагностика и лечение
        if chat_id and rule and rule != "General Grammar":
            if parsed_data.get("is_correct"):
                # Ученик ответил верно -> лечим слабое место
                database.heal_weakness(chat_id, rule)
            else:
                # Ученик ошибся -> записываем в слабые места
                database.add_or_update_weakness(chat_id, rule)

        return parsed_data
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

# ==========================================
# ЖИВОЙ ЧАТ С ИИ-МЕНТОРОМ
# ==========================================

def process_live_mentor_chat(chat_id: int, user_text: str) -> str:
    # 1. Достаем все текущие темы пользователя из НОВОЙ базы
    existing_topics = live_chat_database.get_all_user_topics(chat_id)

    # 2. Быстро определяем тему сообщения через роутер
    router_prompt = aiPrompts.dynamic_topic_router_prompt(user_text, existing_topics)
    raw_route = ask_ai(f"[Верни СТРОГО JSON]\n{router_prompt}", temperature=0.1, chat_id=chat_id)

    clean_route = re.sub(r'<think>.*?</think>', '', raw_route, flags=re.DOTALL).strip()
    match = re.search(r'\{.*\}', clean_route, re.DOTALL)

    # По умолчанию ставим needs_stats = False
    route_json = json.loads(match.group(0)) if match else {"topic": "General", "is_new": False, "needs_stats": False}

    topic_title = route_json.get("topic", "General")
    needs_stats = route_json.get("needs_stats", False)

    # 🔥 3. ДОСТАЕМ СТАТИСТИКУ ТОЛЬКО ЕСЛИ ИИ РЕШИЛ, ЧТО ОНА НУЖНА
    user_stats = None
    if needs_stats:
        print(f"📊 [LIVE CHAT] Пользователь запросил стату. Идем в базу database.get_user_daily_stats()")
        user_stats = database.get_user_daily_stats(chat_id)  # Твоя функция из предыдущего шага

    # 4. Загружаем или инициализируем тему
    topic_data = live_chat_database.get_topic_by_title(chat_id, topic_title)
    if not topic_data:
        topic_id = live_chat_database.upsert_user_topic(chat_id, topic_title, "Начало изучения темы",
                                                        "Первое обсуждение")
        topic_data = {"id": topic_id, "title": topic_title, "summary": "Начало темы",
                      "last_checkpoint": "Первое обсуждение"}
    else:
        topic_id = topic_data["id"]

    nodes = live_chat_database.get_topic_nodes(topic_id)
    history = live_chat_database.get_recent_chat_history(chat_id, limit=6)

    # 5. Генерируем ответ Ментора, передавая (или не передавая) статистику
    chat_prompt = aiPrompts.dynamic_mentor_chat_prompt(user_text, topic_data, nodes, history, user_stats)
    raw_response = ask_ai(f"[Верни СТРОГО JSON]\n{chat_prompt}", temperature=0.6, chat_id=chat_id)

    clean_resp = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
    match_resp = re.search(r'\{.*\}', clean_resp, re.DOTALL)

    if match_resp:
        data = json.loads(match_resp.group(0))
        mentor_reply = data.get("reply", "Интересная мысль! Расскажи подробнее.")
        new_summary = data.get("updated_summary", topic_data.get("summary"))
        new_checkpoint = data.get("new_checkpoint", topic_data.get("last_checkpoint"))
        new_node = data.get("new_node")

        # 5. Асинхронно/в базе обновляем состояние темы и чекпоинт
        live_chat_database.upsert_user_topic(chat_id, topic_title, new_summary, new_checkpoint)
        if new_node and isinstance(new_node, dict) and new_node.get("concept"):
            live_chat_database.add_topic_node(
                topic_id=topic_id,
                concept=new_node.get("concept"),
                status=new_node.get("status", "in_progress"),
                details=new_node.get("details", "")
            )
    else:
        mentor_reply = clean_resp

    # 6. Сохраняем сообщения в историю
    live_chat_database.save_chat_message(chat_id, "user", user_text)
    live_chat_database.save_chat_message(chat_id, "assistant", mentor_reply)

    return mentor_reply


def analyze_text_intent(chat_id: int, user_text: str, target_lang: str) -> dict:
    import live_chat_database
    import re

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
        raw_response = ask_ai(prompt, temperature=0.1, chat_id=chat_id)
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
    model_name = "gemini-2.5-flash"  # Оптимальная модель для аудио

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
        print(f"❌ Ошибка в analyze_audio_grammar_gemini: {e}")
        return {
            "ru_translation": transcript,
            "feedback": "Не удалось проанализировать аудио через Gemini.",
            "detected_weakness": None
        }