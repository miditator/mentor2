from fastapi import APIRouter
import zipfile
import re
import tempfile
import os
from fastapi import APIRouter, UploadFile, File



router = APIRouter(prefix="/api", tags=["Books"])


@router.post("/books/upload")
async def upload_book(chat_id: int, file: UploadFile = File(...)):
    temp_file_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        extracted_text = ""
        filename = file.filename.lower()

        clean_title = re.sub(r'\.(fb2|epub|mobi|txt|zip)+$', '', file.filename, flags=re.IGNORECASE)
        clean_title = re.sub(r'\.\d+$', '', clean_title)
        clean_title = clean_title.replace('_', ' ')
        book_title = clean_title

        if filename.endswith(".epub"):
            try:
                with zipfile.ZipFile(temp_file_path, 'r') as archive:
                    for item in sorted(archive.namelist()):
                        if item.endswith('.opf'):
                            opf_data = archive.read(item).decode('utf-8', errors='ignore')
                            title_match = re.search(r'<dc:title[^>]*>(.*?)</dc:title>', opf_data, re.IGNORECASE)
                            if title_match:
                                book_title = title_match.group(1)

                        if item.endswith(('.html', '.htm', '.xhtml', '.xml')):
                            if 'META-INF' in item or 'toc.ncx' in item or 'content.opf' in item:
                                continue
                            raw_data = archive.read(item).decode('utf-8', errors='ignore')
                            extracted_text += raw_data + "\n"
            except zipfile.BadZipFile:
                with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                    extracted_text = f.read()
                    title_match = re.search(r'<book-title[^>]*>(.*?)</book-title>', extracted_text, re.IGNORECASE)
                    if title_match:
                        book_title = title_match.group(1)

        elif filename.endswith(".fb2") or filename.endswith(".fb2.epub"):
            with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
                title_match = re.search(r'<book-title[^>]*>(.*?)</book-title>', extracted_text, re.IGNORECASE)
                if title_match:
                    book_title = title_match.group(1)

        elif filename.endswith(".txt"):
            with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        elif filename.endswith(".mobi"):
            import mobi
            tempdir, filepath = mobi.extract(temp_file_path)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        else:
            os.remove(temp_file_path)
            return {"success": False, "error": "Неподдерживаемый формат."}

        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        extracted_text = re.sub(r'<binary.*?>.*?</binary>', '', extracted_text, flags=re.DOTALL)
        extracted_text = re.sub(r'</p>|</div>|</title>|</h1>|</h2>|</h3>|<br\s*/?>|<empty-line\s*/?>', '\n\n',
                                extracted_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'<[^>]+>', '', extracted_text)

        if len(clean_text.strip()) < 50 and len(extracted_text.strip()) > 50:
            clean_text = extracted_text

        clean_text = re.sub(r'[ \t]+', ' ', clean_text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text).strip()

        if not clean_text:
            return {"success": False, "error": "Файл оказался пустым."}

        chunk_size = 1500
        chunks = []
        text_length = len(clean_text)
        pos = 0

        while pos < text_length:
            end_pos = pos + chunk_size
            if end_pos >= text_length:
                chunks.append(clean_text[pos:].strip())
                break

            space_pos = clean_text.rfind('\n\n', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = clean_text.rfind('\n', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = clean_text.rfind(' ', pos, end_pos)
            if space_pos == -1 or space_pos <= pos:
                space_pos = end_pos

            chunks.append(clean_text[pos:space_pos].strip())

            if clean_text[space_pos:space_pos + 2] == '\n\n':
                pos = space_pos + 2
            else:
                pos = space_pos + 1

        return {"success": True, "chunks": chunks, "title": book_title.strip()}

    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"success": False, "error": f"Ошибка сервера: {str(e)}"}