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
    activeAccount: 'main',
    plans: []
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

// Сохраняем данные и отправляем боту
function saveData() {
    try {
        localStorage.setItem('financeData', JSON.stringify(appState));

        // Отправляем данные боту для синхронизации
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify({
                type: 'sync',
                data: appState,
                userId: tg.initDataUnsafe?.user?.id || 'unknown'
            }));
            console.log('📤 Данные отправлены боту');
        }
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
// Сохранение транзакции - ИСПРАВЛЕННАЯ ВЕРСИЯ
function saveTransaction() {
    console.log('saveTransaction вызвана');

    // Получаем элементы формы
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('transactionDate');

    if (!amountInput || !categorySelect) {
        console.error('Элементы формы не найдены');
        tg.showAlert('Ошибка: форма не загружена');
        return;
    }

    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const description = descriptionInput ? descriptionInput.value : '';
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    console.log('Сумма:', amount, 'Категория:', category);

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (!activeAccount) {
        tg.showAlert('Ошибка: выберите счет');
        return;
    }

    // Для расхода проверяем достаточно ли средств
    if (currentType === 'expense' && activeAccount.balance < amount) {
        tg.showAlert(`❌ Недостаточно средств на счете "${activeAccount.name}"`);
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
    if (currentType === 'income') {
        activeAccount.balance += amount;
    } else {
        activeAccount.balance -= amount;
    }

    // Обновляем интерфейс
    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();

    // Скрываем форму
    hideForm();

    // Показываем сообщение
    tg.showAlert(`✅ ${currentType === 'income' ? 'Доход' : 'Расход'} добавлен: ${formatMoney(amount)}`);

    console.log('Транзакция сохранена');
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

// Установка начального баланса (пополнение) - ИСПРАВЛЕННАЯ ВЕРСИЯ
function setInitialBalance() {
    console.log('setInitialBalance вызвана');

    const balanceInput = document.getElementById('initialBalance');
    if (!balanceInput) {
        console.error('Поле initialBalance не найдено');
        return;
    }

    const balance = parseFloat(balanceInput.value);

    if (isNaN(balance) || balance < 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const account = appState.accounts.find(a => a.id === appState.activeAccount);
    if (!account) {
        tg.showAlert('Ошибка: выберите счет');
        return;
    }

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

    tg.showAlert(`✅ Счет пополнен: ${formatMoney(balance)}`);
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
// ==================== ПЛАНЫ РАСХОДОВ ====================

// Показ формы добавления плана
function showPlanForm() {
    document.getElementById('app').style.display = 'none';

    // Создаем форму динамически, если её нет
    let form = document.getElementById('planForm');
    if (!form) {
        form = createPlanForm();
    }

    form.style.display = 'block';

    // Устанавливаем дату по умолчанию (завтра)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('planDate').value = tomorrow.toISOString().split('T')[0];
}

// Создание формы плана
function createPlanForm() {
    const form = document.createElement('div');
    form.id = 'planForm';
    form.className = 'form-modal';
    form.innerHTML = `
        <div class="form-header">
            <h2>📋 Новый план расходов</h2>
            <button class="close-btn" onclick="hidePlanForm()">✖</button>
        </div>

        <div class="form-body">
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="planName" placeholder="Например: Продукты на неделю">
            </div>

            <div class="form-group">
                <label>Сумма (₽)</label>
                <input type="number" id="planAmount" placeholder="5000" step="0.01">
            </div>

            <div class="form-group">
                <label>Категория</label>
                <select id="planCategory">
                    <option value="food">🍔 Еда</option>
                    <option value="housing">🏠 Жилье</option>
                    <option value="transport">🚗 Транспорт</option>
                    <option value="clothes">👕 Одежда</option>
                    <option value="health">💊 Здоровье</option>
                    <option value="entertainment">🎮 Развлечения</option>
                    <option value="education">📚 Образование</option>
                    <option value="pets">🐶 Животные</option>
                    <option value="communication">📱 Связь</option>
                    <option value="gifts_expense">🎁 Подарки</option>
                    <option value="other_expense">💰 Другое</option>
                </select>
            </div>

            <div class="form-group">
                <label>Дата</label>
                <input type="date" id="planDate">
            </div>

            <div class="form-group">
                <label>Повторение</label>
                <select id="planRecurring">
                    <option value="false">Одноразово</option>
                    <option value="weekly">Каждую неделю</option>
                    <option value="monthly">Каждый месяц</option>
                </select>
            </div>

            <div class="form-group">
                <label>Счет списания</label>
                <select id="planAccount">
                    ${appState.accounts.map(a =>
                        `<option value="${a.id}">${a.icon} ${a.name}</option>`
                    ).join('')}
                </select>
            </div>
        </div>

        <div class="form-footer">
            <button class="btn btn-primary" onclick="savePlan()">✅ Сохранить план</button>
            <button class="btn btn-secondary" onclick="hidePlanForm()">❌ Отмена</button>
        </div>
    `;

    document.body.appendChild(form);
    return form;
}

// Скрытие формы плана
function hidePlanForm() {
    document.getElementById('planForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Сохранение плана
function savePlan() {
    const name = document.getElementById('planName').value;
    const amount = parseFloat(document.getElementById('planAmount').value);
    const category = document.getElementById('planCategory').value;
    const date = document.getElementById('planDate').value;
    const recurring = document.getElementById('planRecurring').value;
    const accountId = document.getElementById('planAccount').value;

    if (!name) {
        tg.showAlert('Введите название плана');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const plan = {
        id: 'plan_' + Date.now(),
        name: name,
        amount: amount,
        category: category,
        date: date,
        completed: false,
        recurring: recurring === 'false' ? false : recurring,
        accountId: accountId,
        createdAt: new Date().toISOString()
    };

    if (!appState.plans) {
        appState.plans = [];
    }

    appState.plans.push(plan);
    updatePlans();
    saveData();
    hidePlanForm();

    tg.showAlert(`✅ План "${name}" добавлен`);
}

// Обновление отображения планов
function updatePlans() {
    if (!appState.plans) {
        appState.plans = [];
    }

    const plansList = document.getElementById('plansList');
    if (!plansList) return;

    // Сортируем планы: сначала невыполненные, потом по дате
    const sortedPlans = [...appState.plans].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return new Date(a.date) - new Date(b.date);
    });

    plansList.innerHTML = sortedPlans.map(plan => {
        const account = appState.accounts.find(a => a.id === plan.accountId);
        const isOverdue = !plan.completed && new Date(plan.date) < new Date();
        const dateStr = new Date(plan.date).toLocaleDateString('ru-RU');

        return `
            <div class="plan-item ${plan.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <input type="checkbox" class="plan-checkbox"
                       ${plan.completed ? 'checked' : ''}
                       onchange="togglePlanComplete('${plan.id}', this.checked)">

                <div class="plan-info">
                    <div class="plan-name">
                        ${plan.name}
                        ${plan.recurring ? `<span class="plan-recurring">${plan.recurring === 'weekly' ? 'Каждую неделю' : 'Каждый месяц'}</span>` : ''}
                    </div>
                    <div class="plan-details">
                        <span class="plan-amount">${formatMoney(plan.amount)}</span>
                        <span class="plan-category">${getCategoryName(plan.category)}</span>
                        <span class="plan-date ${isOverdue ? 'overdue' : ''}">
                            📅 ${dateStr} ${isOverdue ? '(просрочено)' : ''}
                        </span>
                        ${account ? `<span>${account.icon} ${account.name}</span>` : ''}
                    </div>
                </div>

                <div class="plan-actions">
                    <button onclick="editPlan('${plan.id}')">✏️</button>
                    <button onclick="deletePlan('${plan.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    updatePlansSummary();
}

// Переключение статуса плана (выполнено/не выполнено)
function togglePlanComplete(planId, completed) {
    const plan = appState.plans.find(p => p.id === planId);
    if (!plan) return;

    if (completed && !plan.completed) {
        // Если отмечаем как выполненное - создаем расход
        const account = appState.accounts.find(a => a.id === plan.accountId);
        if (account) {
            if (account.balance < plan.amount) {
                tg.showAlert(`⚠️ Недостаточно средств на счете "${account.name}"`);
                // Возвращаем чекбокс в исходное состояние
                document.querySelector(`input[onchange*="${planId}"]`).checked = false;
                return;
            }

            // Создаем транзакцию расхода
            const transaction = {
                id: Date.now(),
                accountId: plan.accountId,
                type: 'expense',
                amount: plan.amount,
                category: plan.category,
                description: `📋 План: ${plan.name}`,
                date: new Date().toISOString()
            };

            appState.transactions.push(transaction);

            // Обновляем баланс счета
            account.balance -= plan.amount;

            // Если план повторяющийся, создаем новый на следующую дату
            if (plan.recurring) {
                createRecurringPlan(plan);
            }

            tg.showAlert(`✅ Расход добавлен: ${formatMoney(plan.amount)}`);
        }
    }

    plan.completed = completed;
    updatePlans();
    updateAccountsSummary();
    updateUI();
    saveData();
}

// Создание повторяющегося плана
function createRecurringPlan(plan) {
    const nextDate = new Date(plan.date);

    if (plan.recurring === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
    } else if (plan.recurring === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const newPlan = {
        ...plan,
        id: 'plan_' + Date.now() + '_recurring',
        date: nextDate.toISOString().split('T')[0],
        completed: false,
        createdAt: new Date().toISOString()
    };

    appState.plans.push(newPlan);
}

// Обновление сводки по планам
function updatePlansSummary() {
    if (!appState.plans) return;

    let totalPlanned = 0;
    let totalCompleted = 0;

    appState.plans.forEach(plan => {
        if (!plan.completed) {
            totalPlanned += plan.amount;
        } else {
            totalCompleted += plan.amount;
        }
    });

    document.getElementById('totalPlanned').textContent = formatMoney(totalPlanned);
    document.getElementById('totalCompleted').textContent = formatMoney(totalCompleted);
    document.getElementById('totalRemaining').textContent = formatMoney(totalPlanned);
}

// Редактирование плана
function editPlan(planId) {
    const plan = appState.plans.find(p => p.id === planId);
    if (!plan) return;

    // Простое редактирование через prompt
    const newName = prompt('Название плана:', plan.name);
    if (newName) {
        plan.name = newName;
        updatePlans();
        saveData();
    }
}

// Удаление плана
function deletePlan(planId) {
    if (confirm('Удалить этот план?')) {
        appState.plans = appState.plans.filter(p => p.id !== planId);
        updatePlans();
        saveData();
    }
}

// Обновляем функцию загрузки данных
function loadData() {
    try {
        const saved = localStorage.getItem('financeData');
        if (saved) {
            appState = JSON.parse(saved);
            // Инициализируем plans если их нет
            if (!appState.plans) {
                appState.plans = [];
            }
            initializeAccounts();
        } else {
            appState = {
                accounts: [],
                transactions: [],
                budget: 0,
                activeAccount: null,
                plans: []
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

// Обновляем функцию updateUI
function updateUI() {
    // Баланс
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (activeAccount) {
        document.getElementById('balance').textContent = formatMoney(activeAccount.balance);
    }

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

    // История для активного счета
    const accountTransactions = appState.transactions.filter(t => t.accountId === appState.activeAccount);
    updateHistory(accountTransactions);

    // Бюджет
    updateBudgetUI();

    // Графики
    updateCharts();

    // Планы
    updatePlans();
}
// Получение данных от бота при запуске
window.addEventListener('load', function() {
    // Если есть данные от бота (при первом запуске)
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
        console.log('Telegram WebApp инициализирован');

        // Запрашиваем данные у бота
        tg.sendData(JSON.stringify({
            type: 'getData',
            userId: tg.initDataUnsafe?.user?.id
        }));
    }
});
// Обработка данных от бота
window.addEventListener('message', function(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync' && data.data) {
            console.log('📥 Получены данные от бота');

            // Обновляем локальные данные
            appState = data.data;

            // Инициализируем
            if (!appState.plans) appState.plans = [];
            initializeAccounts();
            updateUI();

            // Сохраняем локально
            localStorage.setItem('financeData', JSON.stringify(appState));

            tg.showAlert('✅ Данные синхронизированы');
        }
    } catch (e) {
        console.error('Ошибка обработки сообщения:', e);
    }
});