# ==========================================
# ФАЙЛ: database.py
# ==========================================
import sqlite3

DB_NAME = "mentor_bot.db"


def init_db():
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    # 1. ТАБЛИЦА НАСТРОЕК (Добавлено поле username)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_settings (
        chat_id INTEGER PRIMARY KEY,
        difficulty TEXT,
        source_lang TEXT,
        words_per_day INTEGER DEFAULT 5,
        username TEXT
    )
    ''')

    # 2. ТАБЛИЦА ДЛЯ АКТИВНЫХ ЗАДАНИЙ (ФРАЗЫ)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS active_tasks (
        chat_id INTEGER PRIMARY KEY,
        phrase TEXT,
        rule TEXT,
        help_count INTEGER DEFAULT 0
    )
    ''')

    # 3. ТАБЛИЦА ИСТОРИИ ВЫДАННЫХ ФРАЗ
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        phrase TEXT,
        date TEXT DEFAULT (DATE('now', 'localtime'))
    )
    ''')

    # 4. ОБНОВЛЕННАЯ ТАБЛИЦА ИНТЕРВАЛЬНОГО СЛОВАРЯ (МУЛЬТИЯЗЫЧНАЯ)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        lang TEXT DEFAULT 'en',
        word_foreign TEXT,
        word_ru TEXT,
        score INTEGER DEFAULT 0,
        next_review TEXT DEFAULT (DATE('now', 'localtime')),
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

    # --- МИГРАЦИИ ---
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

    # 🔥 ИСПРАВЛЕННАЯ МИГРАЦИЯ ДЛЯ ПРОВАЙДЕРА ИИ 🔥
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN ai_provider TEXT DEFAULT 'groq'")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()


# --- ФУНКЦИИ ДЛЯ НАСТРОЕК ---

def get_user_config(chat_id):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    # 🔥 Добавили ai_provider в запрос
    cursor.execute("SELECT difficulty, source_lang, words_per_day, phrases_per_day, username, ai_provider FROM user_settings WHERE chat_id = ?", (chat_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "difficulty": row[0],
            "source_lang": row[1],
            "words_per_day": row[2] if row[2] is not None else 5,
            "phrases_per_day": row[3] if row[3] is not None else 10,
            "username": row[4],
            "ai_provider": row[5] if row[5] is not None else "groq" # 🔥 Добавили в отдачу
        }
    return None


def create_empty_user(chat_id):
    """Создает пустую запись пользователя в базе данных при первом старте"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR IGNORE INTO user_settings (chat_id, difficulty, source_lang) VALUES (?, NULL, NULL)",
            (chat_id,)
        )
        conn.commit()
    except sqlite3.Error as e:
        print(f"🔴 Ошибка при создании пустого пользователя: {e}")
    finally:
        conn.close()


def update_user_setting(chat_id, key, value):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute("INSERT OR IGNORE INTO user_settings (chat_id) VALUES (?)", (chat_id,))

    # 🔥 Добавили "ai_provider" в список разрешенных ключей
    if key in ["difficulty", "source_lang", "words_per_day", "phrases_per_day", "username", "ai_provider"]:
        cursor.execute(f"UPDATE user_settings SET {key} = ? WHERE chat_id = ?", (value, chat_id))

    conn.commit()
    conn.close()


# --- ФУНКЦИИ ДЛЯ АКТИВНЫХ ЗАДАНИЙ (ACTIVE_TASKS) ---

def save_active_task(chat_id, phrase, rule):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO active_tasks (chat_id, phrase, rule, help_count) 
        VALUES (?, ?, ?, 0)
    ''', (chat_id, phrase, rule))
    conn.commit()
    conn.close()


def get_active_task(chat_id):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT phrase, rule, help_count FROM active_tasks WHERE chat_id = ?", (chat_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {"phrase": row[0], "rule": row[1], "help_count": row[2]}
    return None


def increment_help_count(chat_id):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("UPDATE active_tasks SET help_count = help_count + 1 WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()


def delete_active_task(chat_id):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM active_tasks WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()


def add_to_history(chat_id, phrase):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO task_history (chat_id, phrase) VALUES (?, ?)", (chat_id, phrase))
    conn.commit()
    conn.close()


def get_today_phrases_list(chat_id):
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT phrase FROM task_history WHERE chat_id = ? AND date = DATE('now', 'localtime')",
        (chat_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [row[0].strip().lower() for row in rows] if rows else []


# --- ФУНКЦИИ ИНТЕРВАЛЬНОГО СЛОВАРЯ ---

def get_words_for_training(chat_id, limit_new):
    """Умная выборка: Повторение -> Новые -> Остальные (до заполнения лимита)"""
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    result = []

    # 1. Берем слова, время повторения которых настало (Приоритет 1)
    cursor.execute("""
                   SELECT id, word_foreign, word_ru, score
                   FROM user_dictionary
                   WHERE chat_id = ?
                     AND lang = ?
                     AND score > 0
                     AND next_review <= DATE ('now'
                       , 'localtime')
                       LIMIT ?
                   """, (chat_id, current_lang, limit_new))
    result.extend(cursor.fetchall())

    # 2. Если слов меньше лимита, добираем новые слова (Приоритет 2)
    if len(result) < limit_new:
        remaining = limit_new - len(result)
        cursor.execute("""
                       SELECT id, word_foreign, word_ru, score
                       FROM user_dictionary
                       WHERE chat_id = ?
                         AND lang = ?
                         AND score = 0 LIMIT ?
                       """, (chat_id, current_lang, remaining))
        result.extend(cursor.fetchall())

    # 3. Если всё еще меньше лимита, берем "остальные" слова, которые в процессе (Приоритет 3)
    if len(result) < limit_new:
        remaining = limit_new - len(result)
        # Исключаем уже взятые ID, чтобы не было дублей
        used_ids = [r[0] for r in result]
        placeholders = ','.join(['?'] * len(used_ids)) if used_ids else "0"

        query = f"""
            SELECT id, word_foreign, word_ru, score FROM user_dictionary
            WHERE chat_id = ? AND lang = ? AND id NOT IN ({placeholders})
            ORDER BY RANDOM() LIMIT ?
        """
        params = [chat_id, current_lang] + used_ids + [remaining]
        cursor.execute(query, params)
        result.extend(cursor.fetchall())

    conn.close()
    return result


def update_word_progress(word_id, is_correct):
    """Логика Spaced Repetition (Animemo) для расчета интервалов дней"""
    intervals = {0: 1, 1: 3, 2: 7, 3: 30, 4: 90, 5: 180}

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    if is_correct:
        cursor.execute("SELECT score FROM user_dictionary WHERE id = ?", (word_id,))
        row = cursor.fetchone()
        current_score = row[0] if row else 0
        new_score = min(current_score + 1, 5)
        days = intervals.get(new_score, 30)

        cursor.execute("""
                       UPDATE user_dictionary
                       SET score       = ?,
                           next_review = DATE ('now', 'localtime', ?), last_correct = DATE ('now', 'localtime')
                       WHERE id = ?
                       """, (new_score, f"+{days} days", word_id))
    else:
        # 🔥 ИСПРАВЛЕНИЕ: Теперь при ошибке сбрасываем прогресс до 0 (а не до 1)
        # и ставим повторение на сегодня
        cursor.execute("""
                       UPDATE user_dictionary
                       SET score       = 0,
                           next_review = DATE ('now', 'localtime')
                       WHERE id = ?
                       """, (word_id,))

    conn.commit()
    conn.close()


def get_full_dictionary(chat_id, specific_lang=None):
    """Возвращает весь личный словарь пользователя по выбранному языку"""
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    # 🔥 Добавили 'id' в SQL-запрос!
    cursor.execute("SELECT id, word_foreign, word_ru, score FROM user_dictionary WHERE chat_id = ? AND lang = ?",
                   (chat_id, current_lang))
    rows = cursor.fetchall()
    conn.close()

    # 🔥 Возвращаем список словарей, чтобы фронтенду было легко получить доступ к id
    return [{"id": row[0], "foreign": row[1], "ru": row[2], "score": row[3]} for row in rows]


def add_custom_word(chat_id, word_foreign, word_ru, specific_lang=None):
    """Добавляет новое слово текущего или указанного языка, исключая дубликаты"""
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute("""
                   SELECT COUNT(*)
                   FROM user_dictionary
                   WHERE chat_id = ?
                     AND lang = ?
                     AND LOWER(word_foreign) = LOWER(?)
                   """, (chat_id, current_lang, word_foreign.strip()))

    if cursor.fetchone()[0] == 0:
        cursor.execute("""
                       INSERT INTO user_dictionary (chat_id, lang, word_foreign, word_ru)
                       VALUES (?, ?, ?, ?)
                       """, (chat_id, current_lang, word_foreign.strip().lower(), word_ru.strip().lower()))
        conn.commit()
        saved = True
    else:
        saved = False

    conn.close()
    return saved


def get_words_for_grammar_context(chat_id, limit=1):
    """Вытаскивает N слов активного языка."""
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    query = """
            SELECT word_foreign, word_ru
            FROM user_dictionary
            WHERE chat_id = ?
              AND lang = ?
            ORDER BY score ASC, RANDOM() LIMIT ?
            """
    cursor.execute(query, (chat_id, current_lang, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [{"foreign": row[0], "ru": row[1]} for row in rows]


def update_word_intensity_progress(chat_id, word_text, intensity_score):
    """Логика прокачки слова после Интенсива (Бонус за 5/5, без штрафов)"""
    intervals = {0: 1, 1: 3, 2: 7, 3: 30, 4: 90, 5: 180}

    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, score FROM user_dictionary 
        WHERE chat_id = ? AND lang = ? AND LOWER(word_foreign) = LOWER(?)
    """, (chat_id, current_lang, word_text.strip()))
    row = cursor.fetchone()

    if row:
        word_id, current_score = row

        # РАСЧЕТ ПРОКАЧКИ (Без штрафов)
        if intensity_score == 5:
            # Идеально: +1 балл (+20%) к уровню
            new_score = min(current_score + 1, 5)
            # Бонус 1.5x к интервалу за идеальное прохождение
            days = int(intervals.get(new_score, 30) * 1.5)
        else:
            # Если меньше 5 - не наказываем, просто оставляем текущий уровень
            # и обновляем базовый таймер повторения
            new_score = current_score
            days = intervals.get(new_score, 30)

        cursor.execute("""
            UPDATE user_dictionary
            SET score = ?, next_review = DATE('now', 'localtime', ?), last_correct = DATE('now', 'localtime')
            WHERE id = ?
        """, (new_score, f"+{days} days", word_id))
        conn.commit()
        conn.close()
        return {"updated": True, "new_score": new_score, "days_added": days}

    conn.close()
    return {"updated": False}

def update_user_word(chat_id, word_foreign, new_ru):
    """Обновляет перевод (word_ru) для конкретного слова пользователя"""
    user_config = get_user_config(chat_id)
    current_lang = user_config.get("source_lang", "en") if user_config else "en"

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE user_dictionary
        SET word_ru = ?
        WHERE chat_id = ? 
          AND lang = ? 
          AND LOWER(word_foreign) = LOWER(?)
    """, (new_ru.strip().lower(), chat_id, current_lang, word_foreign.strip()))

    conn.commit()
    conn.close()

def delete_custom_word(chat_id, word_foreign, specific_lang=None):
    """Удаляет слово пользователя из словаря"""
    if specific_lang is None:
        user_config = get_user_config(chat_id)
        current_lang = user_config.get("source_lang", "en") if user_config else "en"
    else:
        current_lang = specific_lang

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM user_dictionary
        WHERE chat_id = ? 
          AND lang = ? 
          AND LOWER(word_foreign) = LOWER(?)
    """, (chat_id, current_lang, word_foreign.strip()))

    conn.commit()
    conn.close()





# --- НОВЫЕ ФУНКЦИИ ДЛЯ СЧЕТЧИКА ФРАЗ ---

def add_successful_completion(chat_id):
    """Засчитывает одну успешно решенную фразу в дневной прогресс"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO daily_completions (chat_id, completed_at) VALUES (?, DATE('now', 'localtime'))",
        (chat_id,)
    )
    conn.commit()
    conn.close()
    print(f"✅ Успешно добавлена в daily_completions для chat_id={chat_id}")



def get_today_completions_count(chat_id):
    """Возвращает количество успешно решенных фраз за сегодня"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM daily_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
        (chat_id,)
    )
    count = cursor.fetchone()[0] or 0
    conn.close()
    return count

def add_word_completions(chat_id, count):
    """Засчитывает количество успешно пройденных слов за завершенную тренировку"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO daily_word_completions (chat_id, count, completed_at) VALUES (?, ?, DATE('now', 'localtime'))",
        (chat_id, count)
    )
    conn.commit()
    conn.close()
    print(f"✅ Засчитано слов тренировки: +{count} для chat_id={chat_id}")

def get_today_word_completions_count(chat_id):
    """Возвращает общее количество слов, пройденных в тренировках за сегодня"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT SUM(count) FROM daily_word_completions WHERE chat_id = ? AND completed_at = DATE('now', 'localtime')",
        (chat_id,)
    )
    row = cursor.fetchone()
    count = row[0] if row and row[0] is not None else 0
    conn.close()
    return count