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
LAST_TASK_TIME = {}
PENDING_QUIZ = {}
WEB_APP_URL = "https://mentorapp.duckdns.org/"
REMINDER_DELAY = 3600

def clear_pending_quiz(chat_id):
    if chat_id in PENDING_QUIZ:
        del PENDING_QUIZ[chat_id]

def send_fun_fact_reminder(chat_id, word):
    try:
        prompt = (f"Найди один короткий, неочевидный или забавный реальный факт "
                  f"о происхождении или использовании слова '{word}'. "
                  f"Напиши живо и увлекательно, максимум 2 предложения, без лишних приветствий.")
        fact = ask_ai(prompt, temperature=0.7, chat_id=chat_id)
        bot.send_message(
            chat_id,
            f"👀 Эй, викторина всё еще ждет твоего ответа!\n\n"
            f"А пока ты думаешь, вот интересный факт о слове <b>{word}</b>:\n\n"
            f"<i>{fact}</i>",
            parse_mode="HTML"
        )
    except Exception as e:
        print(f"🔴 Ошибка при генерации факта: {e}")

def start_or_resume_timer(chat_id):
    if TIMER_STATES.get(chat_id) == "active": return
    if TIMER_STATES.get(chat_id) == "paused":
        TIMER_STATES[chat_id] = "active"
        LAST_TASK_TIME[chat_id] = time.time()
        return

    TIMER_STATES[chat_id] = "active"
    LAST_TASK_TIME[chat_id] = time.time()
    threading.Thread(target=send_question_timer_loop, args=(chat_id,), daemon=True).start()

def pause_timer(chat_id):
    TIMER_STATES[chat_id] = "paused"

def send_question_timer_loop(chat_id):
    while True:
        try:
            current_state = TIMER_STATES.get(chat_id, "stopped")
            if current_state == "stopped": break
            if current_state == "paused":
                time.sleep(5)
                continue

            now = time.time()
            pending = PENDING_QUIZ.get(chat_id)
            if pending:
                if now - pending["time"] > REMINDER_DELAY:
                    if not pending.get("reminded"):
                        PENDING_QUIZ[chat_id]["reminded"] = True
                        PENDING_QUIZ[chat_id]["time"] = now
                        threading.Thread(target=send_fun_fact_reminder, args=(chat_id, pending["word"])).start()
                    else:
                        clear_pending_quiz(chat_id)
                        LAST_TASK_TIME[chat_id] = 0
                time.sleep(5)
                continue

            last_time = LAST_TASK_TIME.get(chat_id, now)
            if now - last_time < config.TASK_INTERVAL:
                time.sleep(5)
                continue

            if not GENERATION_LOCKS.get(chat_id):
                GENERATION_LOCKS[chat_id] = True
                try:
                    send_text_task(chat_id)
                finally:
                    GENERATION_LOCKS[chat_id] = False
                    LAST_TASK_TIME[chat_id] = time.time()
            else:
                time.sleep(5)
        except Exception as err:
            time.sleep(5)

def get_task_markup():
    markup = InlineKeyboardMarkup()
    deep_link_url = WEB_APP_URL + "?page=task"
    markup.row(InlineKeyboardButton(text="🚀 Открыть в приложении", web_app=WebAppInfo(url=deep_link_url)))
    return markup

def send_text_task(chat_id):
    LAST_TASK_TIME[chat_id] = time.time()

    # 🔥 ДЕБАГ: Посмотрим, что настроено у пользователя
    user_config = database.get_user_config(chat_id)
    print(f"🐛 [DEBUG] Конфиг юзера {chat_id}: {user_config}")

    success = send_quiz_task(chat_id)
    if not success:
        print("🐛 [DEBUG] get_random_global_words вернул пустоту! Проверяй lang и difficulty.")
        try:
            bot.send_message(
                chat_id,
                "⚠️ Словарь пуст или не найдены слова под твои настройки! 📚",
                parse_mode="HTML"
            )
        except Exception:
            pass

def send_quiz_task(chat_id):
    print("🔥🔥🔥 SEND_QUIZ_TASK STARTED 🔥🔥🔥", flush=True)
    user_config = database.get_user_config(chat_id)
    difficulty = user_config.get("difficulty", "A1") if user_config else "A1"
    target_lang = user_config.get("source_lang", "en") if user_config else "en"



    global_words = database.get_random_global_words(chat_id, target_lang, difficulty, limit=1)

    print("🚨🚨🚨 GET_RANDOM_GLOBAL_WORDS CALLED 🚨🚨🚨", flush=True)

    if not global_words:
        print("❌ Ошибка: В базе данных нет слов для этого уровня и языка.")
        return False

    target = global_words[0]
    target_id = target['id']
    target_foreign = target['foreign']

    try:
        prompt = aiPrompts.get_quiz_options_prompt(target_foreign, target_lang)
        raw_response = ask_ai(prompt, temperature=0.4, chat_id=chat_id)

        cleaned_json = raw_response.replace("```json", "").replace("```", "").strip()
        ai_data = json.loads(cleaned_json)

        target_ru = ai_data["correct"].capitalize()
        wrong1 = ai_data["wrong1"].capitalize()
        wrong2 = ai_data["wrong2"].capitalize()
    except Exception as e:
        print(f"🔴 Ошибка ИИ при генерации викторины: {e}")
        return False

    options = [
        (target_ru, f"qans_1_{target_id}"),
        (wrong1, f"qans_0_{target_id}"),
        (wrong2, f"qans_0_{target_id}")
    ]
    random.shuffle(options)

    markup = InlineKeyboardMarkup(row_width=1)
    for opt_text, cb_data in options:
        markup.add(InlineKeyboardButton(text=opt_text, callback_data=cb_data))

    btn_add = InlineKeyboardButton(text="➕ В словарь", callback_data=f"add_dict_{target_id}")
    btn_hide = InlineKeyboardButton(text="🚫 Не показывать", callback_data=f"hide_word_{target_id}")
    markup.row(btn_add, btn_hide)

    bot.send_message(
        chat_id,
        f"⏱ <b>Минутка для перевода:</b>\nКак переводится слово <b>«{target_foreign}»</b>?",
        reply_markup=markup,
        parse_mode="HTML"
    )

    PENDING_QUIZ[chat_id] = {
        "time": time.time(),
        "word": target_foreign,
        "ru_word": target_ru,
        "word_id": target_id,
        "reminded": False
    }
    return True

def send_grammar_task(chat_id):
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

    if not words: return

    target_word_ru = words[0]['ru']
    target_word_foreign = words[0]['foreign']

    try:
        prompt = aiPrompts.generate_pure_vocabulary_task_prompt_ver2(
            lang_name=lang_name, target_word=target_word_ru, difficulty=pretty_diff, history=history, rule="General Grammar"
        )
        raw_text = ask_ai(prompt, temperature=0.4)
        ru_phrase = raw_text.replace('"', '').replace('`', '').strip()

        database.save_active_task(chat_id, ru_phrase, "General Grammar")
        database.add_to_history(chat_id, ru_phrase)

        bot.send_message(
            chat_id,
            f"🤖 <b>Новое задание на основе твоего словаря!</b>\n🎯 Уровень: <code>{pretty_diff}</code>\n💡 Слово: <b>{target_word_foreign}</b>\n\n👉 <code>{ru_phrase}</code>\n\n<b>Переведи это на {lang_name} 👇</b>",
            reply_markup=get_task_markup(),
            parse_mode="HTML"
        )
    except Exception as e:
        print(f"🔴 Ошибка генерации контекстного таска: {e}")