import zipfile
import sqlite3
import json
import os
import re

# Имя твоего файла
APKG_FILE = "German_Verben_mit_Prpositionen_A1_A2_B1_B2_C1_C2.apkg"
DB_FILE = "collection.anki21"  # или collection.anki2, скрипт проверит оба


def clean_html(raw_html):
    """Удаляет HTML-теги из текста карточек Anki (например, <b>, <br>)"""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Убираем неразрывные пробелы и лишние пробелы по краям
    return cleantext.replace('&nbsp;', ' ').strip()


def extract_anki_to_json():
    print("📦 Распаковываем архив Anki...")
    with zipfile.ZipFile(APKG_FILE, 'r') as z:
        # Ищем файл базы данных внутри архива
        if 'collection.anki21' in z.namelist():
            z.extract('collection.anki21')
            db_name = 'collection.anki21'
        elif 'collection.anki2' in z.namelist():
            z.extract('collection.anki2')
            db_name = 'collection.anki2'
        else:
            print("❌ База данных не найдена в архиве.")
            return

    print("🔍 Читаем базу данных SQLite...")
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Достаем все карточки из таблицы notes
    cursor.execute("SELECT flds FROM notes")
    rows = cursor.fetchall()

    verbs_dict = {}

    for row in rows:
        # Anki склеивает поля (Лицо, Изнанка) через символ \x1f
        fields = row[0].split('\x1f')

        if len(fields) >= 2:
            # Очищаем немецкий глагол (обычно это первое поле)
            german_verb = clean_html(fields[0])
            # Очищаем перевод (обычно это второе поле)
            translation = clean_html(fields[1])

            # Сохраняем только если поля не пустые
            if german_verb and translation:
                verbs_dict[german_verb] = {
                    "translations": {
                        "ru": {
                            translation: []  # Сохраняем в структуре, похожей на твой первый JSON
                        }
                    }
                }

    conn.close()

    # Удаляем временный файл базы данных
    if os.path.exists(db_name):
        os.remove(db_name)

    print(f"✅ Найдено {len(verbs_dict)} глаголов с предлогами!")

    # Сохраняем в красивый JSON
    output_file = "german_phrasal_verbs.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(verbs_dict, f, ensure_ascii=False, indent=4)

    print(f"🎉 Готово! Файл сохранен как {output_file}")


if __name__ == "__main__":
    extract_anki_to_json()