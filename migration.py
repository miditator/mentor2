import sqlite3

conn = sqlite3.connect("mentor_bot.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE user_settings ADD COLUMN phrases_per_day INTEGER DEFAULT 10;")
    conn.commit()
    print("✅ Колонка phrases_per_day успешно добавлена!")
except sqlite3.OperationalError as e:
    print("⚠️ Ошибка (возможно, колонка уже существует):", e)
finally:
    conn.close()