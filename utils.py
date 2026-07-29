import time
import random
import threading
import json
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

import config
import database
import aiPrompts
from loader import bot
import keyboard
from ai_service import ask_ai

GENERATION_LOCKS = {}
TIMER_STATES = {}
LAST_TASK_TIME = {}  # 🔥 Новый словарь для отслеживания времени
WEB_APP_URL = "https://mentorapp.duckdns.org/"


def start_or_resume_timer(chat_id):
    """Включает или возобновляет таймер для пользователя"""
    if TIMER_STATES.get(chat_id) == "active":
        return
    if TIMER_STATES.get(chat_id) == "paused":
        TIMER_STATES[chat_id] = "active"
        LAST_TASK_TIME[chat_id] = time.time()  # Сбрасываем время при снятии с паузы
        print(f"⏰ Таймер для {chat_id} ВОЗОБНОВЛЕН.")
        return

    TIMER_STATES[chat_id] = "active"
    LAST_TASK_TIME[chat_id] = time.time()  # Начинаем отсчет
    print(f"⏰ Фоновый таймер для {chat_id} ЗАПУЩЕН.")
    threading.Thread(target=send_question_timer_loop, args=(chat_id,), daemon=True).start()


def pause_timer(chat_id):
    """Ставит таймер на паузу (например, на время тренировки слов)"""
    TIMER_STATES[chat_id] = "paused"
    print(f"⏸ Таймер для {chat_id} ПОСТАВЛЕН НА ПАУЗУ.")


def send_question_timer_loop(chat_id):
    """Умный цикл, который проверяет время каждые 5 секунд"""
    while True:
        current_state = TIMER_STATES.get(chat_id, "stopped")
        if current_state == "stopped":
            break

        if current_state == "paused":
            time.sleep(5)
            continue

        now = time.time()
        last_time = LAST_TASK_TIME.get(chat_id, now)

        # Если прошло меньше 2 часов (TASK_INTERVAL), просто спим дальше
        if now - last_time < config.TASK_INTERVAL:
            time.sleep(5)
            continue

        # Если 2 часа прошло, проверяем, не генерирует ли бот задание вручную прямо сейчас
        if not GENERATION_LOCKS.get(chat_id):
            GENERATION_LOCKS[chat_id] = True
            try:
                # 🔥 Жесткая проверка: если в базе ДЕЙСТВИТЕЛЬНО есть активное задание
                current_active = database.get_active_task(chat_id)
                if current_active is not None:
                    try:
                        bot.send_message(chat_id,
                                         "⏰ <b>Не забудь решить текущее задание!</b> Ментор ждет твой перевод.",
                                         parse_mode="HTML")
                    except Exception:
                        pass
                else:
                    # Если задания нет (решил в приложении), просто генерируем новое или ждем
                    send_text_task(chat_id)
            finally:
                GENERATION_LOCKS[chat_id] = False
                LAST_TASK_TIME[chat_id] = time.time()
        else:
            time.sleep(5)  # Если юзер жмет кнопки, отступаем и ждем


def get_task_markup():
    """Специальная клавиатура для грамматического задания (только кнопка в приложение)"""
    markup = InlineKeyboardMarkup()

    # 🔥 Добавляем параметр ?page=task к ссылке и убираем лишние кнопки
    deep_link_url = WEB_APP_URL + "?page=task"
    btn_app = InlineKeyboardButton(text="🚀 Открыть в приложении", web_app=WebAppInfo(url=deep_link_url))
    markup.row(btn_app)
    return markup


def send_text_task(chat_id):
    """Главная функция-маршрутизатор: выбирает между викториной и фразой (50% / 50%)"""

    # 🔥 КРИТИЧЕСКИ ВАЖНО: Если юзер запросил задание вручную, сбрасываем время таймера!
    LAST_TASK_TIME[chat_id] = time.time()

    # Шансы: 50% (фраза), 50% (викторина слова). Фан-факт полностью убран.
    task_type = random.choices(['grammar', 'quiz'], weights=[50, 50], k=1)[0]

    if task_type == 'quiz':
        success = send_quiz_task(chat_id)
        if success:
            return
        task_type = 'grammar'  # Фолбэк, если в словаре мало слов

    # Если выпала 'grammar' или сработал фолбэк
    send_grammar_task(chat_id)


def send_quiz_task(chat_id):
    """Задание Б: Викторина на перевод слова из словаря (без лишних кнопок)"""
    user_config = database.get_user_config(chat_id)
    target_lang = user_config.get("source_lang", "en") if user_config else "en"
    lang_label = "Английского" if target_lang == "en" else "Немецкого"

    words = database.get_full_dictionary(chat_id, specific_lang=target_lang)
    if len(words) < 3:
        return False  # Недостаточно слов для вариантов ответа

    chosen_words = random.sample(words, 3)
    target_word = chosen_words[0]
    options = [w[1] for w in chosen_words]
    random.shuffle(options)

    # 🔥 Оставляем исключительно инлайн-кнопки с вариантами ответа
    markup = InlineKeyboardMarkup(row_width=1)
    for opt in options:
        cb_data = "quiz_T" if opt == target_word[1] else "quiz_F"
        markup.add(InlineKeyboardButton(text=opt.capitalize(), callback_data=cb_data))

    bot.send_message(
        chat_id,
        f"🧠 <b>Викторина из словаря!</b>\nКак переводится слово <b>{target_word[0]}</b> с {lang_label.lower()}?",
        reply_markup=markup,
        parse_mode="HTML"
    )
    return True


def send_grammar_task(chat_id):
    """Задание А: Классическая грамматическая фраза (только кнопка открытия в приложении)"""
    user_config = database.get_user_config(chat_id)
    target_lang = user_config.get("source_lang", "en")
    lang_name = "английский" if target_lang == "en" else "немецкий"

    diff_from_db = user_config.get("difficulty", "2")
    try:
        diff_key = int(diff_from_db)
        pretty_diff = keyboard.DIFFICULTY.get(diff_key, f"Уровень {diff_from_db}")
    except ValueError:
        pretty_diff = diff_from_db

    words = database.get_words_for_grammar_context(chat_id, limit=1)
    history = database.get_today_phrases_list(chat_id)

    if not words:
        return

    target_word_ru = words[0]['ru']
    target_word_foreign = words[0]['foreign']

    try:
        prompt = aiPrompts.generate_pure_vocabulary_task_prompt_ver2(
            lang_name=lang_name,
            target_word=target_word_ru,
            difficulty=pretty_diff,
            history=history,
            rule="General Grammar"
        )
        raw_text = ask_ai(prompt, temperature=0.4)
        ru_phrase = raw_text.replace('"', '').replace('`', '').strip()

        database.save_active_task(chat_id, ru_phrase, "General Grammar")
        database.add_to_history(chat_id, ru_phrase)

        bot.send_message(
            chat_id,
            f"🤖 <b>Новое задание на основе твоего словаря!</b>\n"
            f"🎯 Уровень сложности: <code>{pretty_diff}</code>\n"
            f"💡 Используем слово: <b>{target_word_foreign}</b>\n\n"
            f"👉 <code>{ru_phrase}</code>\n\n"
            f"<b>Переведи это предложение на {lang_name} язык 👇</b>",
            reply_markup=get_task_markup(),
            parse_mode="HTML"
        )

    except Exception as e:
        print(f"🔴 Ошибка генерации контекстного таска: {e}")