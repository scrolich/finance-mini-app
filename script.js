let tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.text = "Закрыть";
tg.MainButton.onClick(() => tg.close());

// Состояние приложения - обновленная версия
let appState = {
    accounts: [
        {
            id: 'main',
            name: '💰 Основной счет',
            type: 'debit', // debit, credit, savings, cash
            balance: 0,
            currency: 'RUB',
            icon: '💳',
            color: '#40A7E3'
        }
    ],
    transactions: [],
    budget: 0,
    activeAccount: 'main'
};

// Переменные для графиков
let categoriesChart = null;
let dailyChart = null;
let balanceChart = null;
let currentChart = 'categories';

// Переменные для валют
let currentCurrency = 'RUB';
const exchangeRates = {
    'RUB': 1,
    'USD': 0.011,
    'EUR': 0.010
};

// Текущий тип транзакции
let currentType = 'income';

// Загружаем сохраненные данные
function loadData() {
    try {
        const saved = localStorage.getItem('financeData');
        if (saved) {
            appState = JSON.parse(saved);
            console.log('Загружены данные:', appState);
        } else {
            appState = {
                balance: 0,
                transactions: [],
                budget: 0
            };
            console.log('Новый пользователь, пустой баланс');
        }
        updateUI();
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        appState = {
            balance: 0,
            transactions: [],
            budget: 0
        };
        updateUI();
    }
}

// Сохраняем данные
function saveData() {
    try {
        localStorage.setItem('financeData', JSON.stringify(appState));
        tg.sendData(JSON.stringify({
            type: 'sync',
            balance: appState.balance,
            transactions: appState.transactions.slice(-10)
        }));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

// Форматирование денег
function formatMoney(amount) {
    let value = amount * exchangeRates[currentCurrency];

    if (currentCurrency === 'RUB') {
        return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') + ' ₽';
    } else if (currentCurrency === 'USD') {
        return '$' + value.toFixed(2);
    } else {
        return '€' + value.toFixed(2);
    }
}

// Установка валюты
function setCurrency(currency) {
    currentCurrency = currency;

    // Обновляем активную кнопку
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.remove('active-currency');
    });
    document.getElementById(`currency-${currency.toLowerCase()}`).classList.add('active-currency');

    updateUI();
}

// Получение названия категории
function getCategoryName(category) {
    const categories = {
        'salary': '💼 Зарплата',
        'gifts': '🎁 Подарки',
        'investments': '📈 Инвестиции',
        'freelance': '💻 Фриланс',
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
        'initial': '💰 Начальный баланс',
        'other': '💰 Другое',
        'other_expense': '💰 Другое'
    };
    return categories[category] || category;
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

    // Графики
    updateCharts();
}

// Обновление бюджета
function updateBudgetUI() {
    if (appState.budget > 0) {
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
        document.getElementById('spentAmount').textContent = formatMoney(0);
        document.getElementById('budgetAmount').textContent = formatMoney(0);
    }
}

// ==================== ГРАФИКИ ====================

// Показать выбранный график
function showChart(type) {
    currentChart = type;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');

    document.getElementById('chart-categories').style.display = type === 'categories' ? 'block' : 'none';
    document.getElementById('chart-daily').style.display = type === 'daily' ? 'block' : 'none';
    document.getElementById('chart-balance').style.display = type === 'balance' ? 'block' : 'none';

    updateCharts();
}

// Обновить все графики
function updateCharts() {
    updateCategoriesChart();
    updateDailyChart();
    updateBalanceChart();
    updateTotals();
}

// График по категориям
function updateCategoriesChart() {
    const ctx = document.getElementById('categoriesChart').getContext('2d');

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expensesByCategory = {};

    appState.transactions.forEach(t => {
        if (t.type === 'expense') {
            const tDate = new Date(t.date);
            if (tDate >= monthAgo) {
                const catName = getCategoryName(t.category);
                expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
            }
        }
    });

    if (Object.keys(expensesByCategory).length === 0) {
        expensesByCategory['Нет данных'] = 1;
    }

    if (categoriesChart) {
        categoriesChart.destroy();
    }

    categoriesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#FF6384', '#C9CBCF', '#7BC8A4', '#E7B9FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                }
            }
        }
    });
}

// График по дням
function updateDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        let dayIncome = 0;
        let dayExpense = 0;

        appState.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.toDateString() === date.toDateString()) {
                if (t.type === 'income') {
                    dayIncome += t.amount;
                } else {
                    dayExpense += t.amount;
                }
            }
        });

        incomeData.push(dayIncome);
        expenseData.push(dayExpense);
    }

    if (dailyChart) {
        dailyChart.destroy();
    }

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    backgroundColor: '#4CAF50',
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    backgroundColor: '#F44336',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                }
            },
            scales: {
                y: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                },
                x: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                }
            }
        }
    });
}

// График баланса
function updateBalanceChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');

    const labels = [];
    const balanceData = [];

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        let runningBalance = 0;

        appState.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate <= date) {
                if (t.type === 'income') {
                    runningBalance += t.amount;
                } else {
                    runningBalance -= t.amount;
                }
            }
        });

        balanceData.push(runningBalance);
    }

    if (balanceChart) {
        balanceChart.destroy();
    }

    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Баланс',
                data: balanceData,
                borderColor: '#40A7E3',
                backgroundColor: 'rgba(64, 167, 227, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                },
                x: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() }
                }
            }
        }
    });
}

// Общая статистика
function updateTotals() {
    let totalIncome = 0;
    let totalExpense = 0;

    appState.transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    });

    document.getElementById('totalIncome').textContent = formatMoney(totalIncome);
    document.getElementById('totalExpense').textContent = formatMoney(totalExpense);

    const diff = totalIncome - totalExpense;
    const diffElement = document.getElementById('totalDiff');
    diffElement.textContent = formatMoney(diff);
    diffElement.className = diff >= 0 ? 'income' : 'expense';
}

// ==================== ФОРМЫ ====================

// Показ формы транзакции
function showForm(type) {
    currentType = type;

    document.getElementById('formTitle').textContent =
        type === 'income' ? '💰 Добавить доход' : '💸 Добавить расход';

    document.getElementById('incomeCategories').style.display =
        type === 'income' ? 'block' : 'none';
    document.getElementById('expenseCategories').style.display =
        type === 'expense' ? 'block' : 'none';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;

    document.getElementById('app').style.display = 'none';
    document.getElementById('transactionForm').style.display = 'block';
}

// Скрытие формы
function hideForm() {
    document.getElementById('transactionForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';

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

    const transaction = {
        id: Date.now(),
        type: currentType,
        amount: amount,
        category: category,
        description: description,
        date: date || new Date().toISOString()
    };

    appState.transactions.push(transaction);

    if (currentType === 'income') {
        appState.balance += amount;
    } else {
        appState.balance -= amount;
    }

    updateUI();
    saveData();
    hideForm();
}

// Показ формы баланса
function showBalanceForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('balanceForm').style.display = 'block';
    document.getElementById('initialBalance').value = appState.balance || 0;
}

// Скрытие формы баланса
function hideBalanceForm() {
    document.getElementById('balanceForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Установка начального баланса
function setInitialBalance() {
    const balance = parseFloat(document.getElementById('initialBalance').value);

    if (isNaN(balance) || balance < 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    appState.balance = balance;

    if (balance > 0) {
        appState.transactions.push({
            id: Date.now(),
            type: 'income',
            amount: balance,
            category: 'initial',
            description: 'Начальный баланс',
            date: new Date().toISOString()
        });
    }

    updateUI();
    saveData();
    hideBalanceForm();

    tg.showAlert(`✅ Баланс установлен: ${formatMoney(balance)}`);
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
    updateUI();
    saveData();
    hideBudgetForm();

    tg.showAlert(`✅ Бюджет установлен: ${formatMoney(budget)}`);
}

// Сброс всех данных
function resetAllData() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        appState = {
            balance: 0,
            transactions: [],
            budget: 0
        };
        localStorage.removeItem('financeData');
        updateUI();
        tg.showAlert('✅ Все данные сброшены');
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// Типы счетов
const ACCOUNT_TYPES = {
    debit: { name: 'Дебетовая карта', icon: '💳', color: '#40A7E3' },
    credit: { name: 'Кредитная карта', icon: '💳', color: '#F44336' },
    savings: { name: 'Накопительный', icon: '🏦', color: '#4CAF50' },
    cash: { name: 'Наличные', icon: '💰', color: '#FF9800' },
    investment: { name: 'Инвестиции', icon: '📈', color: '#9C27B0' }
};

// Инициализация счетов
function initializeAccounts() {
    if (!appState.accounts || appState.accounts.length === 0) {
        appState.accounts = [
            {
                id: 'main',
                name: '💰 Основной счет',
                type: 'debit',
                balance: 0,
                currency: 'RUB',
                icon: '💳',
                color: '#40A7E3'
            }
        ];
    }
    updateAccountSelector();
    updateAccountsSummary();
}

// Обновление селектора счетов
function updateAccountSelector() {
    const select = document.getElementById('accountSelect');
    if (!select) return;

    select.innerHTML = appState.accounts.map(account => `
        <option value="${account.id}" ${account.id === appState.activeAccount ? 'selected' : ''}>
            ${account.icon} ${account.name} (${formatMoney(account.balance)})
        </option>
    `).join('');
}

// Переключение между счетами
function switchAccount() {
    const select = document.getElementById('accountSelect');
    appState.activeAccount = select.value;

    // Обновляем баланс для активного счета
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (activeAccount) {
        document.getElementById('balance').textContent = formatMoney(activeAccount.balance);
    }

    updateAccountsSummary();
    filterTransactionsByAccount();
}

// Обновление сводки по всем счетам
function updateAccountsSummary() {
    const summary = document.getElementById('accountsSummary');
    if (!summary) return;

    summary.innerHTML = appState.accounts.map(account => {
        const isActive = account.id === appState.activeAccount;
        const balanceClass = account.balance >= 0 ? 'positive' : 'negative';

        return `
            <div class="account-item ${isActive ? 'active' : ''} account-${account.type}"
                 onclick="setActiveAccount('${account.id}')">
                <div class="account-icon">${account.icon || ACCOUNT_TYPES[account.type]?.icon || '💳'}</div>
                <div class="account-info">
                    <div class="account-name">${account.name}</div>
                    <div class="account-type">${ACCOUNT_TYPES[account.type]?.name || account.type}</div>
                </div>
                <div class="account-balance ${balanceClass}">
                    ${formatMoney(account.balance)}
                </div>
                <div class="account-actions">
                    <button onclick="editAccount('${account.id}'); event.stopPropagation();">✏️</button>
                    ${appState.accounts.length > 1 ?
                        `<button onclick="deleteAccount('${account.id}'); event.stopPropagation();">🗑️</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Обновляем статистику активного счета
    updateAccountStats();
}

// Установка активного счета
function setActiveAccount(accountId) {
    appState.activeAccount = accountId;
    updateAccountSelector();
    updateAccountsSummary();

    const activeAccount = appState.accounts.find(a => a.id === accountId);
    if (activeAccount) {
        document.getElementById('balance').textContent = formatMoney(activeAccount.balance);
    }

    filterTransactionsByAccount();
    saveData();
}

// Фильтрация транзакций по счету
function filterTransactionsByAccount() {
    // Обновляем историю только для активного счета
    const accountTransactions = appState.transactions.filter(t => t.accountId === appState.activeAccount);
    updateHistory(accountTransactions);
}

// Обновление истории с фильтром
function updateHistory(transactions) {
    const historyEl = document.getElementById('history');
    if (!historyEl) return;

    historyEl.innerHTML = '';

    transactions.slice(-10).reverse().forEach(t => {
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
}

// Обновление статистики счета
function updateAccountStats() {
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (!activeAccount) return;

    const stats = document.getElementById('accountStats');
    if (!stats) return;

    // Считаем доходы и расходы за месяц
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let monthIncome = 0;
    let monthExpense = 0;

    appState.transactions.forEach(t => {
        if (t.accountId === appState.activeAccount) {
            const tDate = new Date(t.date);
            if (tDate >= monthStart) {
                if (t.type === 'income') {
                    monthIncome += t.amount;
                } else {
                    monthExpense += t.amount;
                }
            }
        }
    });

    stats.innerHTML = `
        <div class="stat-block">
            <div class="stat-label">Доход за месяц</div>
            <div class="stat-value income">${formatMoney(monthIncome)}</div>
        </div>
        <div class="stat-block">
            <div class="stat-label">Расход за месяц</div>
            <div class="stat-value expense">${formatMoney(monthExpense)}</div>
        </div>
        <div class="stat-block">
            <div class="stat-label">Доступно</div>
            <div class="stat-value">${formatMoney(activeAccount.balance)}</div>
        </div>
    `;
}

// Показ формы добавления счета
function showAccountForm() {
    const form = document.getElementById('accountForm');
    if (!form) return;

    document.getElementById('app').style.display = 'none';
    form.style.display = 'block';

    // Сброс формы
    document.getElementById('accountName').value = '';
    document.getElementById('accountType').value = 'debit';
    document.getElementById('accountBalance').value = '';
}

// Скрытие формы счета
function hideAccountForm() {
    document.getElementById('accountForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Сохранение нового счета
function saveAccount() {
    const name = document.getElementById('accountName').value;
    const type = document.getElementById('accountType').value;
    const balance = parseFloat(document.getElementById('accountBalance').value) || 0;

    if (!name) {
        tg.showAlert('Введите название счета');
        return;
    }

    const newAccount = {
        id: 'acc_' + Date.now(),
        name: name,
        type: type,
        balance: balance,
        currency: 'RUB',
        icon: ACCOUNT_TYPES[type]?.icon || '💳',
        color: ACCOUNT_TYPES[type]?.color || '#40A7E3'
    };

    appState.accounts.push(newAccount);

    // Если есть начальный баланс, создаем транзакцию
    if (balance > 0) {
        appState.transactions.push({
            id: Date.now(),
            accountId: newAccount.id,
            type: 'income',
            amount: balance,
            category: 'initial',
            description: `Начальный баланс: ${name}`,
            date: new Date().toISOString()
        });
    }

    updateAccountSelector();
    updateAccountsSummary();
    saveData();
    hideAccountForm();

    tg.showAlert(`✅ Счет "${name}" создан`);
}

// Редактирование счета
function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) return;

    // Здесь можно добавить форму редактирования
    const newName = prompt('Новое название счета:', account.name);
    if (newName) {
        account.name = newName;
        updateAccountSelector();
        updateAccountsSummary();
        saveData();
    }
}

// Удаление счета
function deleteAccount(accountId) {
    if (appState.accounts.length <= 1) {
        tg.showAlert('Нельзя удалить последний счет');
        return;
    }

    if (confirm('Удалить счет? Все транзакции также будут удалены.')) {
        // Удаляем транзакции счета
        appState.transactions = appState.transactions.filter(t => t.accountId !== accountId);

        // Удаляем счет
        appState.accounts = appState.accounts.filter(a => a.id !== accountId);

        // Если удалили активный счет, переключаем на первый
        if (appState.activeAccount === accountId) {
            appState.activeAccount = appState.accounts[0].id;
        }

        updateAccountSelector();
        updateAccountsSummary();
        setActiveAccount(appState.activeAccount);
        saveData();
    }
}

// Показ формы перевода
function showTransferForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('transferForm').style.display = 'block';

    // Заполняем селекторы счетов
    const fromSelect = document.getElementById('transferFrom');
    const toSelect = document.getElementById('transferTo');

    fromSelect.innerHTML = appState.accounts.map(a =>
        `<option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance)})</option>`
    ).join('');

    toSelect.innerHTML = appState.accounts.map(a =>
        `<option value="${a.id}">${a.icon} ${a.name}</option>`
    ).join('');
}

// Скрытие формы перевода
function hideTransferForm() {
    document.getElementById('transferForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Выполнение перевода
function transferMoney() {
    const fromId = document.getElementById('transferFrom').value;
    const toId = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);

    if (fromId === toId) {
        tg.showAlert('Нельзя перевести на тот же счет');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const fromAccount = appState.accounts.find(a => a.id === fromId);

    if (fromAccount.balance < amount) {
        tg.showAlert('Недостаточно средств');
        return;
    }

    // Выполняем перевод
    fromAccount.balance -= amount;
    const toAccount = appState.accounts.find(a => a.id === toId);
    toAccount.balance += amount;

    // Создаем транзакции
    const now = new Date().toISOString();

    appState.transactions.push({
        id: Date.now(),
        accountId: fromId,
        type: 'expense',
        amount: amount,
        category: 'transfer',
        description: `Перевод на "${toAccount.name}"`,
        date: now
    });

    appState.transactions.push({
        id: Date.now() + 1,
        accountId: toId,
        type: 'income',
        amount: amount,
        category: 'transfer',
        description: `Перевод с "${fromAccount.name}"`,
        date: now
    });

    updateAccountSelector();
    updateAccountsSummary();
    setActiveAccount(appState.activeAccount);
    saveData();
    hideTransferForm();

    tg.showAlert(`✅ Перевод выполнен: ${formatMoney(amount)}`);
}

// Обновляем функцию сохранения транзакции
function saveTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('transactionDate').value;

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const transaction = {
        id: Date.now(),
        accountId: appState.activeAccount,
        type: currentType,
        amount: amount,
        category: category,
        description: description,
        date: date || new Date().toISOString()
    };

    appState.transactions.push(transaction);

    // Обновляем баланс счета
    const account = appState.accounts.find(a => a.id === appState.activeAccount);
    if (currentType === 'income') {
        account.balance += amount;
    } else {
        account.balance -= amount;
    }

    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();
    hideForm();
}

// Обновляем функцию установки начального баланса
function setInitialBalance() {
    const balance = parseFloat(document.getElementById('initialBalance').value);

    if (isNaN(balance) || balance < 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const account = appState.accounts.find(a => a.id === appState.activeAccount);
    const oldBalance = account.balance;
    account.balance = balance;

    if (balance > oldBalance) {
        appState.transactions.push({
            id: Date.now(),
            accountId: appState.activeAccount,
            type: 'income',
            amount: balance - oldBalance,
            category: 'initial',
            description: 'Пополнение счета',
            date: new Date().toISOString()
        });
    }

    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();
    hideBalanceForm();
}

// Обновляем функцию загрузки данных
function loadData() {
    try {
        const saved = localStorage.getItem('financeData');
        if (saved) {
            appState = JSON.parse(saved);
            initializeAccounts();
        } else {
            appState = {
                accounts: [],
                transactions: [],
                budget: 0,
                activeAccount: null
            };
            initializeAccounts();
        }
        console.log('Загружены данные:', appState);
        updateUI();
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        initializeAccounts();
        updateUI();
    }
}