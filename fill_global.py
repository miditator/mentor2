import json
import sqlite3


def import_json_to_db(json_filepath, lang_code):
    conn = sqlite3.connect("mentor_bot.db")
    cursor = conn.cursor()

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

    with open(json_filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for level, parts in data.items():
        if level == "C2":  # Пропускаем пустой С2
            continue
        for pos, words in parts.items():
            for item in words:
                cursor.execute('''
                    INSERT OR REPLACE INTO global_dictionary 
                    (id, lang, level, part_of_speech, word_foreign) 
                    VALUES (?, ?, ?, ?, ?)
                ''', (item['id'], lang_code, level, pos, item['word']))

    conn.commit()
    conn.close()
    print(f"✅ Словарь {lang_code} из {json_filepath} успешно загружен!")


if __name__ == "__main__":
    # Запусти этот скрипт ОДИН раз
    import_json_to_db('vocab_en.json', 'en')
    import_json_to_db('vocab_de.json', 'de')