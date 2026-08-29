# handlers/words.py

import config
import random
import re
import json
import uuid
import threading
import database
import keyboard
import aiPrompts
import utils
from telebot import types
from loader import bot
from ai_service import ask_ai
import ai_service
from api.routers.translator import apply_semantic_markup
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

# ==========================================
# ХРАНИЛИЩА СЕССИЙ (В ПАМЯТИ)
# ==========================================
CURRENT_TRAINING = {}
WORDS_INLINE_LOCKS = {}

# Сессии для перевода целых текстов (с чекбоксами)
TRANSLATION_SESSIONS = {}
# Сессии для перевода одиночных слов
SINGLE_WORD_SESSIONS = {}


# ==========================================
# 0. ГЛОБАЛЬНЫЙ ПЕРЕХВАТЧИК ВЫХОДА ИЗ ТРЕНИРОВКИ
# ==========================================
@bot.message_handler(func=lambda message: message.text == "🚪 Выход из тренировки")
def global_exit_word_training(message):
    chat_id = message.chat.id
    user_id = message.from_user.id

    global WORDS_INLINE_LOCKS
    WORDS_INLINE_LOCKS[chat_id] = False
    CURRENT_TRAINING.pop(chat_id, None)

    try:
        bot.delete_state(user_id, chat_id)
    except Exception:
        pass

    active_task = database.get_active_task(chat_id)
    exit_text = "Вышли в главное меню."
    if active_task:
        exit_text += f"\n\n🤔 <b>Кстати, не забудь про текущее задание!</b>\nИИ-Ментор ждет перевод фразы:\n👉 <b>{active_task['phrase']}</b>"

    exit_text += "\n\nВыбери следующее действие на кнопках ниже 👇"
    bot.send_message(chat_id, exit_text, reply_markup=keyboard.get_main_menu(), parse_mode="HTML")
    utils.start_or_resume_timer(chat_id)


# ==========================================
# 1. ЛОГИКА ТРЕНИРОВКИ СЛОВ (ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ)
# ==========================================
@bot.callback_query_handler(func=lambda call: call.data.startswith("train_count_"))
def handle_word_count_selection(call):
    chat_id = call.message.chat.id
    if WORDS_INLINE_LOCKS.get(chat_id) is True:
        try:
            bot.answer_callback_query(call.id)
        except:
            pass
        return

    WORDS_INLINE_LOCKS[chat_id] = True
    try:
        try:
            bot.answer_callback_query(call.id)
        except:
            pass

        chosen_count = int(call.data.replace("train_count_", ""))
        database.update_user_setting(chat_id, "words_per_day", chosen_count)

        try:
            bot.edit_message_text(
                chat_id=chat_id, message_id=call.message.message_id,
                text=f"📊 <b>Выбран лимит сессии: {chosen_count} слов.</b>\nЗапускаю карточки...",
                reply_markup=None, parse_mode="HTML"
            )
            bot.send_message(chat_id, "․\n")
        except:
            pass

        start_word_training(chat_id)
    finally:
        WORDS_INLINE_LOCKS[chat_id] = False


def start_word_training(message_or_id):
    chat_id = message_or_id if isinstance(message_or_id, int) else message_or_id.chat.id
    utils.pause_timer(chat_id)

    user_config = database.get_user_config(chat_id)
    words_per_day = user_config.get("words_per_day", 5) if user_config else 5
    raw_words = database.get_words_for_training(chat_id, limit_new=words_per_day)

    if not raw_words:
        bot.send_message(chat_id, "🎉 На сегодня все слова повторены! Возвращайся завтра.",
                         reply_markup=keyboard.get_main_menu())
        utils.start_or_resume_timer(chat_id)
        return

    session_words = [{"id": w_id, "en": foreign.strip(), "ru": ru.strip(), "streak": 0} for w_id, foreign, ru, score in
                     raw_words if foreign and ru]

    if not session_words:
        bot.send_message(chat_id, "⚠️ Не удалось загрузить слова. Попробуй добавить новые слова.",
                         reply_markup=keyboard.get_main_menu())
        utils.start_or_resume_timer(chat_id)
        return

    random.shuffle(session_words)
    CURRENT_TRAINING[chat_id] = {"words": session_words, "current_word": None, "is_rus_to_eng": False}
    send_next_card(chat_id, is_first_card=True)


def send_next_card(chat_id, is_first_card=False):
    session = CURRENT_TRAINING.get(chat_id)

    if not session or not session["words"]:
        active_task = database.get_active_task(chat_id)
        main_text = "🏆 <b>Отличная работа!</b> Сессия завершена, все слова успешно закреплены!"
        if active_task:
            main_text += f"\n\n⏰ <b>Напоминание:</b> Ментор все еще ожидает твой перевод для фразы:\n👉 <b>{active_task['phrase']}</b>"
        bot.send_message(chat_id, main_text, reply_markup=keyboard.get_main_menu(), parse_mode="HTML")
        CURRENT_TRAINING.pop(chat_id, None)
        utils.start_or_resume_timer(chat_id)
        return

    word_card = session["words"][0]
    session["current_word"] = word_card
    user_config = database.get_user_config(chat_id)
    is_en = user_config.get("source_lang", "en") == "en"
    lang_emoji = "🇬🇧" if is_en else "🇩🇪"

    if session["is_rus_to_eng"]:
        text_to_show = f"🗣 Как переводится на {'английский' if is_en else 'немецкий'}: <b>{word_card['ru']}</b>?"
    else:
        text_to_show = f"{lang_emoji} Как переводится: <b>{word_card['en']}</b>?"
        if is_first_card:
            bot.send_message(chat_id, "🚀 Начинаем сессию повторения слов! Используй нижнее меню для подсказок.",
                             reply_markup=keyboard.get_training_reply_menu(), parse_mode="HTML")

    bot.send_message(chat_id, f"{text_to_show}\n\n<i>(Пройдено повторений: {word_card['streak']}/3)</i>",
                     reply_markup=keyboard.get_training_menu(), parse_mode="HTML")


@bot.message_handler(func=lambda message: message.chat.id in CURRENT_TRAINING)
def handle_training_answers(message):
    chat_id = message.chat.id
    session = CURRENT_TRAINING.get(chat_id)
    if not session or not session.get("current_word"): return

    user_text = message.text.strip() if message.text else ""
    if user_text in ["🚪 Выход из тренировки", "🚪 Назад в меню", "⚙️ Настройки", "🎯 Новое задание",
                     "📚 Тренировать слова", "➕ Добавить слово", "🔥 Интенсив по слову"]:
        return

    user_text_lower = user_text.lower()
    word_card = session["current_word"]

    if user_text == "💡 Помощь":
        hint = word_card["en"] if session["is_rus_to_eng"] else word_card["ru"]
        bot.send_message(chat_id, f"💡 Подсказка: ответ начинается на — <b>{hint.strip()[:3].upper()}...</b>",
                         parse_mode="HTML")
        return

    correct_answer = word_card["en"].lower() if session["is_rus_to_eng"] else word_card["ru"].lower()

    if user_text_lower == correct_answer:
        bot.send_message(chat_id, "✅ Правильно!")
        word_card["streak"] += 1
        if word_card["streak"] >= 3:
            database.update_word_progress(word_id=word_card["id"], is_correct=True)
            session["words"].pop(0)
        else:
            session["words"].append(session["words"].pop(0))
    else:
        bot.send_message(chat_id, f"❌ Неверно. Правильный ответ: <b>{correct_answer}</b>", parse_mode="HTML")
        word_card["streak"] = 0
        database.update_word_progress(word_id=word_card["id"], is_correct=False)
        session["words"].append(session["words"].pop(0))

    send_next_card(chat_id)


@bot.callback_query_handler(func=lambda call: call.data.startswith("train_"))
def handle_training_inline(call):
    chat_id = call.message.chat.id
    session = CURRENT_TRAINING.get(chat_id)
    if not session:
        try:
            bot.answer_callback_query(call.id, "Сессия устарела.")
        except:
            pass
        return

    if call.data == "train_flip":
        session["is_rus_to_eng"] = not session["is_rus_to_eng"]
        direction = "Русский ➡️ Иностранный" if session["is_rus_to_eng"] else "Иностранный ➡️ Русский"
        try:
            bot.answer_callback_query(call.id, f"Порядок изменен: {direction}")
        except:
            pass

        word_card = session["current_word"]
        if not word_card: return
        text_to_show = f"🗣 Как переводится: <b>{word_card['ru']}</b>?" if session[
            "is_rus_to_eng"] else f"🇬🇧 Как переводится: <b>{word_card['en']}</b>?"
        try:
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id,
                                  text=f"{text_to_show}\n\n<i>(Пройдено повторений: {word_card['streak']}/3)</i>",
                                  reply_markup=keyboard.get_training_menu(), parse_mode="HTML")
        except:
            pass

    elif call.data == "train_show_dict":
        try:
            bot.answer_callback_query(call.id, "Загружаю словарь...")
        except:
            pass
        words = database.get_full_dictionary(chat_id)
        text = "📖 <b>Твой словарь:</b>\n\n" + "".join(
            [f"• {en} — {ru} (<code>{min(score * 20, 100)}%</code>)\n" for en, ru, score in words])
        bot.send_message(chat_id, text, parse_mode="HTML")


# ==========================================
# 1. УНИВЕРСАЛЬНЫЙ ПРОЦЕССОР ПЕРЕВОДА (СЛОВА И ТЕКСТЫ)
# ==========================================
def process_translation_request(chat_id, text, target_lang, user_id=None):
    """Сама решает: если 1-2 слова -> режим Карточки. Если >2 слов -> режим Текста."""
    word_count = len(text.split())
    is_russian = bool(re.search(r'[а-яА-ЯёЁ]', text))


    lang_name_ru = "английскому" if target_lang == 'en' else "немецкому"
    flag = "🇬🇧" if target_lang == 'en' else "🇩🇪"

    try:
        if word_count <= 2:
            # --- ЛОГИКА 1: ОДИНОЧНОЕ СЛОВО ---
            result = ai_service.translate_word_ai(text, target_lang, chat_id, is_russian)

            # 🔥 БЛОК ЗАЩИТЫ СЛОВАРЯ
            if "error" in result:
                if result["error"] == "wrong_language":
                    bot.send_message(chat_id,
                                     f"⚠️ <b>Внимание:</b>\nСлово «{text}» не относится к <b>{lang_name_ru}</b> языку!\n",
                                     parse_mode="HTML")
                else:
                    bot.send_message(chat_id, "⚠️ ИИ не смог распознать это слово. Попробуй исправить опечатку.")
                return

            details = result.get("details", {})
            original_foreign = details.get("word", result["original"]).strip()
            meanings = details.get("meanings", [])

            if not meanings:
                bot.send_message(chat_id, f"🔍 Перевод:\n{result['translation']}")
                return

            ru_meanings_list = [m['meaning'] for m in meanings[:3]]
            ru_translation = ", ".join(ru_meanings_list)

            typo_warning = "💡 <i>ИИ исправил опечатку</i>\n\n" if details.get("is_typo") else ""
            msg_text = f"{typo_warning}{flag} Начальная форма: <b>{original_foreign}</b>\n\n📚 <b>Значения:</b>\n"
            for i, m in enumerate(meanings[:3]):
                msg_text += f"{i + 1}. <b>{m['meaning']}</b>\n"

            session_id = str(uuid.uuid4())[:8]
            SINGLE_WORD_SESSIONS[session_id] = {
                "foreign": original_foreign,
                "ru": ru_translation,
                "target_lang": target_lang
            }

            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton(text="❌ Отмена", callback_data=f"sw_cancel_{session_id}"),
                InlineKeyboardButton(text="➕ В словарь", callback_data=f"sw_add_{session_id}")
            )
            bot.send_message(chat_id, msg_text, reply_markup=markup, parse_mode="HTML")

        else:
            # --- ЛОГИКА 2: РАЗБОР ЦЕЛОГО ТЕКСТА ---
            prompt = aiPrompts.translate_and_extract_text_prompt(text, target_lang)
            full_prompt = (
                "[Системная инструкция: Верни СТРОГО JSON объект. Без markdown блоков. "
                f"Важно: Если этот текст написан НЕ на {lang_name_ru} языке (или не на русском), верни пустой JSON: {{\"translation\": \"\", \"words\": []}}. "
                "Для каждого извлеченного слова в поле 'translation' напиши 2-3 самых частых значения.]\n\n"
                f"{prompt}"
            )

            # Для текстов тоже ставим низкую температуру, чтобы не фантазировал
            raw_ai = ask_ai(full_prompt, temperature=0.1)

            cleaned = re.sub(r'```(?:json)?\s*(\{.*?\})\s*```', r'\1', raw_ai, flags=re.DOTALL).strip()
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            json_str = cleaned[start:end + 1] if start != -1 and end != -1 else cleaned

            data = json.loads(json_str)
            translated_text = data.get("translation", "")
            words_list = data.get("words", [])

            if not translated_text and not words_list:
                bot.send_message(chat_id, f"❌ Текст не распознан. Убедись, что он относится к {lang_name_ru} языку.")
                return

            if not words_list:
                bot.send_message(chat_id, f"📝 <b>Оригинал:</b> {text}\n🇷🇺 <b>Перевод:</b> {translated_text}",
                                 parse_mode="HTML")
                return

            session_id = str(uuid.uuid4())[:8]
            TRANSLATION_SESSIONS[session_id] = {
                "chat_id": chat_id,
                "target_lang": target_lang,
                "words": [{"foreign": w.get("word", ""), "ru": w.get("translation", ""), "selected": False} for w in
                          words_list]
            }

            bot.send_message(
                chat_id,
                f"📖 <b>Перевод текста:</b>\n{translated_text}\n\n<i>Выбери слова для добавления в словарь:</i>",
                reply_markup=get_translation_markup(session_id),
                parse_mode="HTML"
            )

    except Exception as e:
        print(f"Ошибка при переводе: {e}")
        bot.send_message(chat_id, "⚠️ Произошла ошибка. Либо текст слишком сложный, либо сервер перегружен.")


def get_translation_markup(session_id):
    markup = types.InlineKeyboardMarkup(row_width=1)
    session = TRANSLATION_SESSIONS.get(session_id)
    if not session: return markup

    for i, w in enumerate(session["words"]):
        icon = "✅" if w["selected"] else "➕"
        short_ru = w['ru'][:25] + "..." if len(w['ru']) > 25 else w['ru']
        markup.add(types.InlineKeyboardButton(
            text=f"{icon} {w['foreign']}  —  {short_ru}",
            callback_data=f"tgl_w_{session_id}_{i}"
        ))

    markup.add(types.InlineKeyboardButton(text="💾 Сохранить", callback_data=f"save_w_{session_id}"))
    return markup


# ==========================================
# 3. FSM РЕЖИМ РУЧНОГО ДОБАВЛЕНИЯ СЛОВ И КОЛЛБЭКИ
# ==========================================
def enter_add_word_mode(message):
    chat_id = message.chat.id
    CURRENT_TRAINING.pop(chat_id, None)
    utils.pause_timer(chat_id)
    bot.set_state(message.from_user.id, "waiting_for_custom_word", chat_id)

    bot.send_message(
        chat_id,
        "⏸ <b>Режим умного переводчика активирован!</b>\n\n"
        "📥 Отправь мне <b>одно слово или абзац текста</b>.\n"
        "Одиночное слово я приведу к начальной форме, а текст разберу на важные словарные карточки.",
        reply_markup=keyboard.get_cancel_word_keyboard(),
        parse_mode="HTML"
    )


@bot.message_handler(state="waiting_for_custom_word")
def handle_custom_word_input(message):
    chat_id = message.chat.id
    user_id = message.from_user.id
    user_text = message.text.strip() if message.text else ""

    if user_text in ["🚪 Назад в меню", "⚙️ Настройки", "🎯 Новое задание", "📚 Тренировать слова", "➕ Добавить слово",
                     "🔥 Интенсив по слову"]:
        bot.delete_state(user_id, chat_id)
        utils.start_or_resume_timer(chat_id)
        if user_text == "🚪 Назад в меню":
            active_task = database.get_active_task(chat_id)
            exit_text = "Режим перевода отключен."
            if active_task:
                exit_text += f"\n\n⏰ <b>Напоминание:</b> Ментор ждет перевод:\n👉 <b>{active_task['phrase']}</b>"
            bot.send_message(chat_id, exit_text, reply_markup=keyboard.get_main_menu(), parse_mode="HTML")
            return

        from handlers.buttons import (show_settings, global_new_task_handler, global_words_training_handler,
                                      global_intensity_menu_handler, global_add_word_mode_handler)
        if user_text == "⚙️ Настройки":
            show_settings(message)
        elif user_text == "🎯 Новое задание":
            global_new_task_handler(message)
        elif user_text == "📚 Тренировать слова":
            global_words_training_handler(message)
        elif user_text == "🔥 Интенсив по слову":
            global_intensity_menu_handler(message)
        elif user_text == "➕ Добавить слово":
            global_add_word_mode_handler(message)
        return

    user_config = database.get_user_config(chat_id)
    target_lang = user_config.get("source_lang", "en")
    bot.send_chat_action(chat_id, 'typing')
    process_translation_request(chat_id, user_text, target_lang, user_id)


# --- Коллбэки для сохранений ---
@bot.callback_query_handler(func=lambda call: call.data.startswith("sw_"))
def handle_single_word_buttons(call):
    chat_id = call.message.chat.id
    parts = call.data.split("_")
    action = parts[1]
    session_id = parts[2]

    if action == "cancel":
        try:
            bot.delete_message(chat_id, call.message.message_id)
        except:
            pass
        return

    if action == "add":
        data = SINGLE_WORD_SESSIONS.get(session_id)
        if not data:
            bot.answer_callback_query(call.id, "⚠️ Данные устарели.", show_alert=True)
            return

        bot.answer_callback_query(call.id, "⏳ Добавляю...")
        foreign, ru, lang = data["foreign"], data["ru"], data["target_lang"]

        is_in_oxford = database.is_word_in_oxford(foreign, lang)
        is_added = database.add_custom_word(chat_id, foreign, ru, specific_lang=lang)

        if is_added:
            if not is_in_oxford:
                def background_bot_discovery():
                    res = apply_semantic_markup(foreign, ru, lang, chat_id)
                    tags = res.get("tags", []) if isinstance(res, dict) else []
                    database.save_discovery(chat_id, foreign, ru, tags)

                threading.Thread(target=background_bot_discovery).start()
            else:
                threading.Thread(target=apply_semantic_markup, args=(foreign, ru, lang, chat_id)).start()

        bot.edit_message_reply_markup(chat_id, call.message.message_id, reply_markup=None)
        bot.send_message(chat_id, f"✅ Слово добавлено в словарь!\n<b>{foreign}</b> — {ru}", parse_mode="HTML")

        del SINGLE_WORD_SESSIONS[session_id]
        try:
            bot.delete_state(call.from_user.id, chat_id)
        except:
            pass


@bot.callback_query_handler(func=lambda call: call.data.startswith("tgl_w_"))
def handle_toggle_translation_word(call):
    parts = call.data.split("_")
    session_id = parts[2]
    idx = int(parts[3])

    session = TRANSLATION_SESSIONS.get(session_id)
    if session and 0 <= idx < len(session["words"]):
        session["words"][idx]["selected"] = not session["words"][idx]["selected"]
        try:
            bot.edit_message_reply_markup(call.message.chat.id, call.message.message_id,
                                          reply_markup=get_translation_markup(session_id))
        except:
            pass
    bot.answer_callback_query(call.id)


@bot.callback_query_handler(func=lambda call: call.data.startswith("save_w_"))
def handle_save_translation_words(call):
    parts = call.data.split("_")
    session_id = parts[2]
    chat_id = call.message.chat.id

    session = TRANSLATION_SESSIONS.get(session_id)
    if not session:
        bot.answer_callback_query(call.id, "Эта сессия перевода устарела.")
        return

    saved_list = []
    for w in session["words"]:
        if w["selected"]:
            foreign, ru, lang = w["foreign"], w["ru"], session["target_lang"]
            is_in_oxford = database.is_word_in_oxford(foreign, lang)
            is_saved = database.add_custom_word(chat_id, foreign, ru, specific_lang=lang)

            if is_saved:
                saved_list.append(f"• {foreign} — {ru}")
                if not is_in_oxford:
                    def bg_multi_discovery(f=foreign, r=ru, l=lang):
                        res = apply_semantic_markup(f, r, l, chat_id)
                        tags = res.get("tags", []) if isinstance(res, dict) else []
                        database.save_discovery(chat_id, f, r, tags)

                    threading.Thread(target=bg_multi_discovery).start()
                else:
                    threading.Thread(target=apply_semantic_markup, args=(foreign, ru, lang, chat_id)).start()

    try:
        bot.edit_message_reply_markup(chat_id, call.message.message_id, reply_markup=None)
        if saved_list:
            bot.send_message(chat_id, "✅ Сохранено в словарь:\n" + "\n".join(saved_list))
        else:
            bot.send_message(chat_id, "Ничего не выбрано.")
        del TRANSLATION_SESSIONS[session_id]
        bot.delete_state(call.from_user.id, chat_id)
    except:
        pass


# ==========================================
# 4. ОБРАБОТКА И РАЗБОР КАРТИНОК (С ЛОГАМИ)
# ==========================================
def process_image_request(chat_id, base64_image, target_lang):
    """Отправляет картинку в Vision AI и генерирует чекбоксы ТОЛЬКО для новых слов."""
    import uuid
    try:
        bot.send_chat_action(chat_id, 'typing')
        print(f"\n⚙️ [PROCESS IMAGE] Начало разбора картинки для {chat_id}")

        # 1. Получаем сырые данные от ИИ
        data = ai_service.extract_words_from_image_ai(base64_image, target_lang, chat_id)

        original_text = data.get("original", "")
        translated_text = data.get("translation", "")
        ai_words_list = data.get("words", [])

        # Проверяем, есть ли перевод или слова для вывода
        if not translated_text and not ai_words_list:
            bot.send_message(chat_id, "❌ Не удалось распознать или перевести текст на картинке.")
            return

        # 2. Фильтрация известных слов
        existing_words_raw = database.get_full_dictionary(chat_id) or []
        existing_foreign = set()

        for w in existing_words_raw:
            if isinstance(w, (list, tuple)) and len(w) > 0:
                existing_foreign.add(str(w[0]).lower().strip())
            elif isinstance(w, dict) and "foreign" in w:
                existing_foreign.add(w["foreign"].lower().strip())

        filtered_words = []
        for ai_word in ai_words_list:
            # Ищем слово по ключу 'foreign' или 'word'
            word_str = ai_word.get("foreign", ai_word.get("word", "")).lower().strip()
            if word_str and word_str not in existing_foreign:
                filtered_words.append(ai_word)

        print(f"⚙️ [PROCESS IMAGE] После фильтрации словаря осталось {len(filtered_words)} новых слов.")

        # Случай 1: Слова найдены на картинке, но все уже есть в словаре
        if len(ai_words_list) > 0 and len(filtered_words) == 0:
            bot.send_message(
                chat_id,
                f"🇷🇺 <b>Перевод:</b>\n{translated_text}\n\n🧠 <b>Ты уже всё знаешь!</b>\nВсе найденные на фото объекты или слова уже есть в твоем словаре.",
                parse_mode="HTML"
            )
            return

        # Случай 2: На картинке не было отдельных слов (или они отфильтровались), есть только перевод текста
        if not filtered_words:
            bot.send_message(chat_id, f"🇷🇺 <b>Перевод:</b>\n{translated_text}", parse_mode="HTML")
            return

        # 3. Создаем сессию с ЖЕЛЕЗОБЕТОННЫМ извлечением ключей
        session_words = []
        for w in filtered_words:
            # Достаем иностранное слово (пробуем разные ключи)
            f_word = w.get("foreign", w.get("word", "")).strip()
            # Достаем перевод (пробуем разные ключи)
            r_word = w.get("ru", w.get("translation", "")).strip()

            print(f"   👉 Формируем кнопку: {f_word} — {r_word}")

            if f_word and r_word:  # Добавляем только если оба поля не пустые
                session_words.append({"foreign": f_word, "ru": r_word, "selected": False})

        session_id = str(uuid.uuid4())[:8]
        TRANSLATION_SESSIONS[session_id] = {
            "chat_id": chat_id,
            "target_lang": target_lang,
            "words": session_words
        }

        # Случай 3: Выводим перевод и меню с новыми словами
        bot.send_message(
            chat_id,
            f"🇷🇺 <b>Перевод:</b>\n{translated_text}\n\n<i>📸 Найдено {len(session_words)} новых слов:</i>",
            reply_markup=get_translation_markup(session_id),
            parse_mode="HTML"
        )
    except Exception as e:
        import traceback
        err_details = traceback.format_exc()
        print(f"❌ [PROCESS IMAGE] Критическая ошибка: {e}\n{err_details}", flush=True)
        bot.send_message(chat_id, f"⚠️ Ошибка: {str(e)}")



