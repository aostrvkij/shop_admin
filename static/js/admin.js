// Основной объект для хранения данных
let adminData = {
    categories: [],
    products: [],
    currentProductId: null,
    currentCategoryId: null
};

// DOM элементы
const elements = {
    // Таблицы
    categoriesTable: document.getElementById('categories-table'),
    productsTable: document.getElementById('products-table'),

    // Кнопки
    addCategoryBtn: document.getElementById('add-category-btn'),
    addProductBtn: document.getElementById('add-product-btn'),
    logoutBtn: document.getElementById('logout-btn'),

    // Фильтры
    categoryFilter: document.getElementById('category-filter'),

    // Модальные окна
    modalOverlay: document.getElementById('modal-overlay'),
    categoryModal: document.getElementById('category-modal'),
    productModal: document.getElementById('product-modal'),
    confirmModal: document.getElementById('confirm-modal'),

    // Формы
    categoryForm: document.getElementById('category-form'),
    productForm: document.getElementById('product-form'),
    confirmDeleteBtn: document.getElementById('confirm-delete'),

    // Поля формы категории
    categoryId: document.getElementById('category-id'),
    categoryName: document.getElementById('category-name'),
    categoryModalTitle: document.getElementById('category-modal-title'),

    // Поля формы товара
    productId: document.getElementById('product-id'),
    productName: document.getElementById('product-name'),
    productPrice: document.getElementById('product-price'),
    productCategory: document.getElementById('product-category'),
    productImage: document.getElementById('product-image'),
    productModalTitle: document.getElementById('product-modal-title'),
    imagePreview: document.getElementById('image-preview'),

    // Сообщения
    confirmMessage: document.getElementById('confirm-message')
};

// Проверка сессии
async function checkSession() {
    try {
        const response = await fetch('/api/admin/check-auth', {
            credentials: 'same-origin'
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка проверки сессии:', error);
        return false;
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Ошибка загрузки категорий');

        adminData.categories = await response.json();
        renderCategories();
        populateCategoryDropdowns();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        showError('categories-table', 'Не удалось загрузить категории');
    }
}

// Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Ошибка загрузки товаров');

        adminData.products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showError('products-table', 'Не удалось загрузить товары');
    }
}

// Отрисовка категорий
function renderCategories() {
    if (adminData.categories.length === 0) {
        elements.categoriesTable.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    <i class="fas fa-list"></i>
                    <p>Категорий пока нет</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    adminData.categories.forEach(category => {
        html += `
            <tr>
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="editCategory(${category.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="action-btn delete-btn" onclick="confirmDeleteCategory(${category.id}, '${category.name}')">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    elements.categoriesTable.innerHTML = html;
}

// Отрисовка товаров
function renderProducts() {
    // Фильтруем товары если выбран фильтр
    let filteredProducts = adminData.products;
    const filterValue = elements.categoryFilter.value;

    if (filterValue !== 'all') {
        filteredProducts = adminData.products.filter(
            product => product.category_id == filterValue
        );
    }

    if (filteredProducts.length === 0) {
        elements.productsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Товаров пока нет</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filteredProducts.forEach(product => {
        const category = adminData.categories.find(c => c.id == product.category_id);
        const categoryName = category ? category.name : 'Неизвестно';
        const imageUrl = product.image || '/static/images/default-product.jpg';

        html += `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${imageUrl}" alt="${product.name}"
                         class="table-image"
                         onerror="this.src='/static/images/default-product.jpg'">
                </td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)} ₽</td>
                <td>${categoryName}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="action-btn delete-btn" onclick="confirmDeleteProduct(${product.id}, '${product.name}')">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    elements.productsTable.innerHTML = html;
}

// Заполнение выпадающих списков категорий
function populateCategoryDropdowns() {
    // Для фильтра товаров
    elements.categoryFilter.innerHTML = '<option value="all">Все категории</option>';
    adminData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        elements.categoryFilter.appendChild(option);
    });

    // Для формы добавления/редактирования товара
    elements.productCategory.innerHTML = '<option value="">Выберите категорию</option>';
    adminData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        elements.productCategory.appendChild(option);
    });
}

// Форматирование цены
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Показать ошибку
function showError(tableId, message) {
    const table = document.getElementById(tableId);
    table.innerHTML = `
        <tr>
            <td colspan="${tableId === 'categories-table' ? 3 : 6}" class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

// Работа с модальными окнами
function openModal(modal) {
    elements.modalOverlay.style.display = 'block';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modalOverlay.style.display = 'none';
    elements.categoryModal.style.display = 'none';
    elements.productModal.style.display = 'none';
    elements.confirmModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    clearForms();
}

function clearForms() {
    // Очищаем форму категории
    elements.categoryId.value = '';
    elements.categoryName.value = '';
    elements.categoryModalTitle.textContent = 'Добавить категорию';

    // Очищаем форму товара
    elements.productId.value = '';
    elements.productName.value = '';
    elements.productPrice.value = '';
    elements.productCategory.value = '';
    elements.productImage.value = '';
    elements.imagePreview.innerHTML = '';
    elements.productModalTitle.textContent = 'Добавить товар';
}

// Функции для категорий
function openCategoryModal() {
    openModal(elements.categoryModal);
}

function editCategory(categoryId) {
    const category = adminData.categories.find(c => c.id == categoryId);
    if (!category) return;

    elements.categoryId.value = category.id;
    elements.categoryName.value = category.name;
    elements.categoryModalTitle.textContent = 'Изменить категорию';
    openModal(elements.categoryModal);
}

function confirmDeleteCategory(categoryId, categoryName) {
    adminData.currentCategoryId = categoryId;
    elements.confirmMessage.textContent = `Вы уверены, что хотите удалить категорию "${categoryName}"? Все товары в этой категории также будут удалены.`;
    openModal(elements.confirmModal);
}

// Функции для товаров
function openProductModal() {
    if (adminData.categories.length === 0) {
        alert('Сначала добавьте хотя бы одну категорию');
        return;
    }
    openModal(elements.productModal);
}

function editProduct(productId) {
    const product = adminData.products.find(p => p.id == productId);
    if (!product) return;

    elements.productId.value = product.id;
    elements.productName.value = product.name;
    elements.productPrice.value = product.price;
    elements.productCategory.value = product.category_id;
    elements.productModalTitle.textContent = 'Изменить товар';

    // Показываем превью изображения если есть
    if (product.image) {
        elements.imagePreview.innerHTML = `
            <img src="${product.image}" alt="Текущее изображение">
            <p><small>Текущее изображение</small></p>
        `;
    }

    openModal(elements.productModal);
}

function confirmDeleteProduct(productId, productName) {
    adminData.currentProductId = productId;
    elements.confirmMessage.textContent = `Вы уверены, что хотите удалить товар "${productName}"?`;
    openModal(elements.confirmModal);
}

// Обработчики форм
async function handleCategorySubmit(e) {
    e.preventDefault();

    const id = elements.categoryId.value;
    const name = elements.categoryName.value.trim();

    if (!name) {
        alert('Введите название категории');
        return;
    }

    try {
        const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name: name }),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }

        await loadCategories();
        await loadProducts();
        closeModal();
        alert(id ? 'Категория изменена' : 'Категория добавлена');

    } catch (error) {
        console.error('Ошибка сохранения категории:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const id = elements.productId.value;
    const name = elements.productName.value.trim();
    const price = elements.productPrice.value;
    const categoryId = elements.productCategory.value;
    const imageFile = elements.productImage.files[0];

    // Валидация
    if (!name) {
        alert('Введите название товара');
        return;
    }
    if (!price || parseFloat(price) <= 0) {
        alert('Введите корректную цену');
        return;
    }
    if (!categoryId) {
        alert('Выберите категорию');
        return;
    }

    try {
        const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
        const method = id ? 'PUT' : 'POST';

        // Создаем FormData для отправки файла
        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', price);
        formData.append('category_id', categoryId);

        if (imageFile) {
            formData.append('image', imageFile);
        }

        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Не удалось распарсить JSON
            }
            throw new Error(errorMessage);
        }

        await loadProducts();
        closeModal();
        alert(id ? 'Товар изменен' : 'Товар добавлен');

    } catch (error) {
        console.error('Ошибка сохранения товара:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// Обработчики удаления
async function handleDeleteCategory() {
    try {
        const response = await fetch(`/api/admin/categories/${adminData.currentCategoryId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        await loadCategories();
        await loadProducts();
        closeModal();
        alert('Категория удалена');

    } catch (error) {
        console.error('Ошибка удаления категории:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

async function handleDeleteProduct() {
    try {
        const response = await fetch(`/api/admin/products/${adminData.currentProductId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        await loadProducts();
        closeModal();
        alert('Товар удален');

    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// Превью изображения
elements.productImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
        alert('Выберите файл изображения');
        this.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        elements.imagePreview.innerHTML = `
            <img src="${e.target.result}" alt="Превью">
            <p><small>Превью нового изображения</small></p>
        `;
    };
    reader.readAsDataURL(file);
});

// Инициализация
async function init() {
    // Проверяем авторизацию
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
        window.location.href = '/';
        return;
    }

    // Загружаем данные
    await Promise.all([loadCategories(), loadProducts()]);

    // Назначаем обработчики
    elements.addCategoryBtn.addEventListener('click', openCategoryModal);
    elements.addProductBtn.addEventListener('click', openProductModal);
    elements.logoutBtn.addEventListener('click', () => {
        window.location.href = '/admin/logout';
    });

    elements.categoryForm.addEventListener('submit', handleCategorySubmit);
    elements.productForm.addEventListener('submit', handleProductSubmit);
    elements.confirmDeleteBtn.addEventListener('click', () => {
        if (adminData.currentCategoryId) {
            handleDeleteCategory();
        } else if (adminData.currentProductId) {
            handleDeleteProduct();
        }
    });

    // Обработчики закрытия модальных окон
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    elements.modalOverlay.addEventListener('click', closeModal);

    // Обработчик фильтра категорий
    elements.categoryFilter.addEventListener('change', renderProducts);

    // Отменяем закрытие при клике на само модальное окно
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => e.stopPropagation());
    });
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', init);