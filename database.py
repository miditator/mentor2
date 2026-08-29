# ==========================================
# ФАЙЛ: database.py
# ==========================================
import sqlite3
import random
import time
import re
from contextlib import contextmanager

DB_NAME = "mentor_bot.db"


@contextmanager
def get_db_connection():
    """Умный менеджер контекста с включенным режимом WAL"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    try:
        yield conn
    finally:
        conn.close()


def get_connection():
    """Оставлено для совместимости с внешними модулями (например, live_chat_database)"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''CREATE TABLE IF NOT EXISTS user_settings
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
                          )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS active_tasks
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
                          )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS task_history
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS user_dictionary
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
                          )), last_correct TEXT
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS daily_completions
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS daily_word_completions
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS global_words_stats
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS grammar_usage_stats
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS global_dictionary
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
                          )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS global_hidden_words
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS user_weaknesses
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
            )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS global_phrasal_verbs
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
                          )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS pending_discoveries
                          (
                              id
                              INTEGER
                              PRIMARY
                              KEY
                              AUTOINCREMENT,
                              chat_id
                              INTEGER,
                              word
                              TEXT,
                              translation
                              TEXT,
                              tags
                              TEXT
                          )''')

        # --- МИГРАЦИИ ---
        migrations = [
            "ALTER TABLE user_settings ADD COLUMN words_per_day INTEGER DEFAULT 5",
            "ALTER TABLE user_dictionary ADD COLUMN lang TEXT DEFAULT 'en'",
            "ALTER TABLE user_dictionary RENAME COLUMN word_en TO word_foreign",
            "ALTER TABLE user_settings ADD COLUMN username TEXT",
            "ALTER TABLE user_settings ADD COLUMN phrases_per_day INTEGER DEFAULT 10",
            "ALTER TABLE user_settings ADD COLUMN ai_provider TEXT DEFAULT 'gemini'",
            "ALTER TABLE active_tasks ADD COLUMN foreign_phrase TEXT",
            "ALTER TABLE user_dictionary ADD COLUMN global_word_id INTEGER DEFAULT NULL",
            "ALTER TABLE user_settings ADD COLUMN gender TEXT DEFAULT 'male'",
            "ALTER TABLE user_settings ADD COLUMN tts_voice_en TEXT",
            "ALTER TABLE user_settings ADD COLUMN tts_voice_de TEXT",
            "ALTER TABLE user_settings ADD COLUMN tts_rate TEXT DEFAULT '-15%'",
            "ALTER TABLE user_dictionary ADD COLUMN semantic_map_cluster TEXT DEFAULT NULL",
            "ALTER TABLE user_weaknesses ADD COLUMN progress_rule INTEGER DEFAULT 0",
            "ALTER TABLE user_settings ADD COLUMN keyboard_version INTEGER DEFAULT 0"
        ]

        for query in migrations:
            try:
                cursor.execute(query)
            except sqlite3.OperationalError:
                pass

        conn.commit()


# --- ФУНКЦИИ ДЛЯ НАСТРОЕК ---
def get_user_config(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT difficulty, source_lang, words_per_day, phrases_per_day, username, ai_provider, gender, tts_voice_en, tts_voice_de, tts_rate FROM user_settings WHERE chat_id = ?",
            (chat_id,)
        )
        row = cursor.fetchone()

        cursor.execute(
            "SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND score > 0 AND next_review <= DATE('now', 'localtime')",
            (chat_id,))
        review_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT SUM(count) FROM daily_word_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        words_today_row = cursor.fetchone()
        words_today = words_today_row[0] if words_today_row and words_today_row[0] is not None else 0

        cursor.execute(
            "SELECT COUNT(*) FROM daily_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        phrases_today = cursor.fetchone()[0]

        if row:
            return {
                "difficulty": row[0], "source_lang": row[1], "words_per_day": row[2] if row[2] is not None else 5,
                "phrases_per_day": row[3] if row[3] is not None else 10, "username": row[4],
                "ai_provider": row[5] if row[5] is not None else "gemini",
                "gender": row[6] if len(row) > 6 and row[6] is not None else "male",
                "tts_voice_en": row[7] if len(row) > 7 else None, "tts_voice_de": row[8] if len(row) > 8 else None,
                "tts_rate": row[9] if len(row) > 9 and row[9] is not None else "-15%",
                "review_count": review_count, "words_today": words_today, "phrases_today": phrases_today
            }
        return None


def create_empty_user(chat_id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO user_settings (chat_id, difficulty, source_lang) VALUES (?, NULL, NULL)",
                (chat_id,))
            conn.commit()
    except sqlite3.Error as e:
        print(f"🔴 Ошибка при создании пустого пользователя: {e}")


def update_user_setting(chat_id, key, value):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO user_settings (chat_id) VALUES (?)", (chat_id,))
        if key in ["difficulty", "source_lang", "words_per_day", "phrases_per_day", "username", "ai_provider", "gender",
                   "tts_voice_en", "tts_voice_de", "tts_rate", "keyboard_version"]:
            cursor.execute(f"UPDATE user_settings SET {key} = ? WHERE chat_id = ?", (value, chat_id))
        conn.commit()


def update_keyboard_version(chat_id: int, version: int):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE user_settings SET keyboard_version = ? WHERE chat_id = ?", (version, chat_id))
        conn.commit()


# --- ФУНКЦИИ ДЛЯ АКТИВНЫХ ЗАДАНИЙ ---
def save_active_task(chat_id, phrase, rule, foreign_phrase=""):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT OR REPLACE INTO active_tasks (chat_id, phrase, rule, foreign_phrase, help_count) VALUES (?, ?, ?, ?, 0)',
            (chat_id, phrase, rule, foreign_phrase))
        conn.commit()


def get_active_task(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT phrase, rule, help_count, foreign_phrase FROM active_tasks WHERE chat_id = ?",
                       (chat_id,))
        row = cursor.fetchone()
        if row: return {"phrase": row[0], "rule": row[1], "help_count": row[2], "foreign_phrase": row[3]}
        return None


def increment_help_count(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE active_tasks SET help_count = help_count + 1 WHERE chat_id = ?", (chat_id,))
        conn.commit()


def add_to_history(chat_id, phrase):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO task_history (chat_id, phrase) VALUES (?, ?)", (chat_id, phrase))
        conn.commit()


def delete_active_task(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM active_tasks WHERE chat_id = ?", (chat_id,))
        conn.commit()


# --- ФУНКЦИИ ИНТЕРВАЛЬНОГО СЛОВАРЯ ---
def get_words_for_training(chat_id, limit, mode='new', source='user', pos='mix'):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    result = []

    with get_db_connection() as conn:
        cursor = conn.cursor()
        if source == 'oxford':
            try:
                query = """
                        SELECT id, word_foreign \
                        FROM global_dictionary \
                        WHERE lang = ? \
                          AND NOT EXISTS (SELECT 1 \
                                          FROM user_dictionary \
                                          WHERE chat_id = ? \
                                            AND lang = ? \
                                            AND LOWER(TRIM(user_dictionary.word_foreign)) = \
                                                LOWER(TRIM(global_dictionary.word_foreign))) \
                          AND NOT EXISTS (SELECT 1 \
                                          FROM global_hidden_words \
                                          WHERE chat_id = ? AND global_hidden_words.word_id = global_dictionary.id)
                        ORDER BY RANDOM() LIMIT ? \
                        """
                cursor.execute(query, (current_lang, chat_id, current_lang, chat_id, limit))
                for row in cursor.fetchall():
                    result.append((row[0], row[1], "", 0))
            except Exception as e:
                print(f"❌ Ошибка SQL в get_words_for_training (oxford): {e}")
        else:
            if mode == 'review':
                cursor.execute(
                    "SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ? AND score > 0 AND next_review <= DATE('now', 'localtime') LIMIT ?",
                    (chat_id, current_lang, limit))
                result.extend(cursor.fetchall())
            else:
                cursor.execute(
                    "SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ? AND score = 0 LIMIT ?",
                    (chat_id, current_lang, limit))
                result.extend(cursor.fetchall())

    return result


def get_phrasal_verbs_by_lang(chat_id: int, lang: str, limit: int = 5):
    table_name = "global_german_verbs" if lang == 'de' else "global_phrasal_verbs"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name = ?;", (table_name,))
        if not cursor.fetchone():
            return []

        query = f"""
            SELECT id, word_foreign, word_ru FROM {table_name}
            WHERE NOT EXISTS (SELECT 1 FROM user_dictionary WHERE chat_id = ? AND LOWER(TRIM(user_dictionary.word_foreign)) = LOWER(TRIM({table_name}.word_foreign)))
            AND NOT EXISTS (SELECT 1 FROM global_hidden_words WHERE chat_id = ? AND word_id = {table_name}.id)
            ORDER BY RANDOM() LIMIT ? 
        """
        cursor.execute(query, (chat_id, chat_id, limit))
        rows = cursor.fetchall()

        all_foreign = []
        if lang == 'en':
            cursor.execute(f"SELECT word_foreign FROM {table_name}")
            all_foreign = [r[0] for r in cursor.fetchall()]

    result = []
    GERMAN_PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'gegen', 'in', 'mit', 'nach', 'über', 'um', 'unter', 'von', 'vor',
                    'zu', 'zwischen']
    GERMAN_CASES = ['Akk', 'Dat', 'Gen', 'Nom']

    for row in rows:
        word_id, foreign_phrase, russian_translation = row[0], row[1], row[2] if row[2] else row[1]
        if lang == 'de':
            v_match, p_match, c_match = re.search(r'\{\{c1::(.*?)\}\}', foreign_phrase), re.search(r'\{\{c2::(.*?)\}\}',
                                                                                                   foreign_phrase), re.search(
                r'\{\{c3::(.*?)\}\}', foreign_phrase)
            if v_match and p_match and c_match:
                verb, prep, case = v_match.group(1), p_match.group(1), c_match.group(1)

                q1_text = f"{russian_translation}<br><span style='font-size: 22px; color: #a881f3; display: block; margin-top: 12px;'>{verb} ___ + {case}</span>"
                opts1 = [prep] + random.sample([p for p in GERMAN_PREPS if p != prep], 2)
                random.shuffle(opts1)
                result.append({"id": word_id, "foreign": prep, "ru": q1_text, "options": opts1, "score": 0})

                q2_text = f"{russian_translation}<br><span style='font-size: 22px; color: #a881f3; display: block; margin-top: 12px;'>{verb} {prep} + ___</span>"
                opts2 = [case] + random.sample([c for c in GERMAN_CASES if c != case], 2)
                random.shuffle(opts2)
                result.append({"id": word_id, "foreign": case, "ru": q2_text, "options": opts2, "score": 0})
            else:
                clean_foreign = re.sub(r'\{\{c\d+::(.*?)\}\}', r'\1', foreign_phrase)
                opts = [clean_foreign] + random.sample(GERMAN_PREPS, 2)
                random.shuffle(opts)
                result.append(
                    {"id": word_id, "foreign": clean_foreign, "ru": russian_translation, "options": opts, "score": 0})
        else:
            other_foreign = [f for f in all_foreign if f != foreign_phrase]
            wrong_options = random.sample(other_foreign, min(2, len(other_foreign))) if other_foreign else ["error",
                                                                                                            "fail"]
            options = [foreign_phrase] + wrong_options
            random.shuffle(options)
            result.append(
                {"id": word_id, "foreign": foreign_phrase, "ru": russian_translation, "options": options, "score": 0})

    random.shuffle(result)
    return result[:limit]


def add_oxford_words_batch(chat_id, words_list):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for w in words_list:
                cursor.execute("""
                               INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru, score, global_word_id)
                               VALUES (?, ?, ?, ?, 0, ?)
                               """, (chat_id, current_lang, w["foreign"], w["ru"], w["word_id"]))
            conn.commit()
    except Exception as e:
        print(f"Ошибка сохранения батча слов Оксфорда: {e}")


def update_word_progress(chat_id, word_id, is_correct, mode="new", source="user", foreign="", ru=""):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    local_id = word_id

    with get_db_connection() as conn:
        cursor = conn.cursor()
        if source in ('oxford', 'phrasal'):
            cursor.execute("SELECT id, score FROM user_dictionary WHERE chat_id = ? AND global_word_id = ?",
                           (chat_id, word_id))
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru, score, global_word_id) VALUES (?, ?, ?, ?, 0, ?)",
                    (chat_id, current_lang, foreign, ru, word_id))
                local_id = cursor.lastrowid
                current_score = 0
            else:
                local_id, current_score = row[0], row[1]
        else:
            cursor.execute("SELECT score FROM user_dictionary WHERE id = ?", (local_id,))
            row = cursor.fetchone()
            if not row: return
            current_score = row[0]

        if current_score > 5: current_score = 5
        new_score = current_score + 1 if is_correct else (current_score - 1 if mode == "review" else 0)
        new_score = max(0, min(new_score, 5))

        days_map = {5: 30, 4: 14, 3: 7, 2: 3, 1: 1, 0: 0}
        days_to_add = days_map.get(new_score, 0)

        cursor.execute(
            f"UPDATE user_dictionary SET score = ?, last_correct = DATE('now', 'localtime'), next_review = DATE('now', 'localtime', '+{days_to_add} days') WHERE id = ?",
            (new_score, local_id))
        conn.commit()


def mark_word_as_known(chat_id, word_id, word_foreign, source):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if source in ('oxford', 'phrasal'):
            cursor.execute("INSERT OR IGNORE INTO global_hidden_words (chat_id, word_id) VALUES (?, ?)",
                           (chat_id, word_id))
        else:
            cursor.execute(
                "UPDATE user_dictionary SET score = 5, last_correct = DATE('now', 'localtime'), next_review = DATE('now', 'localtime', '+3650 days') WHERE id = ? AND chat_id = ?",
                (word_id, chat_id))
        conn.commit()


def get_full_dictionary(chat_id, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ?",
                       (chat_id, current_lang))
        rows = cursor.fetchall()
        return [{"id": row[0], "foreign": row[1], "ru": row[2], "score": row[3]} for row in rows]


def add_custom_word(chat_id, word_foreign, word_ru, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    safe_foreign = word_foreign.strip().lower() if word_foreign else ""
    safe_ru = word_ru.strip().lower() if word_ru else "[переведи меня]"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
            (chat_id, current_lang, safe_foreign))
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru) VALUES (?, ?, ?, ?)",
                           (chat_id, current_lang, safe_foreign, safe_ru))
            conn.commit()
            return True
        return False


def update_user_word(chat_id, word_foreign, new_ru):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_dictionary SET word_ru = ? WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)",
            (new_ru.strip().lower(), chat_id, current_lang, word_foreign.strip()))
        conn.commit()


def delete_custom_word(chat_id, word_foreign, specific_lang=None):
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_dictionary WHERE chat_id = ? AND lang = ? AND LOWER(TRIM(word_foreign)) = LOWER(TRIM(?))",
            (chat_id, current_lang, word_foreign))
        conn.commit()


# --- СТАТИСТИКА ПРОХОЖДЕНИЙ ---
def add_successful_completion(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO daily_completions (chat_id, completed_at) VALUES (?, DATE('now', 'localtime'))",
                       (chat_id,))
        conn.commit()


def get_today_completions_count(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM daily_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        return cursor.fetchone()[0] or 0


def add_word_completions(chat_id, count):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO daily_word_completions (chat_id, count, completed_at) VALUES (?, ?, DATE('now', 'localtime'))",
            (chat_id, count))
        conn.commit()


def get_today_word_completions_count(chat_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT SUM(count) FROM daily_word_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        row = cursor.fetchone()
        return row[0] if row and row[0] is not None else 0


# --- ТРЕКИНГ УМНОГО ВЫБОРА СЛОВ ---
def track_global_word_usage(chat_id: int, word_id: int, lang: str):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT usage_count FROM global_words_stats WHERE chat_id = ? AND word_id = ? AND lang = ?",
                           (chat_id, word_id, lang))
            if cursor.fetchone():
                cursor.execute(
                    "UPDATE global_words_stats SET usage_count = usage_count + 1 WHERE chat_id = ? AND word_id = ? AND lang = ?",
                    (chat_id, word_id, lang))
            else:
                cursor.execute(
                    "INSERT INTO global_words_stats (chat_id, word_id, lang, usage_count) VALUES (?, ?, ?, 1)",
                    (chat_id, word_id, lang))
            conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в track_global_word_usage: {e}")


def get_grammar_usage_stats(chat_id: int, item_type: str) -> dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT item_key, usage_count FROM grammar_usage_stats WHERE chat_id = ? AND item_type = ?",
                       (chat_id, item_type))
        return {row[0]: row[1] for row in cursor.fetchall()}


def track_grammar_usage(chat_id: int, item_key: str, item_type: str):
    try:
        str_key = str(item_key)
        with get_db_connection() as conn:
            cursor = conn.cursor()
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


def hide_global_word(chat_id, word_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO global_hidden_words (chat_id, word_id) VALUES (?, ?)", (chat_id, word_id))
        conn.commit()


def get_global_word_by_id(word_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT word_foreign FROM global_dictionary WHERE id = ?", (word_id,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("SELECT word_foreign FROM global_phrasal_verbs WHERE id = ?", (word_id,))
            row = cursor.fetchone()
        if row:
            return {"foreign": row[0]}
        return None


def get_random_global_words(chat_id, target_lang, difficulty_setting, limit=1):
    level_map = {
        "1": ["A1", "A2", "B1", "B2", "C1", "C2"], "A1": ["A1", "A2", "B1", "B2", "C1", "C2"],
        "2": ["A2", "B1", "B2", "C1", "C2"], "A2": ["A2", "B1", "B2", "C1", "C2"],
        "3": ["B1", "B2", "C1", "C2"], "B1": ["B1", "B2", "C1", "C2"],
        "4": ["B2", "C1", "C2"], "B2": ["B2", "C1", "C2"],
        "5": ["C1", "C2"], "C1": ["C1", "C2"],
        "6": ["C2"], "C2": ["C2"]
    }

    diff_str = str(difficulty_setting).upper().strip()
    lang_str = str(target_lang).lower().strip()
    allowed_levels = level_map.get(diff_str, ["B1", "B2", "C1", "C2"])

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            placeholders = ",".join(["?"] * len(allowed_levels))

            cursor.execute(f"""
                SELECT COUNT(*) FROM global_dictionary gd
                WHERE LOWER(TRIM(gd.lang)) = ? AND UPPER(TRIM(gd.level)) IN ({placeholders})
                  AND NOT EXISTS (SELECT 1 FROM global_hidden_words gh WHERE gh.chat_id = ? AND gh.word_id = gd.id)
            """, [lang_str] + allowed_levels + [chat_id])

            if cursor.fetchone()[0] == 0: return []

            query = f"""
                SELECT gd.id, gd.word_foreign FROM global_dictionary gd
                WHERE LOWER(TRIM(gd.lang)) = ? AND UPPER(TRIM(gd.level)) IN ({placeholders})
                  AND NOT EXISTS (SELECT 1 FROM global_hidden_words gh WHERE gh.chat_id = ? AND gh.word_id = gd.id)
                ORDER BY RANDOM() LIMIT ?
            """
            cursor.execute(query, [lang_str] + allowed_levels + [chat_id, limit])
            return [{"id": row[0], "foreign": row[1]} for row in cursor.fetchall()]
    except Exception as e:
        print(f"🔴 Ошибка SQL в get_random_global_words: {e}")
        return []


# --- УЧЕТ СЛАБЫХ СТОРОН ---
def update_rule_progress(chat_id: int, topic: str, is_correct: bool):
    if not topic or str(topic).strip().lower() == "null": return
    clean_topic = topic.strip()
    now = time.time()

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT progress_rule FROM user_weaknesses WHERE chat_id = ? AND LOWER(weakness_topic) = LOWER(?)",
                (chat_id, clean_topic))
            row = cursor.fetchone()

            if row:
                current_progress = row[0] if row[0] is not None else 0
                new_progress = min(100, current_progress + 10) if is_correct else max(0, current_progress - 10)
                status = 'resolved' if new_progress >= 100 else 'active'
                cursor.execute(
                    "UPDATE user_weaknesses SET progress_rule = ?, last_detected = ?, status = ? WHERE chat_id = ? AND LOWER(weakness_topic) = LOWER(?)",
                    (new_progress, now, status, chat_id, clean_topic))
            else:
                new_progress = 10 if is_correct else 0
                status = 'resolved' if new_progress >= 100 else 'active'
                cursor.execute(
                    "INSERT INTO user_weaknesses (chat_id, weakness_topic, progress_rule, last_detected, status) VALUES (?, ?, ?, ?, ?)",
                    (chat_id, clean_topic, new_progress, now, status))
            conn.commit()
    except Exception as e:
        print(f"❌ Ошибка в update_rule_progress: {e}")


def add_or_update_weakness(chat_id: int, topic: str):
    update_rule_progress(chat_id, topic, is_correct=False)


def heal_weakness(chat_id: int, topic: str):
    update_rule_progress(chat_id, topic, is_correct=True)


def get_active_weaknesses(chat_id: int, limit: int = 3) -> list:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT weakness_topic, progress_rule, error_count FROM user_weaknesses WHERE chat_id = ? AND status = 'active'",
            (chat_id,))
        rows = cursor.fetchall()

    if not rows: return []
    weaknesses = [{"topic": r[0], "progress": r[1] if r[1] is not None else 0, "count": r[2]} for r in rows]
    for w in weaknesses:
        w["sort_key"] = random.random() ** (1.0 / max(1, 100 - w["progress"]))
    weaknesses.sort(key=lambda x: x["sort_key"], reverse=True)
    return weaknesses[:limit]


# --- СТАТИСТИКА ---
def get_user_daily_stats(chat_id: int) -> dict:
    config = get_user_config(chat_id) or {}
    weaknesses = get_active_weaknesses(chat_id, limit=3)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND score > 0 AND next_review <= DATE('now', 'localtime')",
            (chat_id,))
        review_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM daily_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        phrases_today = cursor.fetchone()[0]

        cursor.execute(
            "SELECT SUM(count) FROM daily_word_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
            (chat_id,))
        row = cursor.fetchone()
        words_today = row[0] if row and row[0] is not None else 0

        return {
            "words_goal": config.get("words_per_day", 5), "words_today": words_today,
            "phrases_goal": config.get("phrases_per_day", 10), "phrases_today": phrases_today,
            "review_count": review_count, "weaknesses": weaknesses
        }


def get_user_words_count(chat_id, specific_lang=None):
    current_lang = specific_lang if specific_lang else (
        get_user_config(chat_id).get("source_lang", "en") if get_user_config(chat_id) else "en")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM user_dictionary WHERE chat_id = ? AND lang = ?", (chat_id, current_lang))
        return cursor.fetchone()[0]


def delete_custom_word_by_id(chat_id, word_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_dictionary WHERE chat_id = ? AND id = ?", (chat_id, word_id))
        conn.commit()


def is_word_in_oxford(word_foreign: str, lang: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM global_dictionary WHERE LOWER(TRIM(word_foreign)) = LOWER(TRIM(?)) AND lang = ?",
                       (word_foreign, lang))
        return bool(cursor.fetchone())


def save_discovery(chat_id: int, word: str, translation: str, tags_list: list):
    import json
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO pending_discoveries (chat_id, word, translation, tags) VALUES (?, ?, ?, ?)",
                       (chat_id, word, translation, json.dumps(tags_list)))
        conn.commit()


def get_and_clear_discoveries(chat_id: int) -> list:
    import json
    discoveries = []
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, word, translation, tags FROM pending_discoveries WHERE chat_id = ?", (chat_id,))
        rows = cursor.fetchall()
        for row in rows:
            discoveries.append({"word": row[1], "translation": row[2], "tags": json.loads(row[3]) if row[3] else []})
            cursor.execute("DELETE FROM pending_discoveries WHERE id = ?", (row[0],))
        conn.commit()
    return discoveries


def get_user_words_for_map(chat_id: int):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    classified, unclassified = [], []

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT word_foreign, word_ru, semantic_map_cluster FROM user_dictionary WHERE chat_id = ? AND lang = ?",
            (chat_id, current_lang))
        for row in cursor.fetchall():
            if row[2]:
                classified.append({"word": row[0], "cluster": row[2]})
            else:
                unclassified.append({"word": row[0], "translation": row[1]})

    return classified, unclassified


def save_word_clusters_for_map(chat_id: int, cluster_dict: dict):
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for word, cluster in cluster_dict.items():
            cursor.execute(
                "UPDATE user_dictionary SET semantic_map_cluster = ? WHERE chat_id = ? AND lang = ? AND LOWER(TRIM(word_foreign)) = LOWER(TRIM(?))",
                (cluster, chat_id, current_lang, word))
        conn.commit()