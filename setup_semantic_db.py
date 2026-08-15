import sqlite3
import json

NEW_DB_NAME = "semantic_dictionary.db"


def init_standalone_db():
    conn = sqlite3.connect(NEW_DB_NAME)
    cursor = conn.cursor()

    # 1. Таблица всех слов
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS global_words
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY,
                       word
                       TEXT
                       NOT
                       NULL,
                       lang
                       TEXT
                       NOT
                       NULL,
                       pos
                       TEXT
                       NOT
                       NULL,
                       cefr_level
                       TEXT
                       NOT
                       NULL
                   )
                   ''')

    # 2. Таблица семантических категорий (40 штук)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS semantic_concepts
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       name
                       TEXT
                       UNIQUE
                       NOT
                       NULL
                   )
                   ''')

    # 3. Таблица связей (Слово <-> Категория)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS word_concept_edges
                   (
                       word_id
                       INTEGER,
                       concept_id
                       INTEGER,
                       PRIMARY
                       KEY
                   (
                       word_id,
                       concept_id
                   ),
                       FOREIGN KEY
                   (
                       word_id
                   ) REFERENCES global_words
                   (
                       id
                   ),
                       FOREIGN KEY
                   (
                       concept_id
                   ) REFERENCES semantic_concepts
                   (
                       id
                   )
                       )
                   ''')

    # Индексы для сверхбыстрого поиска
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_words_lang_pos ON global_words(lang, pos)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_concept ON word_concept_edges(concept_id)")

    conn.commit()
    conn.close()
    print("✅ База данных semantic_dictionary.db успешно создана!")


def import_words_from_json(filepath, lang):
    conn = sqlite3.connect(NEW_DB_NAME)
    cursor = conn.cursor()

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for cefr_level, pos_groups in data.items():
        for pos, words_list in pos_groups.items():
            for item in words_list:
                cursor.execute('''
                               INSERT
                               OR IGNORE INTO global_words 
                    (id, word, lang, pos, cefr_level) 
                    VALUES (?, ?, ?, ?, ?)
                               ''', (item['id'], item['word'], lang, pos, cefr_level))

    conn.commit()
    conn.close()
    print(f"✅ Словарь {lang} ({filepath}) импортирован в новую базу.")


if __name__ == "__main__":
    init_standalone_db()
    # Укажи правильные пути к твоим файлам
    import_words_from_json("api/data/vocab_en.json", "en")
    import_words_from_json("api/data/vocab_de.json", "de")