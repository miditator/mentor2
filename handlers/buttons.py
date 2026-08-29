import threading
import telebot
import keyboard
import database
import config
import utils
import aiPrompts
from telebot import types
from loader import bot
from ai_service import ask_ai
# 🔥 ОБНОВЛЕННЫЙ ИМПОРТ:
from handlers.words import enter_add_word_mode, process_translation_request
import json
import re
import uuid # 🔥 Добавили
from api.routers.translator import apply_semantic_markup
import ai_service
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import time
import live_chat_database

BTN_PRON = "Произношение"

BTN_CHAT = "Чат"

BTN_LEARN = "Обучение"

SEPARATOR = "___"
BUTTONS_LOCKS = {}


def show_settings(message):
    chat_id = message.chat.id
    markup = keyboard.get_settings_menu()
    bot.send_message(chat_id, "⚙️ <b>Настройки профиля</b>\n\nВыбери уровень сложности и целевой язык:",
                     reply_markup=markup, parse_mode="HTML")




def seed_initial_words_via_ai(chat_id, target_lang="en"):
    existing_words = database.get_full_dictionary(chat_id, specific_lang=target_lang)
    if existing_words: return
    try:
        prompt = aiPrompts.get_starting_words_prompt(target_lang)
        raw_text = ask_ai(prompt, temperature=0.3)
        raw_json = raw_text.replace("```json", "").replace("```", "").strip()
        words_list = json.loads(raw_json)
        for item in words_list:
            database.add_custom_word(chat_id, item["foreign"], item["ru"], specific_lang=target_lang)
    except Exception as e:
        print(f"❌ Ошибка стартовых слов ИИ: {e}")


@bot.callback_query_handler(func=lambda call: call.data.startswith(("set_", "start_")))
def handle_settings_clicks(call):
    chat_id = call.message.chat.id
    message_id = call.message.message_id
    if BUTTONS_LOCKS.get(chat_id) is True:
        try:
            bot.answer_callback_query(call.id, "⏳ Секунду...")
        except:
            pass
        return
    BUTTONS_LOCKS[chat_id] = True
    try:
        if call.data.startswith("start_lang_"):
            chosen_lang = call.data.replace("start_lang_", "")
            database.update_user_setting(chat_id, "source_lang", chosen_lang)
            try:
                bot.answer_callback_query(call.id)
                bot.edit_message_reply_markup(chat_id=chat_id, message_id=message_id, reply_markup=None)
            except:
                pass
            bot.send_message(chat_id, SEPARATOR)
            markup = keyboard.get_start_difficulty_menu()
            bot.send_message(chat_id, f"🌍 Язык изменен.\n\n⚙️ <b>Шаг 2 из 3:</b> Выбери уровень:", reply_markup=markup,
                             parse_mode="HTML")

        elif call.data.startswith("start_diff_"):
            chosen_diff_str = call.data.replace("start_diff_", "")
            database.update_user_setting(chat_id, "difficulty", chosen_diff_str)
            try:
                diff_key = int(chosen_diff_str)
                pretty_diff = keyboard.DIFFICULTY.get(diff_key, f"Уровень {chosen_diff_str}")
            except ValueError:
                pretty_diff = chosen_diff_str
            try:
                bot.answer_callback_query(call.id)
                bot.edit_message_reply_markup(chat_id=chat_id, message_id=message_id, reply_markup=None)
            except:
                pass
            bot.send_message(chat_id, SEPARATOR)
            finish_global_onboarding(chat_id, pretty_diff)

        elif call.data.startswith("set_"):
            chat_message_text = "⚙️ Настройки обновлены!"
            if call.data.startswith("set_diff_"):
                chosen_diff_str = call.data.replace("set_diff_", "")
                database.update_user_setting(chat_id, "difficulty", chosen_diff_str)
                try:
                    diff_key = int(chosen_diff_str)
                    pretty_diff = keyboard.DIFFICULTY.get(diff_key, f"Уровень {chosen_diff_str}")
                except ValueError:
                    pretty_diff = chosen_diff_str
                chat_message_text = f"📊 Уровень изменен на: <b>{pretty_diff}</b>"
            elif call.data.startswith("set_lang_"):
                chosen_lang = call.data.replace("set_lang_", "")
                database.update_user_setting(chat_id, "source_lang", chosen_lang)
                lang_name = "Английский 🇬🇧" if chosen_lang == "en" else "Немецкий 🇩🇪"
                chat_message_text = f"🌍 Язык изменен на: <b>{lang_name}</b>"
                seed_initial_words_via_ai(chat_id, chosen_lang)
            bot.answer_callback_query(call.id)
            bot.send_message(chat_id, chat_message_text, parse_mode="HTML")
    finally:
        BUTTONS_LOCKS[chat_id] = False


def finish_global_onboarding(chat_id, pretty_diff):
    current_config = database.get_user_config(chat_id)
    current_lang_code = current_config.get("source_lang", "en")
    seed_initial_words_via_ai(chat_id, current_lang_code)
    bot.send_message(chat_id, f"🎉 <b>Настройка завершена!</b>\nВсе инструменты готовы.",
                     reply_markup=keyboard.get_main_menu(), parse_mode="HTML")
    utils.start_or_resume_timer(chat_id)


@bot.message_handler(func=lambda message: message.text == "🎯 Новое задание")
def global_new_task_handler(message):
    chat_id = message.chat.id
    utils.GENERATION_LOCKS[chat_id] = False
    database.delete_active_task(chat_id)
    utils.send_text_task(chat_id)
    utils.start_or_resume_timer(chat_id)


@bot.message_handler(func=lambda message: message.text == "⚙️ Настройки")
def global_settings_handler(message):
    show_settings(message)


@bot.message_handler(func=lambda message: message.text == "📚 Тренировать слова")
def global_words_training_handler(message):
    chat_id = message.chat.id
    utils.pause_timer(chat_id)
    bot.send_message(chat_id, "🟢 ═ ТРЕНИРОВКА СЛОВ ═ 🟢", reply_markup=keyboard.get_pre_training_reply_menu(),
                     parse_mode="HTML")
    bot.send_message(chat_id, "📊 <b>Сколько слов?</b>", reply_markup=keyboard.get_word_count_menu(), parse_mode="HTML")


@bot.message_handler(func=lambda message: message.text == "➕ Добавить слово")
def global_add_word_mode_handler(message):
    enter_add_word_mode(message)


@bot.message_handler(func=lambda message: message.text == "🔥 Интенсив по слову")
def global_intensity_menu_handler(message):
    chat_id = message.chat.id
    bot.set_state(message.from_user.id, "waiting_for_intensity_word", chat_id)
    bot.send_message(chat_id, "🧠 <b>Режим Интенсива!</b>\nНапиши слово:",
                     reply_markup=keyboard.get_cancel_word_keyboard(), parse_mode="HTML")


@bot.callback_query_handler(func=lambda call: call.data == "start_chat_onboarding")
def start_chat_onboarding_callback(call):
    bot.delete_message(call.message.chat.id, call.message.message_id)
    bot.send_message(call.message.chat.id, "🌍 Выбери целевой язык:", reply_markup=keyboard.get_start_language_menu(),
                     parse_mode="HTML")


# --- НОВЫЕ КНОПКИ ГЛОБАЛЬНОЙ ВИКТОРИНЫ ---
@bot.callback_query_handler(func=lambda call: call.data.startswith("add_dict_") or call.data.startswith("hide_word_"))
def handle_global_quiz_actions(call):
    chat_id = call.message.chat.id
    message_id = call.message.message_id

    action = "add_dict" if call.data.startswith("add_dict_") else "hide_word"
    word_id = int(call.data.split('_')[2])

    try:
        if action == "add_dict":
            word_foreign = None

            # 1. Достаем иностранное слово из памяти или БД
            pending = utils.PENDING_QUIZ.get(chat_id)
            if pending and pending.get("word_id") == word_id:
                word_foreign = pending["word"]
            else:
                word_data = database.get_global_word_by_id(word_id)
                if not word_data:
                    bot.answer_callback_query(call.id, "❌ Ошибка: слово не найдено.", show_alert=True)
                    return
                word_foreign = word_data["foreign"]

            bot.answer_callback_query(call.id, "⏳ Готовлю перевод...")

            # 2. Вызываем идеальную функцию перевода из чата!
            user_config = database.get_user_config(chat_id)
            target_lang = user_config.get("source_lang", "en") if user_config else "en"

            # Передаем слово в штатный обработчик (он всё переведет и сохранит)
            process_translation_request(chat_id, word_foreign, target_lang, call.from_user.id)

        elif action == "hide_word":
            database.hide_global_word(chat_id, word_id)
            bot.answer_callback_query(call.id, "🚫 Слово скрыто.")

        # Очищаем викторину и удаляем сообщение
        utils.clear_pending_quiz(chat_id)
        try:
            bot.delete_message(chat_id, message_id)
        except:
            pass
    except Exception as e:
        print(f"🔴 Ошибка кнопок глобальной викторины: {e}")


# --- ОТВЕТЫ ВИКТОРИНЫ ---
# --- ОТВЕТЫ ВИКТОРИНЫ ---
@bot.callback_query_handler(func=lambda call: call.data.startswith("qans_"))
def handle_quiz_timer_answer(call):
    chat_id = call.message.chat.id
    message_id = call.message.message_id

    is_correct = (call.data.split('_')[1] == '1')

    if is_correct:
        # 🔥 1. Очищаем викторину из памяти ТОЛЬКО при правильном ответе
        utils.clear_pending_quiz(chat_id)

        bot.answer_callback_query(call.id, "✅ Правильно!")

        # 🔥 2. Обнуляем счетчик: бот начнет интервальный отсчет до СЛЕДУЮЩЕЙ викторины с этой секунды
        utils.LAST_TASK_TIME[chat_id] = time.time()

        try:
            bot.delete_message(chat_id, message_id)
        except:
            pass
    else:
        bot.answer_callback_query(call.id, "❌ Неверно! Попробуй еще раз или добавь слово в словарь.", show_alert=True)


@bot.callback_query_handler(func=lambda call: call.data == "generate_new_task")
def handle_generate_new_task_callback(call):
    chat_id = call.message.chat.id
    if utils.GENERATION_LOCKS.get(chat_id) is True:
        bot.answer_callback_query(call.id, "⏳ Ментор уже готовит задание...")
        return
    utils.GENERATION_LOCKS[chat_id] = True
    bot.answer_callback_query(call.id, "Генерирую задание...")
    try:
        database.delete_active_task(chat_id)
        utils.send_text_task(chat_id)
        utils.start_or_resume_timer(chat_id)
    finally:
        utils.GENERATION_LOCKS[chat_id] = False


@bot.callback_query_handler(func=lambda call: call.data == "task_help")
def handle_task_help_callback(call):
    chat_id = call.message.chat.id
    bot.answer_callback_query(call.id, "⏳ Готовлю подсказку...")
    task_data = database.get_active_task(chat_id)
    if not task_data:
        bot.send_message(chat_id, "⚠️ У тебя сейчас нет активного задания.")
        return

    original_ru_phrase = task_data["phrase"]
    user_config = database.get_user_config(chat_id)
    end_lesson = False

    if task_data["help_count"] < 1:
        database.increment_help_count(chat_id)
        bot.send_message(chat_id, "💡 <b>Подсказка:</b>", parse_mode="HTML")
        prompt_text = aiPrompts.help_prompt(original_ru_phrase, user_config)
    else:
        bot.send_message(chat_id, "🛑 <b>Разбор:</b>", parse_mode="HTML")
        prompt_text = aiPrompts.final_ready_prompt(original_ru_phrase, user_config)
        end_lesson = True

    try:
        ai_text = ask_ai(prompt_text, temperature=config.temperature)
        if end_lesson:
            database.delete_active_task(chat_id)
            bot.send_message(chat_id, ai_text, parse_mode="HTML")
            from telebot.types import WebAppInfo
            markup = InlineKeyboardMarkup()
            markup.add(
                InlineKeyboardButton(text="🎯 Новое задание", callback_data="generate_new_task"),
                InlineKeyboardButton(text="🚀 В приложение", web_app=WebAppInfo(url=utils.WEB_APP_URL))
            )
            bot.send_message(chat_id, "Задание завершено 👇", reply_markup=markup, parse_mode="HTML")
        else:
            bot.send_message(chat_id, ai_text, parse_mode="HTML")
    except Exception as e:
        bot.send_message(chat_id, f"Ошибка ИИ: {e}")




# ==========================================
# 🔥 МЕНЮ РЕЖИМОВ ЧАТА
# ==========================================

def get_chat_mode_keyboard(chat_id: int = None):
    """Создает три кнопки в ряд, выделяя активный режим симметричными точками"""
    current_mode = live_chat_database.get_user_mode(chat_id) if chat_id else "CHAT"

    # Используем обычный текстовый символ (Alt+7 на numpad), он не ломает верстку
    chat_label = f"• {BTN_CHAT} •" if current_mode == "CHAT" else BTN_CHAT
    grammar_label = f"• {BTN_LEARN} •" if current_mode == "GRAMMAR" else BTN_LEARN
    pronun_label = f"• {BTN_PRON} •" if current_mode == "PRONUNCIATION" else BTN_PRON

    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=3)
    markup.add(
        types.KeyboardButton(chat_label),
        types.KeyboardButton(grammar_label),
        types.KeyboardButton(pronun_label)
    )
    return markup


# Гибкий перехватчик: реагирует на текст с кружком и без него
@bot.message_handler(func=lambda message: message.text and any(m in message.text for m in [BTN_CHAT, BTN_LEARN, BTN_PRON]))
def handle_mode_switch(message):
    chat_id = message.chat.id
    text = message.text

    if BTN_CHAT in text:
        live_chat_database.set_user_mode(chat_id, "CHAT")
        ai_service.PRONUNCIATION_MEMORY.pop(chat_id, None)
        bot.send_message(
            chat_id,
            "💬 <b>Режим 'Чат' активирован!</b>\n\n"
            "Доступные возможности:\n"
            "• 🤖 Свободное общение с ИИ на любые темы\n"
            "• 📖 Перевод слов и текста\n"
            "• 📸 Перевод текста на фото\n"
            "• 🔊 Озвучка текста (начни сообщение с символа <code>!</code>)\n"
            "• 🎧 Аудиоперевод на изучаемый язык по ключу (<i>«Озвучь фразу...»</i> или <i>«Переведи...»</i>)\n"
            "• 🎙️ Перевод и анализ аудио на изучаемом языке",
            reply_markup=get_chat_mode_keyboard(chat_id),
            parse_mode="HTML"
        )

    elif BTN_LEARN in text:
        live_chat_database.set_user_mode(chat_id, "GRAMMAR")
        ai_service.PRONUNCIATION_MEMORY.pop(chat_id, None)
        bot.send_message(
            chat_id,
            "🎯 <b>Режим 'Грамматика' активирован!</b>\n\n"
            "• Обучение с ментором в живом чате\n"
            "<i>(Озвучка и перевод слов в этом режиме недоступны)</i>",
            reply_markup=get_chat_mode_keyboard(chat_id),
            parse_mode="HTML")

    elif BTN_PRON in text:
        live_chat_database.set_user_mode(chat_id, "PRONUNCIATION")
        ai_service.PRONUNCIATION_MEMORY.pop(chat_id, None)
        bot.send_message(
            chat_id,
            "🎙️ <b>Режим 'Произношение' активирован!</b>\n\n"
            "• Отправляй голосовые сообщения\n"
            "• Получай анализ через Google AI",
            reply_markup=get_chat_mode_keyboard(chat_id),
            parse_mode="HTML"
        )









