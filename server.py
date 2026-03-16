from flask import Flask, send_from_directory, request, jsonify
import sqlite3
import json
from datetime import datetime
import hashlib
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# В Vercel можно писать в /tmp
DB_PATH = '/tmp/finance.db'


def init_db():
    """Создает базу данных"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                device_id TEXT PRIMARY KEY,
                data TEXT,
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        print("✅ База данных готова")
    except Exception as e:
        print(f"❌ Ошибка БД: {e}")


# Инициализируем при запуске
init_db()


@app.route('/')
def index():
    """Главная страница"""
    try:
        return send_from_directory('.', 'index.html')
    except Exception as e:
        return f"Ошибка: {e}", 500


@app.route('/<path:path>')
def serve_file(path):
    """Раздача статических файлов"""
    try:
        return send_from_directory('.', path)
    except Exception:
        return "Файл не найден", 404


def get_device_id():
    """Получает ID устройства из заголовка"""
    device_id = request.headers.get('X-Device-ID')
    if not device_id:
        ip = request.remote_addr
        device_id = hashlib.md5(ip.encode()).hexdigest()
    return device_id


@app.route('/api/sync', methods=['POST'])
def sync_data():
    """Сохранение данных в базу"""
    try:
        data = request.json
        device_id = get_device_id()

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO users (device_id, data, last_sync)
            VALUES (?, ?, ?)
        ''', (device_id, json.dumps(data), datetime.now()))
        conn.commit()
        conn.close()

        return jsonify({'status': 'ok'})

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/load', methods=['GET'])
def load_data():
    """Загрузка данных из базы"""
    try:
        device_id = get_device_id()

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT data FROM users WHERE device_id = ?', (device_id,))
        result = c.fetchone()
        conn.close()

        if result:
            return jsonify({
                'status': 'ok',
                'data': json.loads(result[0])
            })
        else:
            return jsonify({'status': 'ok', 'data': None})

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/check')
def check():
    """Проверка работы API"""
    return jsonify({
        'status': 'ok',
        'db': os.path.exists(DB_PATH),
        'time': str(datetime.now())
    })

# Для Vercel нужно экспортировать app
# Не добавляй блок if __name__ == '__main__' - Vercel сам запускает