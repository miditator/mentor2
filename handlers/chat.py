# Файл: handlers/chat.py
import telebot
import database
import ai_service
import re
import live_chat_database
import base64  # 🔥 Добавлено для работы с фото
from loader import bot
# 🔥 Добавили process_image_request в импорты:
from handlers.words import CURRENT_TRAINING, process_translation_request, process_image_request



def is_free_text(message):
    from handlers.buttons import BTN_CHAT, BTN_LEARN, BTN_PRON
    text = message.text
    if not text or text.startswith('/'):
        return False

    # Игнорируем текст с триггером '!' (передаем в handlers/voice.py)
    if text.startswith("!"):
        return False

    # 1. Игнорируем все кнопки меню
    system_buttons = [
        BTN_CHAT, BTN_LEARN, BTN_PRON,
        f"• {BTN_CHAT} •", f"• {BTN_LEARN} •", f"• {BTN_PRON} •"
    ]
    if any(btn in text for btn in system_buttons):
        return False

    # 2. Игнорируем, если идет тренировка слов
    if message.chat.id in CURRENT_TRAINING:
        return False

    # 3. Игнорируем FSM стейты
    state = bot.get_state(message.from_user.id, message.chat.id)
    if state:
        return False

    return True


# ==========================================
# 🔥 ПЕРЕХВАТЧИК ТЕКСТА
# ==========================================
@bot.message_handler(func=is_free_text, content_types=['text'])
def handle_text_translation(message):
    chat_id = message.chat.id
    user_text = message.text.strip()

    # 1. Получаем текущий режим пользователя и язык
    current_mode = live_chat_database.get_user_mode(chat_id)
    user_config = database.get_user_config(chat_id)
    target_lang = user_config.get("source_lang", "en") if user_config else "en"

   
    # --- РЕЖИМ ГРАММАТИКИ (Живой чат + Фиксация ошибок) ---
    if current_mode == "GRAMMAR":
        bot.send_chat_action(chat_id, 'typing')

        # Передаем всё в основной движок чата, он теперь сам всё проанализирует
        reply = process_live_mentor_chat(chat_id, user_text)
        bot.send_message(chat_id, reply, parse_mode="HTML")
        return

    # --- РЕЖИМ ПРОИЗНОШЕНИЯ (Игнорируем текст) ---
    elif current_mode == "PRONUNCIATION":
        bot.send_message(chat_id, "В этом режиме я жду от тебя только голосовые сообщения для проверки акцента! 🎙️")
        return

    # --- СТАНДАРТНЫЙ РЕЖИМ 'ЧАТ' (Маршрутизация интентов) ---
    else:
        bot.send_chat_action(chat_id, 'typing')
        try:
            # Получаем намерение и очищенный текст от ИИ
            router_data = ai_service.analyze_text_intent(chat_id, user_text, target_lang)
            intent = router_data.get("intent")
            clean_text = router_data.get("clean_text", user_text)

            if intent == "CHAT":
                # Передаем текст в живой чат
                reply = process_live_mentor_chat(chat_id, clean_text)
                bot.send_message(chat_id, reply, parse_mode="HTML")

            elif intent == "ANALYSIS":
                # Передаем ИЗВЛЕЧЕННОЕ СЛОВО в переводчик
                process_translation_request(chat_id, clean_text, target_lang, message.from_user.id)

        except Exception as e:
            print(f"❌ Ошибка обработки свободного текста: {e}")
            bot.send_message(chat_id, "Извини, на секунду потерял мысль. Повтори, пожалуйста! 🧠")


# ==========================================
# 🔥 ПЕРЕХВАТЧИК ФОТОГРАФИЙ (РАСПОЗНАВАНИЕ)
# ==========================================
@bot.message_handler(content_types=['photo', 'document'])
def handle_photo(message):
    chat_id = message.chat.id

    # 1. ПРОВЕРКА РЕЖИМА: сканирование картинок разрешено ТОЛЬКО в режиме «Чат»
    current_mode = live_chat_database.get_user_mode(chat_id)
    if current_mode != "CHAT":
        bot.send_message(
            chat_id,
            "⚠️ В этом режиме отправка картинок невозможна.\n"
            "Пожалуйста, перейдите в режим <b>«Чат»</b>, чтобы использовать сканирование изображений.",
            parse_mode="HTML"
        )
        return

    # 2. Получаем язык пользователя из базы
    target_lang = database.get_user_config(chat_id).get("source_lang", "en")

    bot.send_message(chat_id, "📸 Сканирую объекты на фото...")

    try:
        # Определяем file_id (поддерживаем и фото, и файлы-картинки)
        file_id = None
        if message.photo:
            file_id = message.photo[-1].file_id
        elif message.document:
            mime_type = message.document.mime_type or ""
            file_name = message.document.file_name or ""
            if mime_type.startswith("image/") or file_name.lower().endswith(
                    ('.jpg', '.jpeg', '.png', '.webp', '.heic')):
                file_id = message.document.file_id
            else:
                bot.send_message(chat_id, "⚠️ Пожалуйста, отправьте изображение в формате картинки.")
                return

        if not file_id:
            return

        # 1. Скачиваем файл из Telegram
        file_info = bot.get_file(file_id)
        downloaded_file = bot.download_file(file_info.file_path)

        # 2. Конвертируем файл в base64 для Google Vision API
        base64_image = base64.b64encode(downloaded_file).decode('utf-8')

        # 3. Вызываем наш процессор из handlers.words
        process_image_request(chat_id, base64_image, target_lang)
    except Exception as e:
        print(f"❌ Ошибка обработки фото: {e}")
        bot.send_message(chat_id, "⚠️ Возникла ошибка при загрузке картинки. Попробуй отправить еще раз.")

def process_live_mentor_chat(chat_id: int, user_text: str) -> str:
    import time, random
    import database
    import live_chat_database
    from api import content_engine
    import ai_service

    total_start_time = time.time()

    # 1. БД: ТЕМЫ
    existing_topics = live_chat_database.get_all_user_topics(chat_id)

    # 2. РОУТЕР (ИИ)
    route_json = ai_service.analyze_chat_topic(user_text, existing_topics)
    topic_title = route_json.get("topic", "General")
    needs_stats = route_json.get("needs_stats", False)
    search_query = route_json.get("search_query")
    wants_new_rule = route_json.get("wants_new_rule", False)

    # 3. WEB-ПОИСК (Предполагается, что get_web_context остался в ai_service)
    web_context = ai_service.get_web_context(search_query) if search_query else ""

    # 4. БД: СТАТИСТИКА
    user_stats = database.get_user_daily_stats(chat_id) if needs_stats else None
    active_weaknesses = database.get_active_weaknesses(chat_id, limit=5)
    weakness_topics = [w['topic'] for w in active_weaknesses]

    # 5. ВЫБОР ПРАВИЛ
    suggested_rules = None
    if wants_new_rule:
        user_config = database.get_user_config(chat_id) or {}
        target_lang = user_config.get("source_lang", "en")
        difficulty = str(user_config.get("difficulty", "A1")).strip().upper().replace("А", "A")
        all_rules = content_engine.GRAMMAR_RULES_BY_LEVEL.get(target_lang, {}).get(difficulty, [])
        available_rules = [r for r in all_rules if r not in weakness_topics]
        if available_rules:
            suggested_rules = random.sample(available_rules, min(3, len(available_rules)))

    # 6. БД: ИСТОРИЯ
    topic_data = live_chat_database.get_topic_by_title(chat_id, topic_title)
    if not topic_data:
        topic_id = live_chat_database.upsert_user_topic(chat_id, topic_title, "Начало", "Обсуждение")
        topic_data = {"id": topic_id, "title": topic_title, "summary": "Начало", "last_checkpoint": ""}
    else:
        topic_id = topic_data["id"]

    nodes = live_chat_database.get_topic_nodes(topic_id)
    history = live_chat_database.get_recent_chat_history(chat_id, limit=6)

    # 7. ОСНОВНОЙ ИИ-МЕНТОР
    ai_result = ai_service.generate_mentor_reply(
        user_text, topic_data, nodes, history, user_stats, active_weaknesses, suggested_rules, web_context
    )

    # 8. СОХРАНЕНИЕ РЕЗУЛЬТАТОВ (БД)
    mentor_reply = ai_result.get("reply", "Интересная мысль! Расскажи подробнее.")

    live_chat_database.upsert_user_topic(
        chat_id, topic_title,
        ai_result.get("updated_summary", topic_data.get("summary")),
        ai_result.get("new_checkpoint", topic_data.get("last_checkpoint"))
    )

    new_node = ai_result.get("new_node")
    if new_node and isinstance(new_node, dict) and new_node.get("concept"):
        live_chat_database.add_topic_node(topic_id, new_node.get("concept"), new_node.get("status", "in_progress"), new_node.get("details", ""))

    if ai_result.get("detected_weakness"):
        database.add_or_update_weakness(chat_id, ai_result["detected_weakness"])
    if ai_result.get("healed_weakness"):
        database.heal_weakness(chat_id, ai_result["healed_weakness"])

    live_chat_database.save_chat_message(chat_id, "user", user_text)
    live_chat_database.save_chat_message(chat_id, "assistant", mentor_reply)

    print(f"⌛ [TOTAL TIMING] Время: {time.time() - total_start_time:.4f} сек.", flush=True)
    return mentor_reply