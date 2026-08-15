import json
import os
from pathlib import Path

# Пути к файлам (учитывая структуру проекта)
BASE_DIR = Path(__file__).resolve().parent
EN_FILE = BASE_DIR / "api" / "data" / "vocab_en.json"
DE_FILE = BASE_DIR / "api" / "data" / "vocab_de.json"


def normalize_dictionary(filepath, start_id):
    if not filepath.exists():
        print(f"❌ Файл {filepath} не найден!")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    current_id = start_id
    fixed_count = 0

    # Шаг 1: Находим максимальный существующий ID, чтобы не перезаписать чужие
    for level, pos_dict in data.items():
        for pos, words_list in pos_dict.items():
            for item in words_list:
                if isinstance(item, dict) and "id" in item:
                    if isinstance(item["id"], int) and item["id"] >= current_id:
                        current_id = item["id"] + 1

    # Шаг 2: Жесткая нормализация
    for level, pos_dict in data.items():
        for pos, words_list in pos_dict.items():
            new_words_list = []
            for item in words_list:
                if isinstance(item, str):
                    # Если попалась обычная строка — превращаем в объект
                    new_words_list.append({"id": current_id, "word": item.strip()})
                    current_id += 1
                    fixed_count += 1
                elif isinstance(item, dict):
                    # Если это объект, но вдруг без ID или кривой
                    word_text = item.get("word", "")
                    word_id = item.get("id")

                    if not word_id or not isinstance(word_id, int):
                        word_id = current_id
                        current_id += 1
                        fixed_count += 1

                    new_words_list.append({"id": word_id, "word": word_text.strip()})

            # Перезаписываем очищенным списком
            data[level][pos] = new_words_list

    # Шаг 3: Сохраняем идеальный JSON
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Словарь {filepath.name} нормализован!")
    print(f"   Исправлено кривых записей: {fixed_count}. Следующий свободный ID: {current_id}")


print("🚀 Запуск нормализации словарей...\n")
# Английский (ID начинаются с 1)
normalize_dictionary(EN_FILE, 1)
# Немецкий (ID начинаются с 100000, чтобы не пересекались с английским)
normalize_dictionary(DE_FILE, 100000)
print("\n🎉 Готово! Теперь словари идеальны.")