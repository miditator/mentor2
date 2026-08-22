# ==========================================
# ФАЙЛ: handlers/voice.py
# ==========================================
import os
import uuid
import asyncio
import edge_tts
from loader import bot
import database
import ai_service
import aiPrompts
from ai_service import ask_ai
from handlers.words import TRANSLATION_SESSIONS, get_translation_markup, process_translation_request


async def generate_user_voice(text: str, target_lang: str, output_path: str, user_voice: str = None, tts_rate: str = "-15%"):
    """Генерация нейро-голоса через edge-tts с учетом новых настроек"""
    # 1. Если пользователь выбрал конкретный голос, используем его
    if user_voice:
        voice = user_voice
    # 2. Если нет (или зашел впервые) — ставим красивые голоса по умолчанию
    else:
        if target_lang == "en":
            voice = "en-US-JennyNeural"
        else:
            voice = "de-DE-AmalaNeural"

    # 🔥 Передаем скорость в Communicate
    communicate = edge_tts.Communicate(text, voice, rate=tts_rate)
    await communicate.save(output_path)


# ==========================================
# 1. ОБРАБОТЧИК ГОЛОСОВЫХ СООБЩЕНИЙ
# ==========================================
# ==========================================
# 1. ОБРАБОТЧИК ГОЛОСОВЫХ СООБЩЕНИЙ
# ==========================================
@bot.message_handler(content_types=['voice', 'audio'])
def handle_voice_message(message):
    chat_id = message.chat.id

    user_config = database.get_user_config(chat_id) or {}
    target_lang = user_config.get("source_lang", "en")
    lang_flag = "🇬🇧" if target_lang == "en" else "🇩🇪"
    lang_name = "английский" if target_lang == "en" else "немецкий"

    user_voice = user_config.get(f"tts_voice_{target_lang}")
    tts_rate = user_config.get("tts_rate", "-15%")

    bot.send_chat_action(chat_id, 'typing')

    file_path = f"temp_voice_{chat_id}_{uuid.uuid4().hex[:6]}.ogg"

    try:
        # 🔥 1. СКАЧИВАНИЕ ФАЙЛА
        file_id = message.voice.file_id if message.content_type == 'voice' else message.audio.file_id
        file_info = bot.get_file(file_id)
        downloaded_file = bot.download_file(file_info.file_path)

        with open(file_path, 'wb') as new_file:
            new_file.write(downloaded_file)

        # 🔥 2. РАСШИФРОВКА В ТЕКСТ (Whisper)
        bot.send_chat_action(chat_id, 'typing')
        transcript = ai_service.transcribe_audio_ai(file_path)

        if not transcript or not transcript.strip():
            bot.send_message(chat_id, "⚠️ Не удалось распознать речь.")
            return

        # 🔥 3. ЕДИНЫЙ ТЕКСТОВЫЙ РОУТЕР
        bot.send_chat_action(chat_id, 'typing')
        router_data = ai_service.analyze_text_intent(chat_id, transcript, target_lang)
        intent = router_data.get("intent")
        clean_text = router_data.get("clean_text", transcript)

        # 🔥 4. ВЫПОЛНЕНИЕ ДЕЙСТВИЙ
        if intent == "VOICE_OVER":
            bot.send_chat_action(chat_id, 'record_audio')
            prompt = f"Переведи эту фразу на {lang_name} язык. Выдай ТОЛЬКО чистый перевод, без лишних слов, кавычек и пояснений:\n{clean_text}"
            translated_text = ask_ai(prompt, temperature=0.3, chat_id=chat_id).strip()

            bot.send_message(chat_id, f"{lang_flag} <b>{translated_text}</b>", parse_mode="HTML")

            tts_path = f"temp_tts_{chat_id}_{uuid.uuid4().hex[:6]}.mp3"
            asyncio.run(
                generate_user_voice(translated_text, target_lang, tts_path, user_voice=user_voice, tts_rate=tts_rate))

            with open(tts_path, 'rb') as audio_file:
                bot.send_voice(chat_id, audio_file)

            if os.path.exists(tts_path):
                os.remove(tts_path)

        elif intent == "CHAT":
            bot.send_chat_action(chat_id, 'typing')
            reply = ai_service.process_live_mentor_chat(chat_id, clean_text)
            bot.send_message(chat_id, reply, parse_mode="HTML")

        elif intent == "ANALYSIS":
            # 🔥 ВОЗВРАЩАЕМ ПОЛНОЦЕННЫЙ АНАЛИЗАТОР GEMINI С АУДИОФАЙЛОМ
            bot.send_chat_action(chat_id, 'typing')

            # Передаем сам файл .ogg в Google!
            analysis_data = ai_service.analyze_audio_grammar_gemini(file_path, clean_text, target_lang, chat_id)

            ru_translation = analysis_data.get('ru_translation', '')
            feedback = analysis_data.get('feedback', '')
            detected_weakness = analysis_data.get('detected_weakness')

            if detected_weakness:
                database.add_or_update_weakness(chat_id, detected_weakness)

            text_msg = (
                f"🗣 <b>Оригинал:</b>\n{clean_text}\n\n"
                f"🇷🇺 <b>Перевод:</b>\n{ru_translation}\n\n"
                f"💡 <b>Разбор произношения и грамматики:</b>\n{feedback}"
            )
            bot.send_message(chat_id, text_msg, parse_mode="HTML")

    except Exception as e:
        import traceback
        traceback.print_exc()
        bot.send_message(chat_id, f"⚠️ Ошибка обработки аудио: {str(e)}")

    finally:
        # 🔥 ФАЙЛ УДАЛЯЕТСЯ ТОЛЬКО ЗДЕСЬ (когда всё уже точно выполнено)
        if os.path.exists(file_path):
            os.remove(file_path)


# ==========================================
# 2. ТЕКСТОВЫЙ МАРКЕР '!' ДЛЯ ОЗВУЧКИ
# ==========================================
@bot.message_handler(func=lambda message: message.text and message.text.strip().startswith("!"), content_types=['text'])
def handle_text_tts_request(message):
    chat_id = message.chat.id
    raw_text = message.text.strip()

    user_config = database.get_user_config(chat_id) or {}
    target_lang = user_config.get("source_lang", "en")
    lang_flag = "🇬🇧" if target_lang == "en" else "🇩🇪"
    lang_name = "английский" if target_lang == "en" else "немецкий"

    # 🔥 ДОСТАЕМ НОВЫЕ НАСТРОЙКИ (голос и скорость)
    user_voice = user_config.get(f"tts_voice_{target_lang}")
    tts_rate = user_config.get("tts_rate", "-15%")

    text_to_process = raw_text[1:].strip()
    if not text_to_process:
        bot.send_message(chat_id,
                         "⚠️ Напиши текст после символа <code>!</code>.\nПример: <i>! Доброе утро, как дела?</i>",
                         parse_mode="HTML")
        return

    bot.send_chat_action(chat_id, 'record_audio')

    try:
        prompt = f"Переведи эту фразу на {lang_name} язык. Выдай ТОЛЬКО чистый перевод, без лишних слов, кавычек и пояснений:\n{text_to_process}"
        translated_text = ask_ai(prompt, temperature=0.3, chat_id=chat_id).strip()

        bot.send_message(chat_id, f"{lang_flag} <b>{translated_text}</b>", parse_mode="HTML")

        # Озвучиваем с новыми параметрами
        tts_path = f"temp_text_tts_{chat_id}_{uuid.uuid4().hex[:6]}.mp3"
        asyncio.run(generate_user_voice(translated_text, target_lang, tts_path, user_voice=user_voice, tts_rate=tts_rate))

        with open(tts_path, 'rb') as audio_file:
            bot.send_voice(chat_id, audio_file)

        if os.path.exists(tts_path):
            os.remove(tts_path)

    except Exception as e:
        print(f"❌ Ошибка в режиме озвучки текста: {e}")
        bot.send_message(chat_id, "⚠️ Не удалось перевести или озвучить текст.")