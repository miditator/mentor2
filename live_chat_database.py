import sqlite3
import json
from typing import List, Dict, Optional

DB_NAME = "ai_memory.db"




def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_live_chat_db():
    """Создает необходимые таблицы для живого чата и памяти ИИ"""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Темы пользователя (динамические разделы знаний)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS user_topics
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       title
                       TEXT,
                       summary
                       TEXT,
                       last_checkpoint
                       TEXT,
                       updated_at
                       TIMESTAMP
                       DEFAULT
                       CURRENT_TIMESTAMP,
                       UNIQUE
                   (
                       chat_id,
                       title
                   )
                       )
                   ''')

    # 2. Узлы знаний и этапы внутри темы (граф знаний)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS topic_nodes
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       topic_id
                       INTEGER,
                       concept
                       TEXT,
                       status
                       TEXT
                       DEFAULT
                       'in_progress', -- 'in_progress', 'mastered', 'planned'
                       details
                       TEXT,
                       updated_at
                       TIMESTAMP
                       DEFAULT
                       CURRENT_TIMESTAMP,
                       FOREIGN
                       KEY
                   (
                       topic_id
                   ) REFERENCES user_topics
                   (
                       id
                   ) ON DELETE CASCADE
                       )
                   ''')

    # 3. Скользящая история живого диалога
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS mentor_chat_history
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       chat_id
                       INTEGER,
                       role
                       TEXT, -- 'user' или 'assistant'
                       content
                       TEXT,
                       created_at
                       TIMESTAMP
                       DEFAULT
                       CURRENT_TIMESTAMP
                   )
                   ''')

    # 4. Состояния чата пользователя (выбранный режим)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS chat_states
                   (
                       chat_id
                       INTEGER
                       PRIMARY
                       KEY,
                       current_mode
                       TEXT
                       DEFAULT
                       'CHAT',
                       updated_at
                       TIMESTAMP
                       DEFAULT
                       CURRENT_TIMESTAMP
                   )
                   ''')

    conn.commit()
    conn.close()


# ==========================================
# ФУНКЦИИ ДЛЯ РАБОТЫ С ТЕМАМИ И ПАМЯТЬЮ
# ==========================================

def get_all_user_topics(chat_id: int) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, summary, last_checkpoint FROM user_topics WHERE chat_id = ? ORDER BY updated_at DESC",
        (chat_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_topic_by_title(chat_id: int, title: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, summary, last_checkpoint FROM user_topics WHERE chat_id = ? AND LOWER(title) = LOWER(?)",
        (chat_id, title.strip())
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def upsert_user_topic(chat_id: int, title: str, summary: str, last_checkpoint: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
                   INSERT INTO user_topics (chat_id, title, summary, last_checkpoint, updated_at)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(chat_id, title) DO
                   UPDATE SET
                       summary = excluded.summary,
                       last_checkpoint = excluded.last_checkpoint,
                       updated_at = CURRENT_TIMESTAMP
                   ''', (chat_id, title.strip(), summary.strip(), last_checkpoint.strip()))

    # Получаем id созданной или обновленной записи
    cursor.execute("SELECT id FROM user_topics WHERE chat_id = ? AND title = ?", (chat_id, title.strip()))
    topic_id = cursor.fetchone()[0]

    conn.commit()
    conn.close()
    return topic_id


def get_topic_nodes(topic_id: int) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT concept, status, details FROM topic_nodes WHERE topic_id = ? ORDER BY updated_at ASC",
        (topic_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_topic_node(topic_id: int, concept: str, status: str = "in_progress", details: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
                   INSERT INTO topic_nodes (topic_id, concept, status, details, updated_at)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                   ''', (topic_id, concept.strip(), status, details.strip()))
    conn.commit()
    conn.close()


def save_chat_message(chat_id: int, role: str, content: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO mentor_chat_history (chat_id, role, content) VALUES (?, ?, ?)",
        (chat_id, role, content)
    )
    # Храним только последние 20 реплик на пользователя
    cursor.execute('''
                   DELETE
                   FROM mentor_chat_history
                   WHERE chat_id = ?
                     AND id NOT IN (SELECT id
                                    FROM mentor_chat_history
                                    WHERE chat_id = ?
                                    ORDER BY id DESC
                       LIMIT 20
                       )
                   ''', (chat_id, chat_id))
    conn.commit()
    conn.close()


def get_recent_chat_history(chat_id: int, limit: int = 6) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content FROM mentor_chat_history WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
        (chat_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    # Возвращаем в хронологическом порядке
    return [dict(r) for r in reversed(rows)]





def set_user_mode(chat_id: int, mode: str):
    """Сохраняет текущий режим работы бота"""
    conn = get_connection()
    cursor = conn.cursor()

    # Больше не используем модуль time, доверяем стандартному CURRENT_TIMESTAMP базы
    cursor.execute('''
                   INSERT INTO chat_states (chat_id, current_mode, updated_at)
                   VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(chat_id) DO
                   UPDATE SET
                       current_mode = excluded.current_mode,
                       updated_at = CURRENT_TIMESTAMP
                   ''', (chat_id, mode))
    conn.commit()
    conn.close()


def get_user_mode(chat_id: int) -> str:
    """Возвращает текущий режим без автопереключения"""
    conn = get_connection()
    cursor = conn.cursor()

    # Теперь мы запрашиваем только сам режим, время нам не нужно
    cursor.execute("SELECT current_mode FROM chat_states WHERE chat_id = ?", (chat_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return "CHAT"

    return row["current_mode"]