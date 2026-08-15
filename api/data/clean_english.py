import sqlite3
import os

# Указываем путь к базе семантических графов
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "semantic_dictionary.db")


def remove_english_words():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Сначала удаляем все связи этих слов с семантическими графами (чтобы не нарушить FOREIGN KEY)
        cursor.execute("DELETE FROM word_concept_edges WHERE word_id < 100000")
        edges_deleted = cursor.rowcount

        # 2. Затем удаляем сами английские слова из главной таблицы
        cursor.execute("DELETE FROM global_words WHERE id < 100000")
        words_deleted = cursor.rowcount

        conn.commit()

        print("✅ Очистка успешно завершена!")
        print(f"🗑 Удалено английских слов: {words_deleted}")
        print(f"🔗 Удалено ошибочных связей: {edges_deleted}")
        print("🇩🇪 В базе остались только немецкие слова.")

    except Exception as e:
        print(f"❌ Произошла ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    remove_english_words()