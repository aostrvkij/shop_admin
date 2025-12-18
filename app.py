from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from database import db, init_database
from models import Category, Product
import os
from functools import wraps
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config.from_pyfile('config.py')

# Секретный ключ для сессий (добавьте в config.py или здесь)
app.secret_key = 'your-secret-key-here-123456'

# Инициализируем базу данных
init_database(app)

# Настройки загрузки файлов
UPLOAD_FOLDER = 'static/images/products'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Создаем папку если ее нет
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_image(file, product_id):
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"product_{product_id}.{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return f"/static/images/products/{filename}"
    return None


def delete_old_image(product_id):
    for ext in ALLOWED_EXTENSIONS:
        old_file = os.path.join(app.config['UPLOAD_FOLDER'], f"product_{product_id}.{ext}")
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception as e:
                print(f"Ошибка удаления файла {old_file}: {e}")


# Декоратор для проверки аутентификации
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)

    return decorated_function


# ==================== ГЛАВНЫЕ СТРАНИЦЫ ====================
@app.route('/')
def shop():
    return render_template('shop.html')


@app.route('/admin')
@admin_required
def admin():
    return render_template('admin.html')


@app.route('/admin/<password>')
def admin_login(password):
    correct_password = "123123"
    if password == correct_password:
        session['admin_logged_in'] = True
        session.permanent = True
        return render_template('admin.html')
    else:
        return "Неверный пароль админки", 401


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('shop'))


# ==================== API ДЛЯ МАГАЗИНА ====================
@app.route('/api/categories')
def get_categories():
    categories = Category.query.all()
    result = [{'id': cat.id, 'name': cat.name} for cat in categories]
    return jsonify(result)


@app.route('/api/products')
def get_all_products():
    products = Product.query.all()
    result = []
    for product in products:
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': product.price,
            'image': product.image,
            'category_id': product.category_id
        }
        result.append(product_data)
    return jsonify(result)


# ==================== API ДЛЯ АДМИНКИ ====================
@app.route('/api/admin/check-auth')
def admin_check_auth():
    if session.get('admin_logged_in'):
        return jsonify({'authenticated': True})
    else:
        return jsonify({'authenticated': False}), 401


# ---------- КАТЕГОРИИ ----------
@app.route('/api/admin/categories', methods=['GET'])
@admin_required
def get_admin_categories():
    categories = Category.query.all()
    result = [{'id': cat.id, 'name': cat.name} for cat in categories]
    return jsonify(result)


@app.route('/api/admin/categories', methods=['POST'])
@admin_required
def add_category():
    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({'error': 'Отсутствует название категории'}), 400

        # Проверяем, не существует ли уже категория с таким именем
        existing_category = Category.query.filter_by(name=data['name']).first()
        if existing_category:
            return jsonify({'error': 'Категория с таким именем уже существует'}), 400

        new_category = Category(name=data['name'])
        db.session.add(new_category)
        db.session.commit()

        return jsonify({
            'message': 'Category added successfully',
            'category': {
                'id': new_category.id,
                'name': new_category.name
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка добавления категории: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({'error': 'Отсутствует название категории'}), 400

        category = Category.query.get_or_404(category_id)

        # Проверяем, не существует ли уже другая категория с таким именем
        existing_category = Category.query.filter(
            Category.name == data['name'],
            Category.id != category_id
        ).first()

        if existing_category:
            return jsonify({'error': 'Категория с таким именем уже существует'}), 400

        category.name = data['name']
        db.session.commit()

        return jsonify({'message': 'Category updated successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка обновления категории: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)

        # Удаляем все товары этой категории
        Product.query.filter_by(category_id=category_id).delete()

        # Удаляем категорию
        db.session.delete(category)
        db.session.commit()

        return jsonify({'message': 'Category and its products deleted successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка удаления категории: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ---------- ТОВАРЫ ----------
@app.route('/api/admin/products', methods=['POST'])
@admin_required
def add_product():
    try:
        # Создаем товар сначала без изображения
        name = request.form.get('name')
        price = request.form.get('price')
        category_id = request.form.get('category_id')

        if not name or not price or not category_id:
            return jsonify({'error': 'Все поля обязательны'}), 400

        new_product = Product(
            name=name,
            price=float(price),
            category_id=int(category_id)
        )
        db.session.add(new_product)
        db.session.commit()

        # Теперь обрабатываем изображение с известным ID товара
        image_file = request.files.get('image')
        if image_file and image_file.filename:
            image_path = save_image(image_file, new_product.id)
            if image_path:
                new_product.image = image_path
                db.session.commit()

        return jsonify({
            'message': 'Product added successfully',
            'product': {
                'id': new_product.id,
                'name': new_product.name,
                'price': new_product.price,
                'image': new_product.image,
                'category_id': new_product.category_id
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка добавления товара: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)

        product.name = request.form.get('name', product.name)

        price = request.form.get('price')
        if price is not None:
            product.price = float(price)

        category_id = request.form.get('category_id')
        if category_id is not None:
            product.category_id = int(category_id)

        # Обрабатываем новое изображение
        image_file = request.files.get('image')
        if image_file and image_file.filename:
            # Удаляем старое изображение
            delete_old_image(product_id)
            # Сохраняем новое
            image_path = save_image(image_file, product_id)
            if image_path:
                product.image = image_path

        db.session.commit()
        return jsonify({'message': 'Product updated successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка обновления товара: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)

        # Удаляем изображение
        delete_old_image(product_id)

        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/products/<int:product_id>', methods=['GET'])
@admin_required
def get_admin_product(product_id):
    product = Product.query.get_or_404(product_id)
    product_data = {
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'image': product.image,
        'category_id': product.category_id
    }
    return jsonify(product_data)


# ==================== ЗАПУСК ====================
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)