import json
import os

# Путь к вашему текущему немецкому словарю
file_path = "api/data/vocab_de.json"

if not os.path.exists(file_path):
    print(f"Файл {file_path} не найден!")
else:
    with open(file_path, "r", encoding="utf-8") as f:
        vocab_de = json.load(f)

    # Начнем ID для немецких слов с 100000, 
    # чтобы они визуально отличались от английских в базе данных
    current_id = 100000

    for level, pos_dict in vocab_de.items():
        for pos, words_list in pos_dict.items():
            new_words_list = []
            for item in words_list:
                # Если слово еще в старом формате (просто строка)
                if isinstance(item, str):
                    new_words_list.append({
                        "id": current_id,
                        "word": item
                    })
                    current_id += 1
                # Если скрипт уже запускался и слово стало объектом
                elif isinstance(item, dict) and "word" in item:
                    new_words_list.append(item)

            # Перезаписываем список в словаре
            vocab_de[level][pos] = new_words_list

    # Сохраняем обновленный файл
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(vocab_de, f, ensure_ascii=False, indent=2)

    print(f"✅ Немецкий словарь успешно обновлен! Сгенерированы ID до {current_id - 1}")