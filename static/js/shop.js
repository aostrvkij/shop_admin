// Основной объект для хранения данных
let shopData = {
    categories: [],
    products: [],
    currentCategory: 'all'
};

// DOM элементы
const elements = {
    categoriesButtons: document.getElementById('categories-buttons'),
    productsContainer: document.getElementById('products-container'),
    currentCategoryTitle: document.getElementById('current-category'),
    productsCount: document.getElementById('products-count')
};

// Функция для загрузки категорий
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Ошибка загрузки категорий');
        
        shopData.categories = await response.json();
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        showError('Не удалось загрузить категории');
    }
}

// Функция для загрузки товаров
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Ошибка загрузки товаров');
        
        shopData.products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showError('Не удалось загрузить товары');
    }
}

// Функция для отрисовки категорий
function renderCategories() {
    elements.categoriesButtons.innerHTML = '';
    
    // Кнопка "Все товары"
    const allButton = createCategoryButton('all', 'Все товары', 'fas fa-boxes');
    elements.categoriesButtons.appendChild(allButton);
    
    // Кнопки категорий
    shopData.categories.forEach(category => {
        const button = createCategoryButton(
            category.id, 
            category.name, 
            'fas fa-tag'
        );
        elements.categoriesButtons.appendChild(button);
    });
}

// Функция для создания кнопки категории
function createCategoryButton(categoryId, text, iconClass) {
    const button = document.createElement('button');
    button.className = 'category-btn';
    if (categoryId === shopData.currentCategory) {
        button.classList.add('active');
    }
    
    button.dataset.category = categoryId;
    button.innerHTML = `<i class="${iconClass}"></i> ${text}`;
    
    button.addEventListener('click', () => {
        setCurrentCategory(categoryId);
    });
    
    return button;
}

// Функция для установки текущей категории
function setCurrentCategory(categoryId) {
    shopData.currentCategory = categoryId;
    
    // Обновляем активные кнопки
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === categoryId) {
            btn.classList.add('active');
        }
    });
    
    // Обновляем заголовок
    if (categoryId === 'all') {
        elements.currentCategoryTitle.textContent = 'Все товары';
    } else {
        const category = shopData.categories.find(c => c.id == categoryId);
        elements.currentCategoryTitle.textContent = category ? category.name : 'Товары';
    }
    
    // Перерисовываем товары
    renderProducts();
}

// Функция для отрисовки товаров
function renderProducts() {
    // Фильтруем товары по текущей категории
    let filteredProducts;
    if (shopData.currentCategory === 'all') {
        filteredProducts = shopData.products;
    } else {
        filteredProducts = shopData.products.filter(
            product => product.category_id == shopData.currentCategory
        );
    }
    
    // Обновляем счетчик
    elements.productsCount.textContent = filteredProducts.length;
    
    // Очищаем контейнер
    elements.productsContainer.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        elements.productsContainer.innerHTML = `
            <div class="no-products">
                <i class="fas fa-box-open"></i>
                <p>Товаров в этой категории пока нет</p>
            </div>
        `;
        return;
    }
    
    // Создаем карточки товаров
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        elements.productsContainer.appendChild(productCard);
    });
}

// Функция для создания карточки товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Изображение товара
    const imageSrc = product.image || '/static/images/default-product.jpg';
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${imageSrc}" alt="${product.name}" 
                 onerror="this.src='/static/images/default-product.jpg'">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">${formatPrice(product.price)} ₽</div>
        </div>
    `;
    
    return card;
}

// Функция для форматирования цены
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Функция для отображения ошибки
function showError(message) {
    elements.productsContainer.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Функция инициализации
async function init() {
    try {
        // Показываем загрузку
        elements.productsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка...
            </div>
        `;
        
        // Загружаем данные параллельно
        await Promise.all([loadCategories(), loadProducts()]);
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Не удалось загрузить данные магазина');
    }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', init);