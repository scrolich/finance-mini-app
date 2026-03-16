let tg = Telegram.WebApp;
tg.expand();

let appState = {
    accounts: [
        {
            id: 'main',
            name: '💰 Основной счет',
            type: 'debit',
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
    customCategories: {  // ← ДОБАВЬ ЭТО
        income: [],
        expense: []
    }
};

let categoriesChart = null;
let dailyChart = null;
let balanceChart = null;
let currentChart = 'categories';
let currentCurrency = 'RUB';
let currentType = 'income';
let currentPeriod = 'month';
let customStartDate = null;
let customEndDate = null;

const exchangeRates = {
    'RUB': 1,
    'USD': 0.011,
    'EUR': 0.010
};

const ACCOUNT_TYPES = {
    debit: { name: 'Дебетовая карта', icon: '💳', color: '#40A7E3' },
    credit: { name: 'Кредитная карта', icon: '💳', color: '#F44336' },
    savings: { name: 'Накопительный', icon: '🏦', color: '#4CAF50' },
    cash: { name: 'Наличные', icon: '💰', color: '#FF9800' },
    investment: { name: 'Инвестиции', icon: '📈', color: '#9C27B0' }
};

function formatMoney(amount) {
    let value = amount * exchangeRates[currentCurrency];
    if (currentCurrency === 'RUB') return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
    if (currentCurrency === 'USD') return '$' + value.toFixed(2);
    return '€' + value.toFixed(2);
}

// Установка периода
function setPeriod(period) {
    currentPeriod = period;

    // Обновляем кнопки
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`period-${period}`).classList.add('active');

    // Показываем/скрываем свой период
    document.getElementById('customPeriod').style.display = period === 'custom' ? 'block' : 'none';

    // Обновляем статистику
    updateStatsByPeriod();
}

// Применить свой период
function applyCustomPeriod() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!start || !end) {
        tg.showAlert('Выберите даты');
        return;
    }

    customStartDate = new Date(start);
    customEndDate = new Date(end);
    customEndDate.setHours(23, 59, 59);

    updateStatsByPeriod();
}

// Получить даты для периода
function getPeriodDates() {
    const now = new Date();
    let startDate, endDate;

    switch(currentPeriod) {
        case 'day':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
            break;

        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() + 1);
            startDate.setHours(0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
            break;

        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
            break;

        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
            break;

        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
            break;

        case 'custom':
            startDate = customStartDate;
            endDate = customEndDate;
            break;
    }

    return { startDate, endDate };
}

// Обновить статистику по выбранному периоду
function updateStatsByPeriod() {
    const { startDate, endDate } = getPeriodDates();

    if (!startDate || !endDate) return;

    // Фильтруем транзакции по дате
    const filteredTransactions = appState.transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
    });

    // Считаем доходы и расходы за период
    let periodIncome = 0;
    let periodExpense = 0;

    filteredTransactions.forEach(t => {
        if (t.type === 'income') {
            periodIncome += t.amount;
        } else {
            periodExpense += t.amount;
        }
    });

    // Обновляем UI для статистики за период
    document.getElementById('todayIncome').textContent = formatMoney(periodIncome);
    document.getElementById('todayExpense').textContent = formatMoney(periodExpense);

    // Обновляем историю за период
    updateHistory(filteredTransactions);

    // Обновляем графики за период
    updateChartsWithFilter(filteredTransactions);
}

// Обновить функцию updateUI
function updateUI() {
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (activeAccount) document.getElementById('balance').textContent = formatMoney(activeAccount.balance);

    // Обновляем статистику по выбранному периоду вместо сегодня
    updateStatsByPeriod();

    updateBudgetUI();
    updateCharts();
    updatePlans();
}

// Новая функция для обновления графиков с фильтром
function updateChartsWithFilter(transactions) {
    updateCategoriesChartWithFilter(transactions);
    updateDailyChartWithFilter(transactions);
    updateBalanceChartWithFilter(transactions);
    updateTotalsWithFilter(transactions);
}

// Обновляем функции графиков с фильтром
function updateCategoriesChartWithFilter(transactions) {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    const expensesByCategory = {};

    transactions.forEach(t => {
        if (t.type === 'expense') {
            const catName = getCategoryName(t.category);
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
        }
    });

    if (Object.keys(expensesByCategory).length === 0) expensesByCategory['Нет данных'] = 1;
    if (categoriesChart) categoriesChart.destroy();

    categoriesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateDailyChartWithFilter(transactions) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    const { startDate, endDate } = getPeriodDates();

    if (!startDate || !endDate) return;

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    // Группируем по дням в выбранном периоде
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        let dayIncome = 0;
        let dayExpense = 0;

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.toDateString() === currentDate.toDateString()) {
                if (t.type === 'income') dayIncome += t.amount;
                else dayExpense += t.amount;
            }
        });

        incomeData.push(dayIncome);
        expenseData.push(dayExpense);

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (dailyChart) dailyChart.destroy();

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Доходы', data: incomeData, backgroundColor: '#4CAF50' },
                { label: 'Расходы', data: expenseData, backgroundColor: '#F44336' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateBalanceChartWithFilter(transactions) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const { startDate, endDate } = getPeriodDates();

    if (!startDate || !endDate) return;

    const labels = [];
    const balanceData = [];

    let runningBalance = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.toDateString() === currentDate.toDateString()) {
                if (t.type === 'income') runningBalance += t.amount;
                else runningBalance -= t.amount;
            }
        });

        balanceData.push(runningBalance);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (balanceChart) balanceChart.destroy();

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
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateTotalsWithFilter(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    document.getElementById('totalIncome').textContent = formatMoney(totalIncome);
    document.getElementById('totalExpense').textContent = formatMoney(totalExpense);

    const diff = totalIncome - totalExpense;
    document.getElementById('totalDiff').textContent = formatMoney(diff);
    document.getElementById('totalDiff').className = diff >= 0 ? 'income' : 'expense';
}

function getCategoryName(category) {
    const categories = {
        'salary': '💼 Зарплата', 'gifts': '🎁 Подарки', 'investments': '📈 Инвестиции',
        'freelance': '💻 Фриланс', 'food': '🍔 Еда', 'housing': '🏠 Жилье',
        'transport': '🚗 Транспорт', 'clothes': '👕 Одежда', 'health': '💊 Здоровье',
        'entertainment': '🎮 Развлечения', 'education': '📚 Образование', 'pets': '🐶 Животные',
        'communication': '📱 Связь', 'gifts_expense': '🎁 Подарки', 'work': '💼 Работа',
        'initial': '💰 Начальный баланс', 'other': '💰 Другое', 'other_expense': '💰 Другое'
    };
    return categories[category] || category;
}

function saveData() {
    localStorage.setItem('financeData', JSON.stringify(appState));
}

function loadData() {
    const saved = localStorage.getItem('financeData');
    if (saved) {
        appState = JSON.parse(saved);
        if (!appState.plans) appState.plans = [];
    }
    initializeAccounts();
    updateUI();

    // Проверяем, нужно ли показать модальное окно
    setTimeout(checkFirstLaunch, 500); // Небольшая задержка для красоты
}

function initializeAccounts() {
    if (!appState.accounts || appState.accounts.length === 0) {
        appState.accounts = [{
            id: 'main',
            name: '💰 Основной счет',
            type: 'debit',
            balance: 0,
            currency: 'RUB',
            icon: '💳',
            color: '#40A7E3'
        }];
        appState.activeAccount = 'main';
    }
    updateAccountSelector();
    updateAccountsSummary();
}

function updateAccountSelector() {
    const select = document.getElementById('accountSelect');
    if (!select) return;
    select.innerHTML = appState.accounts.map(a =>
        `<option value="${a.id}" ${a.id === appState.activeAccount ? 'selected' : ''}>${a.icon} ${a.name} (${formatMoney(a.balance)})</option>`
    ).join('');
}

function switchAccount() {
    const select = document.getElementById('accountSelect');
    appState.activeAccount = select.value;
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (activeAccount) document.getElementById('balance').textContent = formatMoney(activeAccount.balance);
    updateAccountsSummary();
    filterTransactionsByAccount();
}

function updateAccountsSummary() {
    const summary = document.getElementById('accountsSummary');
    if (!summary) return;
    summary.innerHTML = appState.accounts.map(account => {
        const isActive = account.id === appState.activeAccount;
        return `
            <div class="account-item ${isActive ? 'active' : ''} account-${account.type}" onclick="setActiveAccount('${account.id}')">
                <div class="account-icon">${account.icon || ACCOUNT_TYPES[account.type]?.icon || '💳'}</div>
                <div class="account-info">
                    <div class="account-name">${account.name}</div>
                    <div class="account-type">${ACCOUNT_TYPES[account.type]?.name || account.type}</div>
                </div>
                <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">${formatMoney(account.balance)}</div>
                <div class="account-actions">
                    <button onclick="editAccount('${account.id}'); event.stopPropagation();">✏️</button>
                    ${appState.accounts.length > 1 ? `<button onclick="deleteAccount('${account.id}'); event.stopPropagation();">🗑️</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
    updateAccountStats();
}

function setActiveAccount(accountId) {
    appState.activeAccount = accountId;
    updateAccountSelector();
    updateAccountsSummary();
    const activeAccount = appState.accounts.find(a => a.id === accountId);
    if (activeAccount) document.getElementById('balance').textContent = formatMoney(activeAccount.balance);
    filterTransactionsByAccount();
    saveData();
}

function filterTransactionsByAccount() {
    const accountTransactions = appState.transactions.filter(t => t.accountId === appState.activeAccount);
    updateHistory(accountTransactions);
}

function updateHistory(transactions) {
    const historyEl = document.getElementById('history');
    if (!historyEl) return;
    historyEl.innerHTML = '';
    transactions.slice(-10).reverse().forEach(t => {
        const date = new Date(t.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        historyEl.innerHTML += `
            <div class="history-item">
                <div class="history-left">
                    <span class="history-category">${getCategoryName(t.category)}</span>
                    <span class="history-desc">${t.description || '—'}</span>
                </div>
                <div class="history-right">
                    <div class="history-amount ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
                    <div class="history-date">${date}</div>
                </div>
            </div>
        `;
    });
}

function updateAccountStats() {
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (!activeAccount) return;
    const stats = document.getElementById('accountStats');
    if (!stats) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthIncome = 0, monthExpense = 0;
    appState.transactions.forEach(t => {
        if (t.accountId === appState.activeAccount) {
            const tDate = new Date(t.date);
            if (tDate >= monthStart) {
                if (t.type === 'income') monthIncome += t.amount;
                else monthExpense += t.amount;
            }
        }
    });
    stats.innerHTML = `
        <div class="stat-block"><div class="stat-label">Доход за месяц</div><div class="stat-value income">${formatMoney(monthIncome)}</div></div>
        <div class="stat-block"><div class="stat-label">Расход за месяц</div><div class="stat-value expense">${formatMoney(monthExpense)}</div></div>
        <div class="stat-block"><div class="stat-label">Доступно</div><div class="stat-value">${formatMoney(activeAccount.balance)}</div></div>
    `;
}

function updateUI() {
    const activeAccount = appState.accounts.find(a => a.id === appState.activeAccount);
    if (activeAccount) document.getElementById('balance').textContent = formatMoney(activeAccount.balance);

    const today = new Date().toDateString();
    let todayIncome = 0, todayExpense = 0;
    appState.transactions.forEach(t => {
        if (new Date(t.date).toDateString() === today) {
            if (t.type === 'income') todayIncome += t.amount;
            else todayExpense += t.amount;
        }
    });
    document.getElementById('todayIncome').textContent = formatMoney(todayIncome);
    document.getElementById('todayExpense').textContent = formatMoney(todayExpense);

    filterTransactionsByAccount();
    updateBudgetUI();
    updateCharts();
    updatePlans();
}

function updateBudgetUI() {
    if (appState.budget > 0) {
        const now = new Date();
        const monthExpenses = appState.transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'expense' && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }).reduce((sum, t) => sum + t.amount, 0);
        const percent = Math.min((monthExpenses / appState.budget) * 100, 100);
        document.getElementById('budgetBar').style.width = percent + '%';
        document.getElementById('spentAmount').textContent = formatMoney(monthExpenses);
        document.getElementById('budgetAmount').textContent = formatMoney(appState.budget);
    }
}

function showChart(type) {
    currentChart = type;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');
    document.getElementById('chart-categories').style.display = type === 'categories' ? 'block' : 'none';
    document.getElementById('chart-daily').style.display = type === 'daily' ? 'block' : 'none';
    document.getElementById('chart-balance').style.display = type === 'balance' ? 'block' : 'none';
    updateCharts();
}

function updateCharts() {
    updateCategoriesChart();
    updateDailyChart();
    updateBalanceChart();
    updateTotals();
}

function updateCategoriesChart() {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expensesByCategory = {};
    appState.transactions.forEach(t => {
        if (t.type === 'expense' && new Date(t.date) >= monthAgo) {
            const catName = getCategoryName(t.category);
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
        }
    });
    if (Object.keys(expensesByCategory).length === 0) expensesByCategory['Нет данных'] = 1;
    if (categoriesChart) categoriesChart.destroy();
    categoriesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    const labels = [], incomeData = [], expenseData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));
        let dayIncome = 0, dayExpense = 0;
        appState.transactions.forEach(t => {
            if (new Date(t.date).toDateString() === date.toDateString()) {
                if (t.type === 'income') dayIncome += t.amount;
                else dayExpense += t.amount;
            }
        });
        incomeData.push(dayIncome);
        expenseData.push(dayExpense);
    }
    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Доходы', data: incomeData, backgroundColor: '#4CAF50' },
                { label: 'Расходы', data: expenseData, backgroundColor: '#F44336' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateBalanceChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const labels = [], balanceData = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));
        let runningBalance = 0;
        appState.transactions.forEach(t => {
            if (new Date(t.date) <= date) {
                if (t.type === 'income') runningBalance += t.amount;
                else runningBalance -= t.amount;
            }
        });
        balanceData.push(runningBalance);
    }
    if (balanceChart) balanceChart.destroy();
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
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateTotals() {
    let totalIncome = 0, totalExpense = 0;
    appState.transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });
    document.getElementById('totalIncome').textContent = formatMoney(totalIncome);
    document.getElementById('totalExpense').textContent = formatMoney(totalExpense);
    const diff = totalIncome - totalExpense;
    document.getElementById('totalDiff').textContent = formatMoney(diff);
    document.getElementById('totalDiff').className = diff >= 0 ? 'income' : 'expense';
}

function setCurrency(currency) {
    currentCurrency = currency;
    document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('active-currency'));
    document.getElementById(`currency-${currency.toLowerCase()}`).classList.add('active-currency');
    updateUI();
    updateAccountsSummary();
}

function showForm(type) {
    currentType = type;
    document.getElementById('formTitle').textContent = type === 'income' ? '💰 Добавить доход' : '💸 Добавить расход';
    document.getElementById('incomeCategories').style.display = type === 'income' ? 'block' : 'none';
    document.getElementById('expenseCategories').style.display = type === 'expense' ? 'block' : 'none';
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('app').style.display = 'none';
    document.getElementById('transactionForm').style.display = 'block';
}

function hideForm() {
    document.getElementById('transactionForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
}

function saveTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('transactionDate').value;

    if (isNaN(amount) || amount <= 0) {
        tg.showAlert('Введите корректную сумму');
        return;
    }

    const account = appState.accounts.find(a => a.id === appState.activeAccount);
    if (currentType === 'expense' && account.balance < amount) {
        tg.showAlert(`❌ Недостаточно средств на счете "${account.name}"`);
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
    if (currentType === 'income') account.balance += amount;
    else account.balance -= amount;

    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();
    hideForm();
    tg.showAlert(`✅ ${currentType === 'income' ? 'Доход' : 'Расход'} добавлен: ${formatMoney(amount)}`);
}

function showBudgetForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('budgetForm').style.display = 'block';
    document.getElementById('budgetInput').value = appState.budget || '';
}

function hideBudgetForm() {
    document.getElementById('budgetForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

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

function showAccountForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('accountForm').style.display = 'block';
    document.getElementById('accountName').value = '';
    document.getElementById('accountType').value = 'debit';
    document.getElementById('accountBalance').value = '';
}

function hideAccountForm() {
    document.getElementById('accountForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

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

function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) return;
    const newName = prompt('Новое название счета:', account.name);
    if (newName) {
        account.name = newName;
        updateAccountSelector();
        updateAccountsSummary();
        saveData();
    }
}

function deleteAccount(accountId) {
    if (appState.accounts.length <= 1) {
        tg.showAlert('Нельзя удалить последний счет');
        return;
    }
    if (confirm('Удалить счет? Все транзакции также будут удалены.')) {
        appState.transactions = appState.transactions.filter(t => t.accountId !== accountId);
        appState.accounts = appState.accounts.filter(a => a.id !== accountId);
        if (appState.activeAccount === accountId) {
            appState.activeAccount = appState.accounts[0].id;
        }
        updateAccountSelector();
        updateAccountsSummary();
        setActiveAccount(appState.activeAccount);
        saveData();
    }
}

function showTransferForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('transferForm').style.display = 'block';
    const fromSelect = document.getElementById('transferFrom');
    const toSelect = document.getElementById('transferTo');
    fromSelect.innerHTML = appState.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance)})</option>`).join('');
    toSelect.innerHTML = appState.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join('');
}

function hideTransferForm() {
    document.getElementById('transferForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

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
    const toAccount = appState.accounts.find(a => a.id === toId);
    fromAccount.balance -= amount;
    toAccount.balance += amount;
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

function resetAllData() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        appState = {
            accounts: [{
                id: 'main',
                name: '💰 Основной счет',
                type: 'debit',
                balance: 0,
                currency: 'RUB',
                icon: '💳',
                color: '#40A7E3'
            }],
            transactions: [],
            budget: 0,
            activeAccount: 'main',
            plans: []
        };
        localStorage.removeItem('financeData');
        initializeAccounts();
        updateUI();
        tg.showAlert('✅ Все данные сброшены');
    }
}

function showPlanForm() {
    document.getElementById('app').style.display = 'none';
    let form = document.getElementById('planForm');
    if (!form) {
        form = document.createElement('div');
        form.id = 'planForm';
        form.className = 'form-modal';
        form.innerHTML = `
            <div class="form-header"><h2>📋 Новый план расходов</h2><button class="close-btn" onclick="hidePlanForm()">✖</button></div>
            <div class="form-body">
                <div class="form-group"><label>Название</label><input type="text" id="planName" placeholder="Продукты на неделю"></div>
                <div class="form-group"><label>Сумма (₽)</label><input type="number" id="planAmount" placeholder="5000" step="0.01"></div>
                <div class="form-group"><label>Категория</label>
                    <select id="planCategory">
                        <option value="food">🍔 Еда</option><option value="housing">🏠 Жилье</option><option value="transport">🚗 Транспорт</option>
                        <option value="clothes">👕 Одежда</option><option value="health">💊 Здоровье</option><option value="entertainment">🎮 Развлечения</option>
                        <option value="education">📚 Образование</option><option value="pets">🐶 Животные</option><option value="communication">📱 Связь</option>
                        <option value="gifts_expense">🎁 Подарки</option><option value="work">💼 Работа</option><option value="other_expense">💰 Другое</option>
                    </select>
                </div>
                <div class="form-group"><label>Дата</label><input type="date" id="planDate"></div>
                <div class="form-group"><label>Повторение</label>
                    <select id="planRecurring">
                        <option value="false">Одноразово</option><option value="weekly">Каждую неделю</option><option value="monthly">Каждый месяц</option>
                    </select>
                </div>
                <div class="form-group"><label>Счет списания</label><select id="planAccount">${appState.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}</select></div>
            </div>
            <div class="form-footer">
                <button class="btn btn-primary" onclick="savePlan()">✅ Сохранить план</button>
                <button class="btn btn-secondary" onclick="hidePlanForm()">❌ Отмена</button>
            </div>
        `;
        document.body.appendChild(form);
    }
    form.style.display = 'block';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('planDate').value = tomorrow.toISOString().split('T')[0];
}

function hidePlanForm() {
    document.getElementById('planForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

function savePlan() {
    const name = document.getElementById('planName').value;
    const amount = parseFloat(document.getElementById('planAmount').value);
    const category = document.getElementById('planCategory').value;
    const date = document.getElementById('planDate').value;
    const recurring = document.getElementById('planRecurring').value;
    const accountId = document.getElementById('planAccount').value;
    if (!name) { tg.showAlert('Введите название плана'); return; }
    if (isNaN(amount) || amount <= 0) { tg.showAlert('Введите корректную сумму'); return; }
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
    if (!appState.plans) appState.plans = [];
    appState.plans.push(plan);
    updatePlans();
    saveData();
    hidePlanForm();
    tg.showAlert(`✅ План "${name}" добавлен`);
}

function updatePlans() {
    if (!appState.plans) appState.plans = [];
    const plansList = document.getElementById('plansList');
    if (!plansList) return;
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
                <input type="checkbox" class="plan-checkbox" ${plan.completed ? 'checked' : ''} onchange="togglePlanComplete('${plan.id}', this.checked)">
                <div class="plan-info">
                    <div class="plan-name">${plan.name} ${plan.recurring ? `<span class="plan-recurring">${plan.recurring === 'weekly' ? 'Каждую неделю' : 'Каждый месяц'}</span>` : ''}</div>
                    <div class="plan-details">
                        <span class="plan-amount">${formatMoney(plan.amount)}</span>
                        <span class="plan-category">${getCategoryName(plan.category)}</span>
                        <span class="plan-date ${isOverdue ? 'overdue' : ''}">📅 ${dateStr} ${isOverdue ? '(просрочено)' : ''}</span>
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

function togglePlanComplete(planId, completed) {
    const plan = appState.plans.find(p => p.id === planId);
    if (!plan) return;
    if (completed && !plan.completed) {
        const account = appState.accounts.find(a => a.id === plan.accountId);
        if (account) {
            if (account.balance < plan.amount) {
                tg.showAlert(`⚠️ Недостаточно средств на счете "${account.name}"`);
                document.querySelector(`input[onchange*="${planId}"]`).checked = false;
                return;
            }
            appState.transactions.push({
                id: Date.now(),
                accountId: plan.accountId,
                type: 'expense',
                amount: plan.amount,
                category: plan.category,
                description: `📋 План: ${plan.name}`,
                date: new Date().toISOString()
            });
            account.balance -= plan.amount;
            if (plan.recurring) {
                const nextDate = new Date(plan.date);
                if (plan.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (plan.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                appState.plans.push({
                    ...plan,
                    id: 'plan_' + Date.now() + '_recurring',
                    date: nextDate.toISOString().split('T')[0],
                    completed: false,
                    createdAt: new Date().toISOString()
                });
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

function updatePlansSummary() {
    if (!appState.plans) return;
    let totalPlanned = 0, totalCompleted = 0;
    appState.plans.forEach(plan => {
        if (!plan.completed) totalPlanned += plan.amount;
        else totalCompleted += plan.amount;
    });
    document.getElementById('totalPlanned').textContent = formatMoney(totalPlanned);
    document.getElementById('totalCompleted').textContent = formatMoney(totalCompleted);
    document.getElementById('totalRemaining').textContent = formatMoney(totalPlanned);
}

function editPlan(planId) {
    const plan = appState.plans.find(p => p.id === planId);
    if (!plan) return;
    const newName = prompt('Название плана:', plan.name);
    if (newName) {
        plan.name = newName;
        updatePlans();
        saveData();
    }
}

function deletePlan(planId) {
    if (confirm('Удалить этот план?')) {
        appState.plans = appState.plans.filter(p => p.id !== planId);
        updatePlans();
        saveData();
    }
}

document.addEventListener('DOMContentLoaded', loadData);

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
}
// Показ модального окна при первом запуске
function checkFirstLaunch() {
    const hasInitialBalance = localStorage.getItem('initialBalanceSet');
    if (!hasInitialBalance && appState.accounts[0].balance === 0) {
        showInitialBalanceModal();
    }
}

// Показать модальное окно
function showInitialBalanceModal() {
    document.getElementById('initialBalanceModal').style.display = 'flex';
}

// Скрыть модальное окно
function hideInitialBalanceModal() {
    document.getElementById('initialBalanceModal').style.display = 'none';
}

// Установка начального баланса из модального окна
function setInitialBalanceFromModal() {
    const balance = parseFloat(document.getElementById('initialBalanceInput').value);

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
            description: 'Начальный баланс',
            date: new Date().toISOString()
        });
    }

    // Отмечаем что начальный баланс установлен
    localStorage.setItem('initialBalanceSet', 'true');

    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();
    hideInitialBalanceModal();

    tg.showAlert(`✅ Начальный баланс установлен: ${formatMoney(balance)}`);
}

// Пропустить установку начального баланса
function skipInitialBalance() {
    localStorage.setItem('initialBalanceSet', 'skipped');
    hideInitialBalanceModal();
}

// Удаляем старую функцию showBalanceForm и связанные с ней
// (можно удалить функции showBalanceForm, hideBalanceForm, setInitialBalance - старые)
// Переменная для текущего типа категорий
let currentCategoryType = 'expense';

// Показать категории определенного типа
function showCategoryType(type) {
    currentCategoryType = type;

    // Обновляем кнопки
    document.getElementById('cat-income-btn').classList.toggle('active', type === 'income');
    document.getElementById('cat-expense-btn').classList.toggle('active', type === 'expense');

    // Показываем нужный список
    document.getElementById('incomeCategoriesList').style.display = type === 'income' ? 'block' : 'none';
    document.getElementById('expenseCategoriesList').style.display = type === 'expense' ? 'block' : 'none';

    updateCategoriesList();
}

// Обновление списка категорий
function updateCategoriesList() {
    const incomeList = document.getElementById('incomeCategoriesList');
    const expenseList = document.getElementById('expenseCategoriesList');

    // Доходы
    incomeList.innerHTML = getCategoriesHTML('income');

    // Расходы
    expenseList.innerHTML = getCategoriesHTML('expense');
}

// Получение HTML для категорий
function getCategoriesHTML(type) {
    const categories = appState.customCategories?.[type] || [];

    if (categories.length === 0) {
        return '<p style="text-align: center; color: var(--hint-color); padding: 20px;">Нет своих категорий</p>';
    }

    return categories.map(cat => `
        <div class="category-item">
            <div class="category-item-left">
                <div class="category-icon" style="background: ${cat.color}20; color: ${cat.color}">
                    ${cat.icon}
                </div>
                <span class="category-name">${cat.name}</span>
            </div>
            <div class="category-actions">
                <button onclick="editCategory('${cat.id}')">✏️</button>
                <button onclick="deleteCategory('${cat.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Показать форму создания категории
function showCategoryForm() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('categoryForm').style.display = 'block';

    // Сбрасываем форму
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryIcon').value = '📌';
    document.getElementById('categoryColor').value = '#40a7e3';
}

// Скрыть форму категории
function hideCategoryForm() {
    document.getElementById('categoryForm').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Сохранить категорию
function saveCategory() {
    const type = document.getElementById('categoryType').value;
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value;
    const color = document.getElementById('categoryColor').value;

    if (!name) {
        tg.showAlert('Введите название категории');
        return;
    }

    if (!appState.customCategories) {
        appState.customCategories = { income: [], expense: [] };
    }

    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name,
        icon: icon || '📌',
        color: color,
        type: type
    };

    appState.customCategories[type].push(newCategory);

    // Обновляем селектор категорий в формах
    updateCategorySelector();

    updateCategoriesList();
    saveData();
    hideCategoryForm();

    tg.showAlert(`✅ Категория "${name}" создана`);
}

// Редактирование категории
function editCategory(categoryId) {
    // Ищем категорию во всех типах
    let category = null;
    let categoryType = null;

    for (const type of ['income', 'expense']) {
        const found = appState.customCategories?.[type]?.find(c => c.id === categoryId);
        if (found) {
            category = found;
            categoryType = type;
            break;
        }
    }

    if (!category) return;

    const newName = prompt('Новое название категории:', category.name);
    if (newName) {
        category.name = newName;
        updateCategoriesList();
        updateCategorySelector();
        saveData();
    }
}

// Удаление категории
function deleteCategory(categoryId) {
    if (!confirm('Удалить категорию?')) return;

    for (const type of ['income', 'expense']) {
        if (appState.customCategories?.[type]) {
            appState.customCategories[type] = appState.customCategories[type].filter(c => c.id !== categoryId);
        }
    }

    updateCategoriesList();
    updateCategorySelector();
    saveData();
}

// Обновление селектора категорий в формах
function updateCategorySelector() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    // Сохраняем стандартные категории
    const incomeOptgroup = document.getElementById('incomeCategories');
    const expenseOptgroup = document.getElementById('expenseCategories');

    // Добавляем пользовательские категории
    if (appState.customCategories?.income) {
        appState.customCategories.income.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            incomeOptgroup.appendChild(option);
        });
    }

    if (appState.customCategories?.expense) {
        appState.customCategories.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            expenseOptgroup.appendChild(option);
        });
    }
}