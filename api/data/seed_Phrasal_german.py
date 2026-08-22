import sqlite3
import json
import os

# Получаем папку, где лежит скрипт (api/data)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Поднимаемся на два уровня выше в корень проекта
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))

DB_PATH = os.path.join(ROOT_DIR, "mentor_bot.db")
JSON_PATH = os.path.join(CURRENT_DIR, "german_phrasal_verbs_ru.json")  # 👈 Укажи точное имя твоего файла (например, 0.json или german.json)

def seed_german_phrasal():
    print(f"📌 Ищем базу данных: {DB_PATH}")
    print(f"📌 Ищем JSON-файл: {JSON_PATH}")

    if not os.path.exists(DB_PATH):
        print(f"❌ База данных не найдена по пути {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Создаем таблицу для немецких глаголов с уникальными ID (начинаем с 2,000,000)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS global_german_verbs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_foreign TEXT UNIQUE,
            word_ru TEXT
        )
    ''')

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

            added_count = 0
            first = True

            for german_phrase, info in data.items():
                # Достаем русский перевод из структуры {"translations": {"ru": {"перевод": []}}}
                translations = info.get("translations", {})
                ru_dict = translations.get("ru", {})

                # Берем первый ключ из словаря переводов
                ru_translation = list(ru_dict.keys())[0] if ru_dict else "Перевод"

                try:
                    # Первой записи задаем ID 2000000, остальные по автоинкременту
                    if first:
                        cursor.execute(
                            "INSERT OR IGNORE INTO global_german_verbs (id, word_foreign, word_ru) VALUES (?, ?, ?)",
                            (2000000, german_phrase, ru_translation)
                        )
                        first = False
                    else:
                        cursor.execute(
                            "INSERT OR IGNORE INTO global_german_verbs (word_foreign, word_ru) VALUES (?, ?)",
                            (german_phrase, ru_translation)
                        )

                    if cursor.rowcount > 0:
                        added_count += 1
                except sqlite3.IntegrityError:
                    pass

        conn.commit()
        print(f"✅ Успешно добавлено немецких глаголов в базу: {added_count}!")

    except FileNotFoundError:
        print(f"❌ Ошибка: Файл {JSON_PATH} не найден!")
    except json.JSONDecodeError:
        print(f"❌ Ошибка: Файл {JSON_PATH} содержит невалидный JSON!")
    finally:
        conn.close()

if __name__ == "__main__":
    print("Начинаю загрузку немецких глаголов...")
    seed_german_phrasal()