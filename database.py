"""
Модуль для работы с базой данных.
Инициализирует SQLAlchemy и создает таблицы.
"""
from flask_sqlalchemy import SQLAlchemy

# Создаем объект SQLAlchemy для работы с базой данных
db = SQLAlchemy()


def init_database(app):
    """
    Инициализирует базу данных в контексте Flask приложения.

    Args:
        app: Flask приложение

    Returns:
        None
    """
    # Связываем SQLAlchemy с приложением
    db.init_app(app)

    # В контексте приложения создаем все таблицы
    with app.app_context():
        try:
            # Создаем таблицы, если они не существуют
            db.create_all()
            print("✅ База данных инициализирована")
        except Exception as e:
            print(f"❌ Ошибка при инициализации базы данных: {e}")