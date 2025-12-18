import os

# Базовая директория приложения
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Секретный ключ для сессий
SECRET_KEY = 'ваш-секретный-ключ-здесь'

# Настройки базы данных (SQLite) в папке database
DATABASE_DIR = os.path.join(BASE_DIR, 'database')
os.makedirs(DATABASE_DIR, exist_ok=True)  # Создаем папку если нет

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATABASE_DIR, 'shop.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False