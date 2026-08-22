# ==========================================
# ФАЙЛ: database.py
# ==========================================
import sqlite3
import random
import time
import re

DB_NAME = "mentor_bot.db"


def init_db():

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    # 1. ТАБЛИЦА НАСТРОЕК (со всеми актуальными полями)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS user_settings
                   (
                       chat_id
                       INTEGER
                       PRIMARY
                       KEY,
                       difficulty
                       TEXT,
                       source_lang
                       TEXT,
                       words_per_day
                       INTEGER
                       DEFAULT
                       5,
                       phrases_per_day
                       INTEGER
                       DEFAULT
                       10,
                       username
                       TEXT,
                       ai_provider
                       TEXT
                       DEFAULT
                       'gemini',
                       gender
                       TEXT
                       DEFAULT
                       'male'
                   )
                   ''')
    # 2. ТАБЛИЦА ДЛЯ АКТИВНЫХ ЗАДАНИЙ (ФРАЗЫ)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS active_tasks
                   (
                       chat_id
                       INTEGER
                       PRIMARY
                       KEY,
                       phrase
                       TEXT,
                       rule
                       TEXT,
                       foreign_phrase
                       TEXT,
                       help_count
                       INTEGER
                       DEFAULT
                       0
                   )
                   ''')

    # 3. ТАБЛИЦА ИСТОРИИ ВЫДАННЫХ ФРАЗ
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS task_history
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       phrase
                       TEXT,
                       date
                       TEXT
                       DEFAULT (
                       DATE
                   (
                       'now',
                       'localtime'
                   ))
                       )
                   ''')

    # 4. ОБНОВЛЕННАЯ ТАБЛИЦА ИНТЕРВАЛЬНОГО СЛОВАРЯ (МУЛЬТИЯЗЫЧНАЯ)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS user_dictionary
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       lang
                       TEXT
                       DEFAULT
                       'en',
                       word_foreign
                       TEXT,
                       word_ru
                       TEXT,
                       score
                       INTEGER
                       DEFAULT
                       0,
                       next_review
                       TEXT
                       DEFAULT (
                       DATE
                   (
                       'now',
                       'localtime'
                   )),
                       last_correct TEXT
                       )
                   ''')
    # 5. ТАБЛИЦА для подсчета выполненных фраз
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS daily_completions
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       completed_at
                       DATE
                       DEFAULT (
                       DATE
                   (
                       'now',
                       'localtime'
                   ))
                       )
                   """)
    # 6. ТАБЛИЦА для подсчета выученных слов по сессиям тренировок
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS daily_word_completions
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       count
                       INTEGER,
                       completed_at
                       DATE
                       DEFAULT (
                       DATE
                   (
                       'now',
                       'localtime'
                   ))
                       )
                   ''')

    # 7. 🔥 ТАБЛИЦА ДЛЯ УЧЕТА СЛОВ ИЗ ГЛОБАЛЬНОГО СЛОВАРЯ ПО ID
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_words_stats
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       word_id
                       INTEGER,
                       lang
                       TEXT,
                       usage_count
                       INTEGER
                       DEFAULT
                       0,
                       UNIQUE
                   (
                       chat_id,
                       word_id,
                       lang
                   )
                       )
                   ''')

    # 8. 🔥 ТАБЛИЦА ДЛЯ УЧЕТА ГРАММАТИЧЕСКИХ МАРКЕРОВ И ФОНОВЫХ СЛОВ
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS grammar_usage_stats
                   (
                       chat_id
                       INTEGER,
                       item_key
                       TEXT,
                       item_type
                       TEXT,
                       usage_count
                       INTEGER
                       DEFAULT
                       0,
                       UNIQUE
                   (
                       chat_id,
                       item_key,
                       item_type
                   )
                       )
                   ''')

    # ТАБЛИЦА ГЛОБАЛЬНОГО СЛОВАРЯ (из JSON)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_dictionary
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY,
                       lang
                       TEXT,
                       level
                       TEXT,
                       part_of_speech
                       TEXT,
                       word_foreign
                       TEXT
                   )
                   ''')

    # ТАБЛИЦА СКРЫТЫХ ГЛОБАЛЬНЫХ СЛОВ (ЧЕРНЫЙ СПИСОК)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_hidden_words
                   (
                       chat_id
                       INTEGER,
                       word_id
                       INTEGER,
                       UNIQUE
                   (
                       chat_id,
                       word_id
                   )
                       )
                   ''')

    # ТАБЛИЦА ДЛЯ ДИНАМИЧЕСКИХ СЛАБЫХ СТОРОН (ИЗ ЧАТА И УПРАЖНЕНИЙ)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS user_weaknesses
                   (
                       chat_id
                       INTEGER,
                       weakness_topic
                       TEXT,
                       error_count
                       INTEGER
                       DEFAULT
                       1,
                       last_detected
                       TIMESTAMP,
                       status
                       TEXT
                       DEFAULT
                       'active',
                       PRIMARY
                       KEY
                   (
                       chat_id,
                       weakness_topic
                   )
                       )
                   ''')

    # ТАБЛИЦА ФРАЗОВЫХ ГЛАГОЛОВ
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_phrasal_verbs
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       word_foreign
                       TEXT
                       UNIQUE,
                       word_ru
                       TEXT
                   )
                   ''')






    # --- МИГРАЦИИ ---
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN words_per_day INTEGER DEFAULT 5")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_dictionary ADD COLUMN lang TEXT DEFAULT 'en'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_dictionary RENAME COLUMN word_en TO word_foreign")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN username TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN phrases_per_day INTEGER DEFAULT 10")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN ai_provider TEXT DEFAULT 'gemini'")  # 👈 МЕНЯЕМ ЗДЕСЬ
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE active_tasks ADD COLUMN foreign_phrase TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_dictionary ADD COLUMN global_word_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN gender TEXT DEFAULT 'male'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN tts_voice_en TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN tts_voice_de TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN tts_rate TEXT DEFAULT '-15%'")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()









def get_connection():
    return sqlite3.connect(DB_NAME, check_same_thread=False)



# --- ФУНКЦИИ ДЛЯ НАСТРОЕК ---
def get_user_config(chat_id):
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Получаем базовые настройки
    cursor.execute(
        "SELECT difficulty, source_lang, words_per_day, phrases_per_day, username, ai_provider, gender, tts_voice_en, tts_voice_de, tts_rate FROM user_settings WHERE chat_id = ?",
        (chat_id,))
    row = cursor.fetchone()

    # 🔥 2. ДОБАВЛЯЕМ СТАТИСТИКУ ДЛЯ ПРОГРЕСС-БАРОВ

    # Считаем слова на повторение (тот самый долг для мини-бара)
    cursor.execute("""
                   SELECT COUNT(*)
                   FROM user_dictionary
                   WHERE chat_id = ?
                     AND score > 0
                     AND next_review <= DATE ('now'
                       , 'localtime')
                   """, (chat_id,))
    review_count = cursor.fetchone()[0]

    # Считаем выученные новые слова за сегодня
    cursor.execute("""
                   SELECT SUM(count)
                   FROM daily_word_completions
                   WHERE chat_id = ?
                     AND completed_at = DATE ('now'
                       , 'localtime')
                   """, (chat_id,))
    words_today_row = cursor.fetchone()
    words_today = words_today_row[0] if words_today_row and words_today_row[0] is not None else 0

    # Считаем пройденные фразы за сегодня
    cursor.execute("""
                   SELECT COUNT(*)
                   FROM daily_completions
                   WHERE chat_id = ?
                     AND completed_at = DATE ('now'
                       , 'localtime')
                   """, (chat_id,))
    phrases_today = cursor.fetchone()[0]

    conn.close()

    if row:
        return {
            "difficulty": row[0],
            "source_lang": row[1],
            "words_per_day": row[2] if row[2] is not None else 5,
            "phrases_per_day": row[3] if row[3] is not None else 10,
            "username": row[4],
            "ai_provider": row[5] if row[5] is not None else "gemini",
            "gender": row[6] if len(row) > 6 and row[6] is not None else "male",
            "tts_voice_en": row[7] if len(row) > 7 else None,  # 🔥 Достаем голос EN
            "tts_voice_de": row[8] if len(row) > 8 else None,  # 🔥 Достаем голос DE
            "tts_rate": row[9] if len(row) > 9 and row[9] is not None else "-15%",  # 🔥 Достаем скорость
            "review_count": review_count,
            "words_today": words_today,
            "phrases_today": phrases_today
        }

    return None


def create_empty_user(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT OR IGNORE INTO user_settings (chat_id, difficulty, source_lang) VALUES (?, NULL, NULL)",
                       (chat_id,))
        conn.commit()
    except sqlite3.Error as e:
        print(f"🔴 Ошибка при создании пустого пользователя: {e}")
    finally:
        conn.close()


def update_user_setting(chat_id, key, value):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO user_settings (chat_id) VALUES (?)", (chat_id,))
    if key in ["difficulty", "source_lang", "words_per_day", "phrases_per_day", "username", "ai_provider", "gender",
               "tts_voice_en", "tts_voice_de", "tts_rate"]:
        cursor.execute(f"UPDATE user_settings SET {key} = ? WHERE chat_id = ?", (value, chat_id))
    conn.commit()
    conn.close()


# --- ФУНКЦИИ ДЛЯ АКТИВНЫХ ЗАДАНИЙ ---
def save_active_task(chat_id, phrase, rule, foreign_phrase=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO active_tasks (chat_id, phrase, rule, foreign_phrase, help_count) VALUES (?, ?, ?, ?, 0)',
                   (chat_id, phrase, rule, foreign_phrase))
    conn.commit()
    conn.close()


def get_active_task(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT phrase, rule, help_count, foreign_phrase FROM active_tasks WHERE chat_id = ?", (chat_id,))
    row = cursor.fetchone()
    conn.close()
    if row: return {"phrase": row[0], "rule": row[1], "help_count": row[2], "foreign_phrase": row[3]}
    return None


def increment_help_count(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE active_tasks SET help_count = help_count + 1 WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()


def delete_active_task(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM active_tasks WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()


def add_to_history(chat_id, phrase):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO task_history (chat_id, phrase) VALUES (?, ?)", (chat_id, phrase))
    conn.commit()
    conn.close()


def get_today_phrases_list(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT phrase FROM task_history WHERE chat_id = ? AND date = DATE('now', 'localtime')", (chat_id,))
    rows = cursor.fetchall()
    conn.close()
    return [row[0].strip().lower() for row in rows] if rows else []


# --- ФУНКЦИИ ИНТЕРВАЛЬНОГО СЛОВАРЯ ---
def get_words_for_training(chat_id, limit, mode='new', source='user', pos='mix'):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    conn = get_connection()
    cursor = conn.cursor()
    result = []

    if source == 'oxford':
        try:
            # 🔥 В global_dictionary нет word_ru, выбираем только id и word_foreign
            query = f"""
                SELECT id, word_foreign 
                FROM global_dictionary 
                WHERE lang = ? 
                  AND NOT EXISTS (
                      SELECT 1 FROM user_dictionary 
                      WHERE chat_id = ? AND lang = ? 
                        AND LOWER(TRIM(user_dictionary.word_foreign)) = LOWER(TRIM(global_dictionary.word_foreign))
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM global_hidden_words 
                      WHERE chat_id = ? AND global_hidden_words.word_id = global_dictionary.id
                  )
                ORDER BY RANDOM() LIMIT ?
            """
            cursor.execute(query, (current_lang, chat_id, current_lang, chat_id, limit))
            for row in cursor.fetchall():
                # Возвращаем (id, foreign, ru="", score=0)
                result.append((row[0], row[1], "", 0))
        except Exception as e:
            print(f"❌ Ошибка SQL в get_words_for_training (oxford): {e}")
    else:
        # Логика для личного словаря
        if mode == 'review':
            cursor.execute(
                "SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ? AND score > 0 AND next_review <= DATE('now', 'localtime') LIMIT ?",
                (chat_id, current_lang, limit)
            )
            result.extend(cursor.fetchall())
        else:
            cursor.execute(
                "SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ? AND score = 0 LIMIT ?",
                (chat_id, current_lang, limit)
            )
            result.extend(cursor.fetchall())

    conn.close()
    return result


import re  # 👈 Добавь наверх файла, если его там нет





def get_phrasal_verbs_by_lang(chat_id: int, lang: str, limit: int = 5):
    conn = get_connection()
    cursor = conn.cursor()

    # Выбираем таблицу в зависимости от языка
    table_name = "global_german_verbs" if lang == 'de' else "global_phrasal_verbs"

    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name = ?;", (table_name,))
    if not cursor.fetchone():
        conn.close()
        return []

    query = f"""
        SELECT id, word_foreign, word_ru
        FROM {table_name}
        WHERE NOT EXISTS (
            SELECT 1 FROM user_dictionary 
            WHERE chat_id = ? 
              AND LOWER(TRIM(user_dictionary.word_foreign)) = LOWER(TRIM({table_name}.word_foreign))
        )
        AND NOT EXISTS (
            SELECT 1 FROM global_hidden_words 
            WHERE chat_id = ? AND word_id = {table_name}.id
        )
        ORDER BY RANDOM() LIMIT ? 
    """
    cursor.execute(query, (chat_id, chat_id, limit))
    rows = cursor.fetchall()

    # Если английский, забираем все фразы для генерации ложных ответов
    if lang == 'en':
        cursor.execute(f"SELECT word_foreign FROM {table_name}")
        all_foreign = [r[0] for r in cursor.fetchall()]

    conn.close()

    result = []

    # Списки для генерации ложных вариантов в немецком
    GERMAN_PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'gegen', 'in', 'mit', 'nach', 'über', 'um', 'unter', 'von', 'vor',
                    'zu', 'zwischen']
    GERMAN_CASES = ['Akk', 'Dat', 'Gen', 'Nom']

    for row in rows:
        word_id = row[0]
        foreign_phrase = row[1]
        russian_translation = row[2] if row[2] else foreign_phrase

        if lang == 'de':
            # --- НЕМЕЦКИЙ КОНСТРУКТОР (2 КАРТОЧКИ ИЗ 1 СЛОВА) ---
            v_match = re.search(r'\{\{c1::(.*?)\}\}', foreign_phrase)
            p_match = re.search(r'\{\{c2::(.*?)\}\}', foreign_phrase)
            c_match = re.search(r'\{\{c3::(.*?)\}\}', foreign_phrase)

            if v_match and p_match and c_match:
                verb = v_match.group(1)
                prep = p_match.group(1)
                case = c_match.group(1)

                # КАРТОЧКА 1: Угадай предлог (приставку)
                q1_text = f"{russian_translation}<br><span style='font-size: 22px; color: #a881f3; display: block; margin-top: 12px;'>{verb} ___ + {case}</span>"
                wrong_preps = random.sample([p for p in GERMAN_PREPS if p != prep], 2)
                opts1 = [prep] + wrong_preps
                random.shuffle(opts1)

                result.append({
                    "id": word_id,
                    "foreign": prep,  # 👈 Правильный ответ для кнопок
                    "ru": q1_text,  # 👈 Задание сверху (Русский + формула)
                    "options": opts1,
                    "score": 0
                })

                # КАРТОЧКА 2: Угадай падеж
                q2_text = f"{russian_translation}<br><span style='font-size: 22px; color: #a881f3; display: block; margin-top: 12px;'>{verb} {prep} + ___</span>"
                wrong_cases = random.sample([c for c in GERMAN_CASES if c != case], 2)
                opts2 = [case] + wrong_cases
                random.shuffle(opts2)

                result.append({
                    "id": word_id,
                    "foreign": case,  # 👈 Правильный ответ для кнопок
                    "ru": q2_text,  # 👈 Задание сверху (Русский + формула)
                    "options": opts2,
                    "score": 0
                })
            else:
                # Резервный вариант, если слово без разметки Anki
                clean_foreign = re.sub(r'\{\{c\d+::(.*?)\}\}', r'\1', foreign_phrase)
                opts = [clean_foreign] + random.sample(GERMAN_PREPS, 2)
                random.shuffle(opts)
                result.append({
                    "id": word_id,
                    "foreign": clean_foreign,
                    "ru": russian_translation,
                    "options": opts,
                    "score": 0
                })

        else:
            # --- АНГЛИЙСКИЙ СТАНДАРТ (1 КАРТОЧКА) ---
            other_foreign = [f for f in all_foreign if f != foreign_phrase]
            wrong_options = random.sample(other_foreign, min(2, len(other_foreign))) if other_foreign else ["error",
                                                                                                            "fail"]

            options = [foreign_phrase] + wrong_options
            random.shuffle(options)

            result.append({
                "id": word_id,
                "foreign": foreign_phrase,  # 👈 Иностранное слово (ПРАВИЛЬНЫЙ ОТВЕТ НА КНОПКЕ)
                "ru": russian_translation,  # 👈 Русское слово (ЗАДАНИЕ СВЕРХУ)
                "options": options,
                "score": 0
            })

    # Перемешиваем итоговый массив
    random.shuffle(result)
    return result[:limit]


# Функция добавления понравившегося слова в личный словарь
def add_oxford_words_batch(chat_id, words_list):
    """Массово копирует выбранные слова из Оксфорда в личный словарь пользователя"""
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    conn = get_connection()
    cursor = conn.cursor()
    try:
        for w in words_list:
            cursor.execute("""
                INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru, score, global_word_id)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (chat_id, current_lang, w["foreign"], w["ru"], w["word_id"]))
        conn.commit()
    except Exception as e:
        print(f"Ошибка сохранения батча слов Оксфорда: {e}")
    finally:
        conn.close()


def update_word_progress(chat_id, word_id, is_correct, mode="new", source="user", foreign="", ru=""):
    conn = get_connection()
    cursor = conn.cursor()

    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"

    local_id = word_id

    if source in ('oxford', 'phrasal'):
        # Проверяем, добавлено ли уже это оксфордское слово в твой личный словарь
        cursor.execute("SELECT id, score FROM user_dictionary WHERE chat_id = ? AND global_word_id = ?",
                       (chat_id, word_id))
        row = cursor.fetchone()

        if not row:
            # Если нет - ДОБАВЛЯЕМ ЕГО НАВСЕГДА в твой словарь с привязкой к Оксфорду!
            cursor.execute("""
                           INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru, score, global_word_id)
                           VALUES (?, ?, ?, ?, 0, ?)
                           """, (chat_id, current_lang, foreign, ru, word_id))
            local_id = cursor.lastrowid
            current_score = 0
        else:
            local_id = row[0]
            current_score = row[1]
    else:
        # Работа с личным словарем
        cursor.execute("SELECT score FROM user_dictionary WHERE id = ?", (local_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return
        current_score = row[0]

    # --- Сохранение прогресса (интервальное повторение) ---
    if current_score > 5:
        current_score = 5

    if is_correct:
        new_score = current_score + 1
    else:
        if mode == "review":
            new_score = current_score - 1
        else:
            new_score = 0

    if new_score > 5: new_score = 5
    if new_score < 0: new_score = 0

    days_to_add = 0
    if new_score == 5:
        days_to_add = 30
    elif new_score == 4:
        days_to_add = 14
    elif new_score == 3:
        days_to_add = 7
    elif new_score == 2:
        days_to_add = 3
    elif new_score == 1:
        days_to_add = 1
    else:
        days_to_add = 0

    cursor.execute(f"""
        UPDATE user_dictionary 
        SET score = ?, 
            last_correct = DATE('now', 'localtime'),
            next_review = DATE('now', 'localtime', '+{days_to_add} days')
        WHERE id = ?
    """, (new_score, local_id))

    conn.commit()
    conn.close()


def mark_word_as_known(chat_id, word_id, word_foreign, source):
    conn = get_connection()
    cursor = conn.cursor()

    if source in ('oxford', 'phrasal'):
        # Для Оксфорда: добавляем в черный список (больше никогда не выпадет)
        cursor.execute("INSERT OR IGNORE INTO global_hidden_words (chat_id, word_id) VALUES (?, ?)", (chat_id, word_id))

    else:
        # Для личного словаря: ставим 100% (score=5) и отодвигаем дату повторения на 10 лет (+3650 дней)
        cursor.execute(f"""
            UPDATE user_dictionary 
            SET score = 5, 
                last_correct = DATE('now', 'localtime'),
                next_review = DATE('now', 'localtime', '+3650 days')
            WHERE id = ? AND chat_id = ?
        """, (word_id, chat_id))

    conn.commit()
    conn.close()


def get_full_dictionary(chat_id, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ?",
                   (chat_id, current_lang))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "foreign": row[1], "ru": row[2], "score": row[3]} for row in rows]


def add_custom_word(chat_id, word_foreign, word_ru, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
        (chat_id, current_lang, word_foreign.strip()))

    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru) VALUES (?, ?, ?, ?)",
                       (chat_id, current_lang, word_foreign.strip().lower(), word_ru.strip().lower()))
        conn.commit()
        saved = True
    else:
        saved = False
    conn.close()
    return saved


def get_words_for_grammar_context(chat_id, limit=1):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT word_foreign, word_ru FROM user_dictionary WHERE chat_id = ? AND lang = ? ORDER BY score ASC, RANDOM() LIMIT ?",
        (chat_id, current_lang, limit))
    rows = cursor.fetchall()
    conn.close()
    return [{"foreign": row[0], "ru": row[1]} for row in rows]


def update_word_intensity_progress(chat_id, word_text, intensity_score):
    intervals = {0: 1, 1: 3, 2: 7, 3: 30, 4: 90, 5: 180}
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, score FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
        (chat_id, current_lang, word_text.strip()))
    row = cursor.fetchone()

    if row:
        word_id, current_score = row
        if intensity_score == 5:
            new_score = min(current_score + 1, 5)
            days = int(intervals.get(new_score, 30) * 1.5)
        else:
            new_score = current_score
            days = intervals.get(new_score, 30)
        cursor.execute(
            "UPDATE user_dictionary SET score = ?, next_review = DATE('now', 'localtime', ?), last_correct = DATE('now', 'localtime') WHERE id = ?",
            (new_score, f"+{days} days", word_id))
        conn.commit()
        conn.close()
        return {"updated": True, "new_score": new_score, "days_added": days}

    conn.close()
    return {"updated": False}


def update_user_word(chat_id, word_foreign, new_ru):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE user_dictionary SET word_ru = ? WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
        (new_ru.strip().lower(), chat_id, current_lang, word_foreign.strip()))
    conn.commit()
    conn.close()


def delete_custom_word(chat_id, word_foreign, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang
    conn = get_connection()
    cursor = conn.cursor()

    # 🔥 ИСПОЛЬЗУЕМ TRIM: теперь база удалит слово, даже если оно сохранилось с лишними пробелами или переносами строк
    cursor.execute(
        "DELETE FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(TRIM(word_foreign)) = LOWER(TRIM(?))",
        (chat_id, current_lang, word_foreign))
    conn.commit()
    conn.close()


# --- СТАТИСТИКА ПРОХОЖДЕНИЙ ---
def add_successful_completion(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO daily_completions (chat_id, completed_at) VALUES (?, DATE('now', 'localtime'))",
                   (chat_id,))
    conn.commit()
    conn.close()


def get_today_completions_count(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM daily_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
        (chat_id,))
    count = cursor.fetchone()[0] or 0
    conn.close()
    return count


def add_word_completions(chat_id, count):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO daily_word_completions (chat_id, count, completed_at) VALUES (?, ?, DATE('now', 'localtime'))",
        (chat_id, count))
    conn.commit()
    conn.close()


def get_today_word_completions_count(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT SUM(count) FROM daily_word_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
        (chat_id,))
    row = cursor.fetchone()
    count = row[0] if row and row[0] is not None else 0
    conn.close()
    return count


# ==========================================
# 🔥 НОВЫЙ БЛОК: ТРЕКИНГ УМНОГО ВЫБОРА СЛОВ
# ==========================================

def track_global_word_usage(chat_id: int, word_id: int, lang: str):
    """Фиксирует использование слова из глобального словаря (Оксфорд) по его ID."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT usage_count FROM global_words_stats WHERE chat_id = ? AND word_id = ? AND lang = ?",
                       (chat_id, word_id, lang))
        row = cursor.fetchone()

        if row:
            cursor.execute(
                "UPDATE global_words_stats SET usage_count = usage_count + 1 WHERE chat_id = ? AND word_id = ? AND lang = ?",
                (chat_id, word_id, lang))
        else:
            cursor.execute("INSERT INTO global_words_stats (chat_id, word_id, lang, usage_count) VALUES (?, ?, ?, 1)",
                           (chat_id, word_id, lang))
        conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в track_global_word_usage: {e}")
    finally:
        conn.close()


def get_grammar_usage_stats(chat_id: int, item_type: str) -> dict:
    """Возвращает словарь {item_key: usage_count} для умной сортировки маркеров и фона."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT item_key, usage_count FROM grammar_usage_stats WHERE chat_id = ? AND item_type = ?",
                   (chat_id, item_type))
    result = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return result


def track_grammar_usage(chat_id: int, item_key: str, item_type: str):
    """Увеличивает счетчик использования конкретного маркера или фонового слова."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        str_key = str(item_key)
        cursor.execute(
            "SELECT usage_count FROM grammar_usage_stats WHERE chat_id = ? AND item_key = ? AND item_type = ?",
            (chat_id, str_key, item_type))
        if cursor.fetchone():
            cursor.execute(
                "UPDATE grammar_usage_stats SET usage_count = usage_count + 1 WHERE chat_id = ? AND item_key = ? AND item_type = ?",
                (chat_id, str_key, item_type))
        else:
            cursor.execute(
                "INSERT INTO grammar_usage_stats (chat_id, item_key, item_type, usage_count) VALUES (?, ?, ?, 1)",
                (chat_id, str_key, item_type))
        conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в track_grammar_usage: {e}")
    finally:
        conn.close()


# --- ФУНКЦИИ ГЛОБАЛЬНОГО СЛОВАРЯ ДЛЯ ВИКТОРИНЫ ---
def hide_global_word(chat_id, word_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO global_hidden_words (chat_id, word_id) VALUES (?, ?)", (chat_id, word_id))
    conn.commit()
    conn.close()


def get_global_word_by_id(word_id):
    conn = get_connection()
    cursor = conn.cursor()

    # Сначала ищем в Оксфорде
    cursor.execute("SELECT word_foreign FROM global_dictionary WHERE id = ?", (word_id,))
    row = cursor.fetchone()

    # Если не нашли, значит это фразовый глагол (у них ID от 1 000 000)
    if not row:
        cursor.execute("SELECT word_foreign FROM global_phrasal_verbs WHERE id = ?", (word_id,))
        row = cursor.fetchone()

    conn.close()
    if row:
        return {"foreign": row[0]}
    return None


def get_random_global_words(chat_id, target_lang, difficulty_setting, limit=1):
    level_map = {
        "1":  ["A1", "A2", "B1", "B2", "C1", "C2"],
        "A1": ["A1", "A2", "B1", "B2", "C1", "C2"],

        "2":  ["A2", "B1", "B2", "C1", "C2"],
        "A2": ["A2", "B1", "B2", "C1", "C2"],

        "3":  ["B1", "B2", "C1", "C2"],
        "B1": ["B1", "B2", "C1", "C2"],

        "4":  ["B2", "C1", "C2"],
        "B2": ["B2", "C1", "C2"],

        "5":  ["C1", "C2"],
        "C1": ["C1", "C2"],

        "6":  ["C2"],
        "C2": ["C2"]
    }

    # ---------------------------------------------------------
    # 1. Нормализуем настройки
    # ---------------------------------------------------------

    diff_str = str(difficulty_setting).upper().strip()
    lang_str = str(target_lang).lower().strip()

    allowed_levels = level_map.get(diff_str)

    if allowed_levels is None:
        print("❌ GLOBAL WORDS: неизвестный уровень сложности!")
        print(f"   difficulty_setting = {difficulty_setting!r}")
        print(f"   diff_str            = {diff_str!r}")

        # Сохраняем старое поведение
        allowed_levels = ["B1", "B2", "C1", "C2"]

    print("\n" + "=" * 60)
    print("🔎 GLOBAL WORDS DEBUG")
    print("=" * 60)
    print(f"chat_id            : {chat_id}")
    print(f"target_lang        : {target_lang!r}")
    print(f"normalized lang    : {lang_str!r}")
    print(f"difficulty         : {difficulty_setting!r}")
    print(f"normalized diff    : {diff_str!r}")
    print(f"allowed levels     : {allowed_levels}")
    print(f"limit              : {limit}")

    # ---------------------------------------------------------
    # 2. Подключаемся к базе
    # ---------------------------------------------------------

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # -----------------------------------------------------
        # 3. Проверяем, сколько вообще слов есть в базе
        #    для этого языка
        # -----------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM global_dictionary
            WHERE LOWER(TRIM(lang)) = ?
            """,
            (lang_str,)
        )

        total_lang_words = cursor.fetchone()[0]

        print(f"📚 Слов для языка '{lang_str}': {total_lang_words}")

        if total_lang_words == 0:
            print("❌ ПРОБЛЕМА: в global_dictionary нет слов для этого языка.")

            # Показываем, какие языки реально есть
            cursor.execute(
                """
                SELECT lang, COUNT(*)
                FROM global_dictionary
                GROUP BY lang
                ORDER BY lang
                """
            )

            available_langs = cursor.fetchall()

            print("📋 Языки, которые реально есть в базе:")

            if available_langs:
                for lang, count in available_langs:
                    print(f"   {lang!r}: {count} слов")
            else:
                print("   ❌ global_dictionary вообще пустая!")

            return []

        # -----------------------------------------------------
        # 4. Проверяем количество слов по нужным уровням
        # -----------------------------------------------------

        placeholders = ",".join(["?"] * len(allowed_levels))

        cursor.execute(
            f"""
            SELECT level, COUNT(*)
            FROM global_dictionary
            WHERE LOWER(TRIM(lang)) = ?
              AND UPPER(TRIM(level)) IN ({placeholders})
            GROUP BY level
            ORDER BY level
            """,
            [lang_str] + allowed_levels
        )

        level_counts = cursor.fetchall()

        print("📊 Слова по подходящим уровням:")

        found_levels = set()

        for level, count in level_counts:
            found_levels.add(str(level).upper().strip())
            print(f"   {level}: {count}")

        missing_levels = [
            level for level in allowed_levels
            if level not in found_levels
        ]

        if missing_levels:
            print(f"⚠️ В базе отсутствуют уровни: {missing_levels}")

        # -----------------------------------------------------
        # 5. Считаем скрытые слова пользователя
        # -----------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM global_hidden_words
            WHERE chat_id = ?
            """,
            (chat_id,)
        )

        hidden_count = cursor.fetchone()[0]

        print(f"🚫 Скрытых слов пользователя: {hidden_count}")

        # -----------------------------------------------------
        # 6. Сколько слов остаётся ДО исключения скрытых
        # -----------------------------------------------------

        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM global_dictionary
            WHERE LOWER(TRIM(lang)) = ?
              AND UPPER(TRIM(level)) IN ({placeholders})
            """,
            [lang_str] + allowed_levels
        )

        available_before_hidden = cursor.fetchone()[0]

        print(
            f"📦 Подходящих слов до исключения скрытых: "
            f"{available_before_hidden}"
        )

        # -----------------------------------------------------
        # 7. Сколько остаётся ПОСЛЕ исключения скрытых
        #
        # Используем NOT EXISTS вместо NOT IN.
        # -----------------------------------------------------

        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM global_dictionary gd
            WHERE LOWER(TRIM(gd.lang)) = ?
              AND UPPER(TRIM(gd.level)) IN ({placeholders})
              AND NOT EXISTS (
                  SELECT 1
                  FROM global_hidden_words gh
                  WHERE gh.chat_id = ?
                    AND gh.word_id = gd.id
              )
            """,
            [lang_str] + allowed_levels + [chat_id]
        )

        available_after_hidden = cursor.fetchone()[0]

        print(
            f"✅ Доступных слов после исключения скрытых: "
            f"{available_after_hidden}"
        )

        # -----------------------------------------------------
        # 8. Если доступных слов нет — подробно объясняем
        # -----------------------------------------------------

        if available_after_hidden == 0:

            print("❌ НЕТ ДОСТУПНЫХ СЛОВ!")

            if available_before_hidden == 0:
                print(
                    "   Причина: для выбранного языка и уровней "
                    "вообще нет слов."
                )

                print(
                    f"   language = {lang_str}"
                )

                print(
                    f"   levels   = {allowed_levels}"
                )

            else:
                print(
                    "   Причина: все подходящие слова скрыты "
                    "пользователем."
                )

                print(
                    f"   Всего подходящих слов: "
                    f"{available_before_hidden}"
                )

                print(
                    f"   Скрытых слов: {hidden_count}"
                )

            return []

        # -----------------------------------------------------
        # 9. Основной запрос
        # -----------------------------------------------------

        query = f"""
            SELECT
                gd.id,
                gd.word_foreign
            FROM global_dictionary gd
            WHERE LOWER(TRIM(gd.lang)) = ?
              AND UPPER(TRIM(gd.level)) IN ({placeholders})
              AND NOT EXISTS (
                  SELECT 1
                  FROM global_hidden_words gh
                  WHERE gh.chat_id = ?
                    AND gh.word_id = gd.id
              )
            ORDER BY RANDOM()
            LIMIT ?
        """

        params = [
            lang_str
        ] + allowed_levels + [
            chat_id,
            limit
        ]

        print("🔍 Выполняем основной запрос...")
        print(f"   language = {lang_str}")
        print(f"   levels   = {allowed_levels}")
        print(f"   chat_id  = {chat_id}")
        print(f"   limit    = {limit}")

        cursor.execute(query, params)

        rows = cursor.fetchall()

        # -----------------------------------------------------
        # 10. Проверяем результат
        # -----------------------------------------------------

        if not rows:
            print("❌ SQL вернул 0 слов!")
            return []

        print(f"🎯 Найдено слов: {len(rows)}")

        for row in rows:
            print(f"   ID={row[0]} | WORD={row[1]}")

        print("=" * 60 + "\n")

        return [
            {
                "id": row[0],
                "foreign": row[1]
            }
            for row in rows
        ]

    except sqlite3.Error as e:

        print("\n" + "=" * 60)
        print("🔴 ОШИБКА SQLITE В get_random_global_words()")
        print("=" * 60)
        print(f"Ошибка: {e}")
        print(f"chat_id: {chat_id}")
        print(f"target_lang: {target_lang!r}")
        print(f"difficulty: {difficulty_setting!r}")
        print(f"allowed_levels: {allowed_levels}")
        print("=" * 60 + "\n")

        return []

    except Exception as e:

        print("\n" + "=" * 60)
        print("🔴 НЕОЖИДАННАЯ ОШИБКА В get_random_global_words()")
        print("=" * 60)
        print(f"Ошибка: {e}")
        print(f"Тип ошибки: {type(e).__name__}")
        print("=" * 60 + "\n")

        return []

    finally:
        conn.close()


# ==========================================
# 🔥 БЛОК: УЧЕТ СЛАБЫХ СТОРОН (ЖИВОЙ ЧАТ)
# ==========================================




def add_or_update_weakness(chat_id: int, topic: str):
    if not topic or str(topic).strip().lower() == "null":
        return

    conn = get_connection()
    cursor = conn.cursor()

    clean_topic = topic.strip()

    try:
        cursor.execute("""
                       SELECT error_count
                       FROM user_weaknesses
                       WHERE chat_id = ?
                         AND LOWER(weakness_topic) = LOWER(?)
                       """, (chat_id, clean_topic))
        row = cursor.fetchone()

        now = time.time()
        if row:
            new_count = row[0] + 1
            cursor.execute("""
                           UPDATE user_weaknesses
                           SET error_count   = ?,
                               last_detected = ?,
                               status        = 'active'
                           WHERE chat_id = ?
                             AND LOWER(weakness_topic) = LOWER(?)
                           """, (new_count, now, chat_id, clean_topic))
        else:
            cursor.execute("""
                           INSERT INTO user_weaknesses (chat_id, weakness_topic, error_count, last_detected, status)
                           VALUES (?, ?, 1, ?, 'active')
                           """, (chat_id, clean_topic, now))

        conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в add_or_update_weakness: {e}")
    finally:
        conn.close()


def get_active_weaknesses(chat_id: int, limit: int = 3) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
                   SELECT weakness_topic, error_count
                   FROM user_weaknesses
                   WHERE chat_id = ?
                     AND status = 'active'
                   ORDER BY error_count DESC LIMIT ?
                   """, (chat_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [{"topic": r[0], "count": r[1]} for r in rows]

def heal_weakness(chat_id: int, topic: str):
    """Уменьшает счетчик ошибок слабого места. Если доходит до 0 — помечает как решенное."""
    if not topic or str(topic).strip().lower() == "null":
        return

    conn = get_connection()
    cursor = conn.cursor()
    clean_topic = topic.strip()

    try:
        cursor.execute("""
            SELECT error_count 
            FROM user_weaknesses 
            WHERE chat_id = ? AND LOWER(weakness_topic) = LOWER(?)
        """, (chat_id, clean_topic))
        row = cursor.fetchone()

        if row:
            new_count = row[0] - 1
            if new_count <= 0:
                cursor.execute("""
                    UPDATE user_weaknesses 
                    SET error_count = 0, status = 'resolved' 
                    WHERE chat_id = ? AND LOWER(weakness_topic) = LOWER(?)
                """, (chat_id, clean_topic))
            else:
                cursor.execute("""
                    UPDATE user_weaknesses 
                    SET error_count = ? 
                    WHERE chat_id = ? AND LOWER(weakness_topic) = LOWER(?)
                """, (new_count, chat_id, clean_topic))
            conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в heal_weakness: {e}")
    finally:
        conn.close()

# ==========================================
# 🔥 БЛОК: СТАТИСТИКА ДЛЯ ИИ-МЕНТОРА
# ==========================================

def get_user_daily_stats(chat_id: int) -> dict:
    config = get_user_config(chat_id) or {}
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Считаем слова, ожидающие интервального повторения
    cursor.execute("""
        SELECT COUNT(*) FROM user_dictionary 
        WHERE chat_id = ? AND score > 0 AND next_review <= DATE('now', 'localtime')
    """, (chat_id,))
    review_count = cursor.fetchone()[0]

    # 2. Достаем слабые стороны (до 3 штук)
    cursor.execute("""
        SELECT weakness_topic, error_count FROM user_weaknesses 
        WHERE chat_id = ? AND status = 'active' 
        ORDER BY error_count DESC LIMIT 3
    """, (chat_id,))
    weaknesses = [{"topic": r[0], "count": r[1]} for r in cursor.fetchall()]

    # 3. Считаем пройденные фразы за сегодня
    cursor.execute("""
        SELECT COUNT(*) FROM daily_completions 
        WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')
    """, (chat_id,))
    phrases_today = cursor.fetchone()[0]

    # 4. Считаем выученные слова за сегодня
    cursor.execute("""
        SELECT SUM(count) FROM daily_word_completions 
        WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')
    """, (chat_id,))
    row = cursor.fetchone()
    words_today = row[0] if row and row[0] is not None else 0

    conn.close()

    return {
        "words_goal": config.get("words_per_day", 5),
        "words_today": words_today,
        "phrases_goal": config.get("phrases_per_day", 10),
        "phrases_today": phrases_today,
        "review_count": review_count,
        "weaknesses": weaknesses
    }


def get_user_words_count(chat_id, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND lang = ?", (chat_id, current_lang))
    count = cursor.fetchone()[0]
    conn.close()
    return count

def delete_custom_word_by_id(chat_id, word_id):
    conn = get_connection()
    cursor = conn.cursor()
    # 🔥 Удаляем слово 100% надежно по его уникальному ID
    cursor.execute("DELETE FROM user_dictionary WHERE chat_id = ? AND id = ?", (chat_id, word_id))
    conn.commit()
    conn.close()