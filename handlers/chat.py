# Файл: handlers/chat.py
import telebot
import database
import ai_service
import re  # 🔥 Добавили библиотеку для проверки языка
from loader import bot
from handlers.words import CURRENT_TRAINING, process_translation_request


def is_free_text(message):
    text = message.text
    if not text or text.startswith('/'):
        return False

    # Игнорируем текст с триггером '!' (передаем в handlers/voice.py)
    if text.startswith("!"):
        return False

    # 1. Игнорируем все кнопки меню
    system_buttons = [
        "🎯 Новое задание", "⚙️ Настройки", "📚 Тренировать слова",
        "➕ Добавить слово", "🔥 Интенсив по слову",
        "🚪 Выход из тренировки", "🚪 Назад в меню"
    ]
    if text in system_buttons:
        return False

    # 2. Игнорируем, если идет тренировка слов
    if message.chat.id in CURRENT_TRAINING:
        return False

    # 3. Игнорируем FSM стейты
    state = bot.get_state(message.from_user.id, message.chat.id)
    if state:
        return False

    return True


@bot.message_handler(func=is_free_text, content_types=['text'])
def handle_text_translation(message):
    chat_id = message.chat.id
    user_text = message.text.strip()

    bot.send_chat_action(chat_id, 'typing')

    try:
        user_config = database.get_user_config(chat_id)
        target_lang = user_config.get("source_lang", "en") if user_config else "en"

        # Получаем и намерение, и очищенный текст от ИИ
        router_data = ai_service.analyze_text_intent(chat_id, user_text, target_lang)
        intent = router_data["intent"]
        clean_text = router_data["clean_text"]

        if intent == "CHAT":
            # Передаем оригинальный или очищенный текст в живой чат
            reply = ai_service.process_live_mentor_chat(chat_id, clean_text)
            bot.send_message(chat_id, reply, parse_mode="HTML")

        elif intent == "ANALYSIS":
            # Передаем ИЗВЛЕЧЕННОЕ СЛОВО (например, просто "accomplish") в переводчик
            process_translation_request(chat_id, clean_text, target_lang, message.from_user.id)

    except Exception as e:
        print(f"❌ Ошибка обработки свободного текста: {e}")
        bot.send_message(chat_id, "Извини, на секунду потерял мысль. Повтори, пожалуйста! 🧠")