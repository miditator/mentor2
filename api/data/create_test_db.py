import json
import sqlite3

DB_NAME = "semantic_dictionary.db" # 🔥 Имя чистовой базы
JSON_FILE = "vocab_en.json"  # Точное имя твоего файла


def setup_main_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Создаем таблицу для слов
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_words
                   (
                       id INTEGER PRIMARY KEY,
                       word TEXT NOT NULL,
                       lang TEXT NOT NULL,
                       pos TEXT NOT NULL,
                       cefr_level TEXT NOT NULL
                   )
                   ''')
    cursor.execute('DELETE FROM global_words')  # Очищаем перед заливкой

    # 2. Читаем JSON с правильной кодировкой
    print("Чтение JSON файла...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    inserted_count = 0

    # 3. Переносим ВСЕ слова (лимит убран)
    for level, pos_groups in data.items():
        for pos, words_list in pos_groups.items():
            for item in words_list:
                cursor.execute('''
                               INSERT INTO global_words (id, word, lang, pos, cefr_level)
                               VALUES (?, ?, ?, ?, ?)
                               ''', (item['id'], item['word'], "de", pos, level))
                inserted_count += 1

    conn.commit()
    conn.close()
    print(f"✅ Готово! В основную базу добавлено чистых слов: {inserted_count}")


if __name__ == "__main__":
    setup_main_db()