import json

with open("full-word.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

vocab_en = {
    "A1": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []},
    "A2": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []},
    "B1": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []},
    "B2": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []},
    "C1": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []},
    "C2": {"verbs": [], "nouns": [], "adjectives": [], "adverbs": []}
}

pos_mapping = {
    "verb": "verbs",
    "noun": "nouns",
    "adjective": "adjectives",
    "adverb": "adverbs"
}

# Используем enumerate, чтобы иметь резервный ID на случай отсутствия ключа id в исходнике
for index, item in enumerate(raw_data, start=1):
    val = item.get("value", {})
    word = val.get("word")
    pos = val.get("type")
    level = val.get("level", "").strip().upper()

    # Пытаемся взять оригинальный ID, если нет — используем индекс
    word_id = item.get("id") or val.get("id") or index

    if level in vocab_en and pos in pos_mapping:
        target_category = pos_mapping[pos]

        # Проверяем на дубликаты по слову
        existing_words = [w["word"] for w in vocab_en[level][target_category]]
        if word not in existing_words:
            # 🔥 Теперь сохраняем ОБЪЕКТ с id и словом
            vocab_en[level][target_category].append({
                "id": word_id,
                "word": word
            })

with open("api/data/vocab_en.json", "w", encoding="utf-8") as f:
    json.dump(vocab_en, f, ensure_ascii=False, indent=2)

print("Файл vocab_en.json успешно сгенерирован (теперь с ID)!")