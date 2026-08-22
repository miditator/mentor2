import sqlite3
import json
import os

# Получаем папку, где лежит скрипт (api/data)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Поднимаемся на ДВА уровня выше: из api/data в api, а оттуда в корень проекта
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))

# Полные пути к базе и к источнику
DB_PATH = os.path.join(ROOT_DIR, "mentor_bot.db")
JSON_PATH = os.path.join(CURRENT_DIR, "phrasal_verbs_ru.json")

def seed_phrasal_verbs():
    print(f"📌 Ищем базу данных по пути: {DB_PATH}")
    print(f"📌 Ищем JSON-файл по пути: {JSON_PATH}")

    if not os.path.exists(DB_PATH):
        print(f"❌ Ошибка: База данных не найдена по пути {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Убеждаемся, что таблица существует
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_phrasal_verbs
                   (
                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                       word_foreign TEXT UNIQUE,
                       word_ru TEXT
                   )
                   ''')

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

            first = True
            added_count = 0

            for verb, info in data.items():
                ru_translation = verb
                translations = info.get("translations", {})
                for key, val in translations.items():
                    if val:
                        ru_translation = list(val.keys())[0].capitalize()
                        break

                try:
                    # Первому глаголу жестко даем ID 1000000
                    if first:
                        cursor.execute(
                            "INSERT OR IGNORE INTO global_phrasal_verbs (id, word_foreign, word_ru) VALUES (?, ?, ?)",
                            (1000000, verb, ru_translation))
                        first = False
                    else:
                        cursor.execute(
                            "INSERT OR IGNORE INTO global_phrasal_verbs (word_foreign, word_ru) VALUES (?, ?)",
                            (verb, ru_translation))

                    added_count += 1
                except sqlite3.IntegrityError:
                    pass

        conn.commit()
        print(f"✅ Готово! Добавлено/проверено {added_count} фразовых глаголов.")

    except FileNotFoundError:
        print(f"❌ Ошибка: Файл {JSON_PATH} не найден!")
    except json.JSONDecodeError:
        print(f"❌ Ошибка: Файл {JSON_PATH} содержит невалидный JSON!")
    finally:
        conn.close()

if __name__ == "__main__":
    print("Начинаю загрузку фразовых глаголов в базу данных...")
    seed_phrasal_verbs()