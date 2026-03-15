// script.js
let tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.text = "Закрыть";
tg.MainButton.onClick(() => tg.close());

// Состояние приложения
let appState = {
    balance: 0,
    transactions: [],
    budget: 0,
    todayIncome: 0,
    todayExpense: 0
};

// Загружаем сохраненные данные
function loadData() {
    try {
        const saved = localStorage.getItem('financeData');
        if (saved) {
            appState = JSON.parse(saved);
            updateUI();
        }
    } catch (e) {
        console.error('Ошибка загрузки:', e);
    }
}

// Сохраняем данные
function saveData() {
    try {
        localStorage.setItem('financeData', JSON.stringify(appState));
        // Отправляем данные боту
        tg.sendData(JSON.stringify({
            type: 'sync',
            balance: appState.balance,
            transactions: appState.transactions.slice(-10)
        }));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

// Добавление транзакции
function addTransaction(type, amount, category, description, date) {
    const transaction = {
        id: Date.now(),
        type: type,
        amount: amount,
        category: category,
        description: description,
        date: date || new Date().toISOString()
    };

    appState.transactions.push(transaction);

    // Обновляем баланс
    if (type === 'income') {
        appState.balance += amount;
    } else {
        appState.balance -= amount;
    }

    updateUI();
    saveData();

    return transaction;
}

// Обновление интерфейса
function updateUI() {
    // Баланс
    document.getElementById('balance').textContent = formatMoney(appState.balance);

    // Сегодняшние операции
    const today = new Date().toDateString();
    let todayIncome = 0;
    let todayExpense = 0;

    appState.transactions.forEach(t => {
        const tDate = new Date(t.date).toDateString();
        if (tDate === today) {
            if (t.type === 'income') {
                todayIncome += t.amount;
            } else {
                todayExpense += t.amount;
            }
        }
    });

    document.getElementById('todayIncome').textContent = formatMoney(todayIncome);
    document.getElementById('todayExpense').textContent = formatMoney(todayExpense);

    // История
    const historyEl = document.getElementById('history');
    historyEl.innerHTML = '';

    appState.transactions.slice(-10).reverse().forEach(t => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const date = new Date(t.date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="history-left">
                <span class="history-category">${getCategoryName(t.category)}</span>
                <span class="history-desc">${t.description || '—'}</span>
            </div>
            <div class="history-right">
                <div class="history-amount ${t.type === 'income' ? 'income' : 'expense'}">
                    ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                </div>
                <div class="history-date">${date}</div>
            </div>
        `;

        historyEl.appendChild(item);
    });

    // Бюджет
    updateBudgetUI();
}

// Обновление бюджета
function updateBudgetUI() {
    if (appState.budget > 0) {
        // Расходы за месяц
        const now = new Date();
        const monthExpenses = appState.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'expense' &&
                       tDate.getMonth() === now.getMonth() &&
                       tDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const percent = Math.min((monthExpenses / appState.budget) * 100, 100);

        document.getElementById('budgetBar').style.width = percent + '%';
        document.getElementById('spentAmount').textContent = formatMoney(monthExpenses);
        document.getElementById('budgetAmount').textContent = formatMoney(appState.budget);
    } else {
        document.getElementById('budgetBar').style.width = '0%';
        document.getElementById('spentAmount').textContent = '0 ₽';
        document.getElementById('budgetAmount').textContent = '0 ₽';
    }
}

// Форматирование денег
function formatMoney(amount) {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') + ' ₽';
}

// Получение названия категории
function getCategoryName(category) {
    const categories = {
        // Доходы
        'salary': '💼 Зарплата',
        'gifts': '🎁 Подарки',
        'investments': '📈 Инвестиции',
        'freelance': '💻 Фриланс',

        // Расходы
        'food': '🍔 Еда',
        'housing': '🏠 Жилье',
        'transport': '🚗 Транспорт',
        'clothes': '👕 Одежда',
        'health': '💊 Здоровье',
        'entertainment': '🎮 Развлечения',
        'education': '📚 Образование',
        'pets': '🐶 Животные',
        'communication': '📱 Связь',
        'gifts_expense': '🎁 Подарки',
        'work': '💼 Работа',

        // Другое
        'other': '💰 Другое',
        'other_expense': '💰 Другое'
    };

    return categories[category] || category;
}

// Показ формы транзакции
function showForm(type) {
    currentType = type;

    document.getElementById('formTitle').textContent =
        type === 'income' ? '💰 Добавить доход' : '💸 Добавить расход';

    // Показываем нужные категории
    document.getElementById('incomeCategories').style.display =
        type === 'income' ? 'block' : 'none';
    document.getElementById('expenseCategories').style.display =
        type === 'expense' ? 'block' : 'none';

    // Устанавливаем сегодняшнюю дату
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;

    document.getElementById('app').style.display = 'none';
    document.getElementById('transactionForm').style.display = 'block';
}

// Скрытие формы
function hideForm() {
    document.getElementById('transactionForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Очищаем форму
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
}

// Сохранение транзакции
function saveTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('transactionDate').value;

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    addTransaction(currentType, amount, category, description, date);
    hideForm();
}

// Показ формы бюджета
function showBudgetForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('budgetForm').style.display = 'block';
    document.getElementById('budgetInput').value = appState.budget || '';
}

// Скрытие формы бюджета
function hideBudgetForm() {
    document.getElementById('budgetForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Сохранение бюджета
function saveBudget() {
    const budget = parseFloat(document.getElementById('budgetInput').value);

    if (isNaN(budget) || budget < 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    appState.budget = budget;
    updateBudgetUI();
    saveData();
    hideBudgetForm();

    tg.showAlert(`✅ Бюджет установлен: ${formatMoney(budget)}`);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Добавляем тестовые данные если пусто
    if (appState.transactions.length === 0) {
        addTransaction('income', 50000, 'salary', 'Зарплата', new Date().toISOString());
        addTransaction('expense', 350, 'food', 'Обед', new Date().toISOString());
        addTransaction('expense', 1200, 'transport', 'Такси', new Date().toISOString());
    }
});