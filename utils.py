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
        try:
            current_state = TIMER_STATES.get(chat_id, "stopped")
            if current_state == "stopped":
                break

            if current_state == "paused":
                time.sleep(5)
                continue

            now = time.time()
            last_time = LAST_TASK_TIME.get(chat_id, now)

            # Если прошло меньше интервала, спим дальше
            if now - last_time < config.TASK_INTERVAL:
                time.sleep(5)
                continue

            # Отправляем викторину слов
            if not GENERATION_LOCKS.get(chat_id):
                GENERATION_LOCKS[chat_id] = True
                try:
                    send_text_task(chat_id)
                except Exception as e:
                    print(f"🔴 Ошибка в цикле таймера для {chat_id}: {e}")
                finally:
                    GENERATION_LOCKS[chat_id] = False
                    LAST_TASK_TIME[chat_id] = time.time()
            else:
                time.sleep(5)
        except Exception as err:
            print(f"🔴 Критическая ошибка в потоке таймера: {err}")
            time.sleep(5)


def get_task_markup():
    """Специальная клавиатура для грамматического задания (только кнопка в приложение)"""
    markup = InlineKeyboardMarkup()

    # 🔥 Добавляем параметр ?page=task к ссылке и убираем лишние кнопки
    deep_link_url = WEB_APP_URL + "?page=task"
    btn_app = InlineKeyboardButton(text="🚀 Открыть в приложении", web_app=WebAppInfo(url=deep_link_url))
    markup.row(btn_app)
    return markup


def send_text_task(chat_id):
    """Оставляет только викторину слов из словаря"""
    LAST_TASK_TIME[chat_id] = time.time()

    success = send_quiz_task(chat_id)
    if not success:
        # Если в словаре недостаточно слов для викторины, можно мягко подсказать пользователю
        try:
            bot.send_message(
                chat_id,
                "⚠️ В твоем словаре пока недостаточно слов для викторины (нужно минимум 3). Добавь новые слова через приложение! 📚",
                parse_mode="HTML"
            )
        except Exception:
            pass


def send_quiz_task(chat_id):
    """Задание Б: Викторина на перевод слова из словаря с интервальным повторением"""
    user_config = database.get_user_config(chat_id)
    target_lang = user_config.get("source_lang", "en") if user_config else "en"
    lang_label = "Английский" if target_lang == "en" else "Немецкий"

    # 🔥 1. Умная выборка: берем ТОЛЬКО 1 слово, время повторения которого пришло
    target_words = database.get_words_for_training(chat_id, limit_new=1)
    if not target_words:
        return False

    # Распаковываем кортеж из get_words_for_training (id, word_foreign, word_ru, score)
    target_id, target_foreign, target_ru, _ = target_words[0]

    # 🔥 2. Получаем 2 неправильных варианта для кнопок
    # Чтобы не нагружать БД, запрашиваем весь словарь и отфильтровываем целевое слово
    all_words = database.get_full_dictionary(chat_id, specific_lang=target_lang)
    wrong_options = [w for w in all_words if w['id'] != target_id]

    if len(wrong_options) < 2:
        return False  # Мало слов для вариантов ответа

    chosen_wrong = random.sample(wrong_options, min(2, len(wrong_options)))

    # 3. Собираем варианты ответа и перемешиваем
    options = [target_foreign] + [w['foreign'] for w in chosen_wrong]
    random.shuffle(options)

    # 4. Создаем инлайн-кнопки с передачей ID слова
    markup = InlineKeyboardMarkup(row_width=1)
    for opt in options:
        is_correct = (opt == target_foreign)
        # Формат: "qans_1_123" (где 1 = True, 0 = False, 123 = word_id)
        cb_data = f"qans_1_{target_id}" if is_correct else f"qans_0_{target_id}"
        markup.add(InlineKeyboardButton(text=str(opt).capitalize(), callback_data=cb_data))

    bot.send_message(
        chat_id,
        f"⏱ <b>Минутка для перевода:</b>\n«{target_ru}»",
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