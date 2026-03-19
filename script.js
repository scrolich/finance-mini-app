// ===== ЗАГРУЗКА И СОХРАНЕНИЕ =====
const STORAGE_KEY = 'financeData';

function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    console.log('✅ Данные сохранены');
    if (window.dispatchEvent) {
        window.dispatchEvent(new Event('finance-data-changed'));
    }
}

// ===== НАЧАЛЬНОЕ СОСТОЯНИЕ =====
const defaultState = {
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
    plans: [],
    customCategories: {
        income: [],
        expense: []
    }
};

let appState = loadData() || JSON.parse(JSON.stringify(defaultState));

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let categoriesChart = null;
let dailyChart = null;
let balanceChart = null;
let plansChart = null;
let currentChart = 'categories';
let currentCurrency = 'RUB';
let currentType = 'income';
let currentPeriod = 'month';
let customStartDate = null;
let customEndDate = null;
let currentCategoryType = 'expense';
let selectedEmoji = '💰';
let currentTab = 'main';
let selectedAnalysisCategory = null;

// ===== ГЛОБАЛЬНЫЕ ССЫЛКИ =====
window.appState = appState;
window.updateUI = updateUI;
window.saveData = saveData;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function formatMoney(amount) {
    let value = amount * exchangeRates[currentCurrency];
    if (currentCurrency === 'RUB') return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
    if (currentCurrency === 'USD') return '$' + value.toFixed(2);
    return '€' + value.toFixed(2);
}

function getCategoryName(category) {
    if (appState.customCategories) {
        for (let type of ['income', 'expense']) {
            const found = appState.customCategories[type]?.find(c => c.id === category);
            if (found) return `${found.icon} ${found.name}`;
        }
    }
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
        'transfer': '🔄 Перевод'
    };
    return categories[category] || category;
}

// ===== PWA ПРОВЕРКА =====
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone === true;
console.log('🚀 Запуск в режиме:', isPWA ? 'PWA (иконка)' : 'Браузер');

// ===== СИНХРОНИЗАЦИЯ =====
function forceSync() {
    console.log('🔄 Принудительная синхронизация...');
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            appState = JSON.parse(data);
            initializeAccounts();
            updateUI();
            console.log('✅ Данные синхронизированы');
        } catch (e) {
            console.log('❌ Ошибка синхронизации:', e);
        }
    }
}

if (isPWA) {
    window.addEventListener('focus', forceSync);
}

// ===== ДАННЫЕ ДЛЯ ЭМОДЗИ =====
const emojiData = {
    all: ['🍔', '🍕', '🍣', '🍜', '🍝', '🍱', '🍛', '🍙', '🍚', '🍘', '🍢', '🍡', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '☕', '🍵', '🥤', '🧃', '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚦', '🚧', '⛽', '🅿️', '🚉', '🚇', '✈️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳️', '⛴️', '🚢', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '⛲', '🌲', '🌳', '🌴', '🌵', '🌿', '🍀', '🍃', '🌱', '💊', '💉', '🩺', '🏥', '🤒', '🤕', '😷', '🤧', '🤮', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '🎮', '🎲', '🎯', '🎳', '🎰', '🎪', '🎨', '🎭', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎬', '📚', '📖', '📕', '📗', '📘', '📙', '📔', '📒', '📃', '📜', '📄', '📰', '🎓', '✏️', '✒️', '🖊️', '🖋️', '🖌️', '🖍️', '📝', '💼', '👔', '👕', '👖', '👗', '👘', '👙', '👚', '👛', '👜', '👝', '🎒', '👞', '👟', '👠', '👡', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏏', '🏑', '🏒', '🏓', '🏸', '🥊', '🥋', '⛸️', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '✈️', '🌍', '🌎', '🌏', '🗺️', '🧳', '⛱️', '🏖️', '🏝️', '🏜️', '🏔️', '⛰️', '🌋', '🏞️', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🐢', '🐍', '🦎', '🐟', '🐠', '🐡', '🐬', '🐳', '🐋', '🦈', '🎁', '🎀', '🎊', '🎉', '🎈', '🪅', '🎎', '🎏', '🎐', '🧧', '💰', '💵', '💴', '💶', '💷', '💳', '💎', '⚖️', '📊', '📈', '📉', '💻', '🖥️', '💽', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '📺', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📼', '🔊', '📢', '📣', '🔔', '🎵', '🎶', '🎙️', '🎚️', '🎛️', '🎧', '📻', '🪄', '✨', '🌟', '⭐', '🌠', '⏰', '⌛', '📅', '📆', '🗓️', '🔒', '🔓', '🔑', '🗝️', '🔨', '🪛', '🔧', '🔩', '⚙️', '🧰', '🧲', '🔬', '🔭', '📡', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '🪙', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️'],
    food: ['🍔', '🍕', '🍣', '🍜', '🍝', '🍱', '🍛', '🍙', '🍚', '🍘', '🍢', '🍡', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '☕', '🍵', '🥤', '🧃', '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃'],
    transport: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚦', '🚧', '⛽', '🅿️', '🚉', '🚇', '✈️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳️', '⛴️', '🚢'],
    shopping: ['🛍️', '👕', '👖', '👗', '👔', '👚', '🧥', '🧦', '👟', '👞', '👠', '👡', '👢', '🧢', '🎩', '👒', '🕶️', '👓', '💍', '⌚', '📱', '💻', '🖥️', '📷', '🎧', '🔋', '💡', '🕯️'],
    home: ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🛏️', '🛋️', '🚪', '🪑', '🛁', '🚿', '🧹', '🧺', '🧼', '🪣'],
    health: ['💊', '💉', '🩺', '🏥', '🤒', '🤕', '😷', '🤧', '🤮', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '🧘', '🏃', '🚶'],
    entertainment: ['🎮', '🎲', '🎯', '🎳', '🎰', '🎪', '🎨', '🎭', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎬', '📺', '📽️', '🎞️', '📚', '🎵', '🎶'],
    education: ['📚', '📖', '📕', '📗', '📘', '📙', '📔', '📒', '📃', '📜', '📄', '📰', '🎓', '✏️', '✒️', '🖊️', '🖋️', '🖌️', '🖍️', '📝', '📐', '📏', '🔬', '🔭'],
    work: ['💼', '👔', '📊', '📈', '📉', '📋', '📁', '🗂️', '📅', '📆', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📞', '💻', '🖥️', '🖨️', '⌨️', '🖱️'],
    sports: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏏', '🏑', '🏒', '🏓', '🏸', '🥊', '🥋', '⛸️', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘'],
    travel: ['✈️', '🌍', '🌎', '🌏', '🗺️', '🧳', '⛱️', '🏖️', '🏝️', '🏜️', '🏔️', '⛰️', '🌋', '🏞️', '🏕️', '🏟️', '🏛️', '🏗️', '🏘️', '🏙️'],
    pets: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🐢', '🐍', '🦎', '🐟', '🐠', '🐡', '🐬', '🐳', '🐋', '🦈'],
    gifts: ['🎁', '🎀', '🎊', '🎉', '🎈', '🪅', '🎎', '🎏', '🎐', '🧧', '💝', '💖', '💗', '💓', '💞', '💕', '💌'],
    finance: ['💰', '💵', '💴', '💶', '💷', '💳', '💎', '⚖️', '📊', '📈', '📉', '🏦', '🧾', '📑', '🔖', '🏷️'],
    tech: ['💻', '🖥️', '💽', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '📺', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📼', '🔊', '📢', '📣', '🔔', '🎵', '🎶', '🎙️', '🎚️', '🎛️', '🎧', '📻'],
    other: ['✨', '🌟', '⭐', '🌠', '⏰', '⌛', '📅', '📆', '🗓️', '🔒', '🔓', '🔑', '🗝️', '🔨', '🪛', '🔧', '🔩', '⚙️', '🧰', '🧲', '🔬', '🔭', '📡', '💡', '🔦', '🏮', '🪔']
};

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

// ===== ОСНОВНЫЕ ФУНКЦИИ =====
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
    if (!historyEl) {
        console.log('❌ Элемент history не найден');
        return;
    }

    if (!transactions || transactions.length === 0) {
        historyEl.innerHTML = '<div class="empty-history">Нет операций</div>';
        return;
    }

    historyEl.innerHTML = '';

    // Берем последние 10 транзакций и показываем в обратном порядке (сначала новые)
    transactions.slice(-10).reverse().forEach(t => {
        const date = new Date(t.date);
        const formattedDate = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const fullDate = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const categoryName = getCategoryName(t.category);

        const item = document.createElement('div');
        item.className = 'history-item';
        item.setAttribute('title', fullDate);
        item.innerHTML = `
            <div class="history-left">
                <span class="history-category">${categoryName}</span>
                <span class="history-desc">${t.description || '—'}</span>
            </div>
            <div class="history-right">
                <div class="history-amount ${t.type === 'income' ? 'income' : 'expense'}">
                    ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                </div>
                <div class="history-date">${formattedDate}</div>
            </div>
        `;
        historyEl.appendChild(item);
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

    filterTransactionsByAccount();

    if (currentTab === 'main') {
        updateStatsByPeriod();
    } else if (currentTab === 'analytics') {
        updateStatsByPeriod();
        updateCharts();
    } else if (currentTab === 'plans') {
        updatePlans();
    }

    updateBudgetUI();
    updateAccountsSummary();
}

function updateBudgetUI() {
    if (appState.budget > 0) {
        const now = new Date();
        const monthExpenses = appState.transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'expense' && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }).reduce((sum, t) => sum + t.amount, 0);
        const percent = Math.min((monthExpenses / appState.budget) * 100, 100);

        const bar = document.getElementById('budgetBar');
        const barDetailed = document.getElementById('budgetBarDetailed');
        const spentEl = document.getElementById('spentAmount');
        const spentDetailed = document.getElementById('spentAmountDetailed');
        const budgetEl = document.getElementById('budgetAmount');
        const budgetDetailed = document.getElementById('budgetAmountDetailed');

        if (bar) bar.style.width = percent + '%';
        if (barDetailed) barDetailed.style.width = percent + '%';
        if (spentEl) spentEl.textContent = formatMoney(monthExpenses);
        if (spentDetailed) spentDetailed.textContent = formatMoney(monthExpenses);
        if (budgetEl) budgetEl.textContent = formatMoney(appState.budget);
        if (budgetDetailed) budgetDetailed.textContent = formatMoney(appState.budget);
    }
}

function showChart(type) {
    currentChart = type;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tab = document.getElementById(`tab-${type}`);
    if (tab) tab.classList.add('active');

    const chartCats = document.getElementById('chart-categories');
    const chartDaily = document.getElementById('chart-daily');
    const chartBalance = document.getElementById('chart-balance');

    if (chartCats) chartCats.style.display = type === 'categories' ? 'block' : 'none';
    if (chartDaily) chartDaily.style.display = type === 'daily' ? 'block' : 'none';
    if (chartBalance) chartBalance.style.display = type === 'balance' ? 'block' : 'none';

    updateCharts();
}

function updateCharts() {
    updateCategoriesChart();
    updateTotals();
    if (selectedAnalysisCategory) {
        updateCategoryAnalysis();
    }
}

function updateCategoriesChart() {
    const canvas = document.getElementById('categoriesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const { startDate, endDate } = getPeriodDates();

    const expensesByCategory = {};

    appState.transactions.forEach(t => {
        if (t.type === 'expense') {
            const tDate = new Date(t.date);
            if (tDate >= startDate && tDate <= endDate) {
                const catName = getCategoryName(t.category);
                expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
            }
        }
    });

    if (Object.keys(expensesByCategory).length === 0) {
        expensesByCategory['Нет данных'] = 1;
    }

    if (categoriesChart) categoriesChart.destroy();

    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#A78BFA', '#F472B6',
        '#6EE7B7', '#FCD34D', '#C084FC', '#60A5FA', '#34D399',
        '#F87171', '#818CF8'
    ];

    categoriesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: colors.slice(0, Object.keys(expensesByCategory).length),
                borderWidth: 2,
                borderColor: '#ffffff',
                borderRadius: 8,
                spacing: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '0%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: '500' },
                        color: getComputedStyle(document.body).getPropertyValue('--text-color').trim(),
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatMoney(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: { top: 20, bottom: 20 }
            },
            elements: {
                arc: {
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#ffffff',
                    hoverOffset: 15
                }
            }
        }
    });
}

function updateTotals() {
    let totalIncome = 0, totalExpense = 0;
    appState.transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });
    const incEl = document.getElementById('totalIncome');
    const expEl = document.getElementById('totalExpense');
    const diffEl = document.getElementById('totalDiff');
    if (incEl) incEl.textContent = formatMoney(totalIncome);
    if (expEl) expEl.textContent = formatMoney(totalExpense);
    const diff = totalIncome - totalExpense;
    if (diffEl) {
        diffEl.textContent = formatMoney(diff);
        diffEl.className = diff >= 0 ? 'income' : 'expense';
    }
}

function setCurrency(currency) {
    currentCurrency = currency;
    document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('active-currency'));
    const btn = document.getElementById(`currency-${currency.toLowerCase()}`);
    if (btn) btn.classList.add('active-currency');
    updateUI();
    updateAccountsSummary();
}

function showForm(type) {
    currentType = type;
    const title = document.getElementById('formTitle');
    if (title) title.textContent = type === 'income' ? '💰 Добавить доход' : '💸 Добавить расход';

    const incCats = document.getElementById('incomeCategories');
    const expCats = document.getElementById('expenseCategories');
    if (incCats) incCats.style.display = type === 'income' ? 'block' : 'none';
    if (expCats) expCats.style.display = type === 'expense' ? 'block' : 'none';

    const dateInput = document.getElementById('transactionDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const app = document.getElementById('app');
    const form = document.getElementById('transactionForm');
    if (app) app.style.display = 'none';
    if (form) form.style.display = 'block';
}

function hideForm() {
    const form = document.getElementById('transactionForm');
    const app = document.getElementById('app');
    if (form) form.style.display = 'none';
    if (app) app.style.display = 'block';

    const amount = document.getElementById('amount');
    const desc = document.getElementById('description');
    if (amount) amount.value = '';
    if (desc) desc.value = '';
}

function saveTransaction() {
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('transactionDate');

    if (!amountInput || !categorySelect) {
        console.log('Ошибка: форма не загружена');
        return;
    }

    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const description = descriptionInput ? descriptionInput.value : '';
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    if (isNaN(amount) || amount <= 0) {
        console.log('Введите корректную сумму');
        return;
    }

    const account = appState.accounts.find(a => a.id === appState.activeAccount);
    if (!account) {
        console.log('Ошибка: выберите счет');
        return;
    }

    if (currentType === 'expense' && account.balance < amount) {
        console.log(`❌ Недостаточно средств на счете "${account.name}"`);
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

function showTransferForm() {
    const app = document.getElementById('app');
    const form = document.getElementById('transferForm');
    if (app) app.style.display = 'none';
    if (form) form.style.display = 'block';

    const fromSelect = document.getElementById('transferFrom');
    const toSelect = document.getElementById('transferTo');

    if (fromSelect) {
        fromSelect.innerHTML = appState.accounts.map(a =>
            `<option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance)})</option>`
        ).join('');
    }

    if (toSelect) {
        toSelect.innerHTML = appState.accounts.map(a =>
            `<option value="${a.id}">${a.icon} ${a.name}</option>`
        ).join('');
    }
}

function hideTransferForm() {
    const form = document.getElementById('transferForm');
    const app = document.getElementById('app');
    if (form) form.style.display = 'none';
    if (app) app.style.display = 'block';
}

function transferMoney() {
    const fromSelect = document.getElementById('transferFrom');
    const toSelect = document.getElementById('transferTo');
    const amountInput = document.getElementById('transferAmount');

    if (!fromSelect || !toSelect || !amountInput) return;

    const fromId = fromSelect.value;
    const toId = toSelect.value;
    const amount = parseFloat(amountInput.value);

    if (fromId === toId) {
        console.log('Нельзя перевести на тот же счет');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        console.log('Введите корректную сумму');
        return;
    }

    const fromAccount = appState.accounts.find(a => a.id === fromId);
    if (fromAccount.balance < amount) {
        console.log('Недостаточно средств');
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
}

function showAccountForm() {
    const app = document.getElementById('app');
    const form = document.getElementById('accountForm');
    if (app) app.style.display = 'none';
    if (form) form.style.display = 'block';

    const nameInput = document.getElementById('accountName');
    const typeSelect = document.getElementById('accountType');
    const balanceInput = document.getElementById('accountBalance');

    if (nameInput) nameInput.value = '';
    if (typeSelect) typeSelect.value = 'debit';
    if (balanceInput) balanceInput.value = '';
}

function hideAccountForm() {
    const form = document.getElementById('accountForm');
    const app = document.getElementById('app');
    if (form) form.style.display = 'none';
    if (app) app.style.display = 'block';
}

function saveAccount() {
    const nameInput = document.getElementById('accountName');
    const typeSelect = document.getElementById('accountType');
    const balanceInput = document.getElementById('accountBalance');

    if (!nameInput || !typeSelect || !balanceInput) return;

    const name = nameInput.value;
    const type = typeSelect.value;
    const balance = parseFloat(balanceInput.value) || 0;

    if (!name) {
        console.log('Введите название счета');
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
}

function resetAllData() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        appState = JSON.parse(JSON.stringify(defaultState));
        localStorage.removeItem('financeData');
        initializeAccounts();
        updateUI();
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
                        <option value="work">💼 Работа</option>
                        <option value="other_expense">💰 Другое</option>
                    </select>
                </div>
                <div class="form-group"><label>Дата</label><input type="date" id="planDate"></div>
                <div class="form-group"><label>Повторение</label>
                    <select id="planRecurring">
                        <option value="false">Одноразово</option>
                        <option value="weekly">Каждую неделю</option>
                        <option value="monthly">Каждый месяц</option>
                    </select>
                </div>
                <div class="form-group"><label>Счет списания</label><select id="planAccount"></select></div>
            </div>
            <div class="form-footer">
                <button class="btn btn-primary" onclick="savePlan()">✅ Сохранить план</button>
                <button class="btn btn-secondary" onclick="hidePlanForm()">❌ Отмена</button>
            </div>
        `;
        document.body.appendChild(form);
    }

    const accountSelect = document.getElementById('planAccount');
    if (accountSelect) {
        accountSelect.innerHTML = appState.accounts.map(a =>
            `<option value="${a.id}">${a.icon} ${a.name}</option>`
        ).join('');
    }

    form.style.display = 'block';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('planDate');
    if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];
}

function hidePlanForm() {
    const form = document.getElementById('planForm');
    const app = document.getElementById('app');
    if (form) form.style.display = 'none';
    if (app) app.style.display = 'block';
}

function savePlan() {
    const nameInput = document.getElementById('planName');
    const amountInput = document.getElementById('planAmount');
    const categorySelect = document.getElementById('planCategory');
    const dateInput = document.getElementById('planDate');
    const recurringSelect = document.getElementById('planRecurring');
    const accountSelect = document.getElementById('planAccount');

    if (!nameInput || !amountInput || !categorySelect || !dateInput || !recurringSelect || !accountSelect) return;

    const name = nameInput.value;
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const date = dateInput.value;
    const recurring = recurringSelect.value;
    const accountId = accountSelect.value;

    if (!name) { console.log('Введите название плана'); return; }
    if (isNaN(amount) || amount <= 0) { console.log('Введите корректную сумму'); return; }

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
    if (currentTab === 'plans') {
        updatePlansChart();
    }
}

function updatePlansSummary() {
    if (!appState.plans) return;
    let totalPlanned = 0, totalCompleted = 0;
    appState.plans.forEach(plan => {
        if (!plan.completed) totalPlanned += plan.amount;
        else totalCompleted += plan.amount;
    });

    const plannedEl = document.getElementById('totalPlanned');
    const completedEl = document.getElementById('totalCompleted');
    const remainingEl = document.getElementById('totalRemaining');

    if (plannedEl) plannedEl.textContent = formatMoney(totalPlanned);
    if (completedEl) completedEl.textContent = formatMoney(totalCompleted);
    if (remainingEl) remainingEl.textContent = formatMoney(totalPlanned);
}

function togglePlanComplete(planId, completed) {
    const plan = appState.plans.find(p => p.id === planId);
    if (!plan) return;

    if (completed && !plan.completed) {
        const account = appState.accounts.find(a => a.id === plan.accountId);
        if (account) {
            if (account.balance < plan.amount) {
                console.log(`⚠️ Недостаточно средств на счете "${account.name}"`);
                const checkbox = document.querySelector(`input[onchange*="${planId}"]`);
                if (checkbox) checkbox.checked = false;
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
        }
    }

    plan.completed = completed;
    updatePlans();
    updateAccountsSummary();
    updateUI();
    saveData();
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
        console.log('Нельзя удалить последний счет');
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

function checkFirstLaunch() {
    const hasInitialBalance = localStorage.getItem('initialBalanceSet');
    if (!hasInitialBalance && appState.accounts[0].balance === 0) {
        showInitialBalanceModal();
    }
}

function showInitialBalanceModal() {
    const modal = document.getElementById('initialBalanceModal');
    if (modal) modal.style.display = 'flex';
}

function hideInitialBalanceModal() {
    const modal = document.getElementById('initialBalanceModal');
    if (modal) modal.style.display = 'none';
}

function setInitialBalanceFromModal() {
    const input = document.getElementById('initialBalanceInput');
    if (!input) return;

    const balance = parseFloat(input.value);

    if (isNaN(balance) || balance < 0) {
        console.log('Введите корректную сумму');
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

    localStorage.setItem('initialBalanceSet', 'true');

    updateAccountSelector();
    updateAccountsSummary();
    updateUI();
    saveData();
    hideInitialBalanceModal();
}

function skipInitialBalance() {
    localStorage.setItem('initialBalanceSet', 'skipped');
    hideInitialBalanceModal();
}

// ===== ФУНКЦИИ ДЛЯ КАТЕГОРИЙ =====
function showCategoryForm() {
    const app = document.getElementById('app');
    const form = document.getElementById('categoryForm');
    if (app) app.style.display = 'none';
    if (form) form.style.display = 'block';

    const nameInput = document.getElementById('categoryName');
    const iconInput = document.getElementById('categoryIcon');
    const colorInput = document.getElementById('categoryColor');

    if (nameInput) nameInput.value = '';
    if (iconInput) iconInput.value = '📌';
    if (colorInput) colorInput.value = '#40a7e3';
    selectedEmoji = '💰';
    updateEmojiList();
}

function hideCategoryForm() {
    const form = document.getElementById('categoryForm');
    const app = document.getElementById('app');
    if (form) form.style.display = 'none';
    if (app) app.style.display = 'block';
}

function saveCategory() {
    const typeSelect = document.getElementById('categoryType');
    const nameInput = document.getElementById('categoryName');
    const colorInput = document.getElementById('categoryColor');

    if (!typeSelect || !nameInput || !colorInput) return;

    const type = typeSelect.value;
    const name = nameInput.value;
    const color = colorInput.value;

    if (!name) {
        console.log('Введите название категории');
        return;
    }

    if (!appState.customCategories) {
        appState.customCategories = { income: [], expense: [] };
    }

    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name,
        icon: selectedEmoji,
        color: color,
        type: type
    };

    appState.customCategories[type].push(newCategory);

    updateCategorySelector();
    updateCategoriesList();
    saveData();
    hideCategoryForm();
}

function updateCategorySelector() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    const incomeOptgroup = document.getElementById('incomeCategories');
    const expenseOptgroup = document.getElementById('expenseCategories');

    if (incomeOptgroup) {
        while (incomeOptgroup.children.length > 4) {
            incomeOptgroup.removeChild(incomeOptgroup.lastChild);
        }
        if (appState.customCategories?.income) {
            appState.customCategories.income.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icon} ${cat.name}`;
                incomeOptgroup.appendChild(option);
            });
        }
    }

    if (expenseOptgroup) {
        while (expenseOptgroup.children.length > 11) {
            expenseOptgroup.removeChild(expenseOptgroup.lastChild);
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
}

function updateAnalyticsCategorySelector() {
    const selector = document.getElementById('categorySelector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Все категории</option>';

    const standardCategories = {
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
        'work': '💼 Работа'
    };

    Object.entries(standardCategories).forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        selector.appendChild(option);
    });

    if (appState.customCategories?.expense) {
        appState.customCategories.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            selector.appendChild(option);
        });
    }
}

function selectCategoryForAnalysis() {
    const selector = document.getElementById('categorySelector');
    const categoryId = selector.value;

    if (!categoryId) {
        document.getElementById('categoryAnalysisInfo').style.display = 'none';
        document.getElementById('categoryTransactionsCard').style.display = 'none';
        selectedAnalysisCategory = null;
        updateCharts();
        return;
    }

    selectedAnalysisCategory = categoryId;

    let categoryName = '';
    let categoryIcon = '📊';

    const standardCategories = {
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
        'work': '💼 Работа'
    };

    if (standardCategories[categoryId]) {
        categoryName = standardCategories[categoryId];
        categoryIcon = categoryName.split(' ')[0];
    } else {
        for (const type of ['expense']) {
            const found = appState.customCategories?.[type]?.find(c => c.id === categoryId);
            if (found) {
                categoryName = found.name;
                categoryIcon = found.icon;
                break;
            }
        }
    }

    document.getElementById('selectedCategoryIcon').textContent = categoryIcon;
    document.getElementById('selectedCategoryName').textContent = categoryName;
    document.getElementById('categoryAnalysisInfo').style.display = 'block';

    updateCategoryAnalysis();
}

function updateCategoryAnalysis() {
    if (!selectedAnalysisCategory) return;

    const { startDate, endDate } = getPeriodDates();

    const categoryTransactions = appState.transactions.filter(t => {
        if (t.type !== 'expense') return false;
        if (t.category !== selectedAnalysisCategory) return false;
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('selectedCategoryTotal').textContent = formatMoney(total);

    const countEl = document.getElementById('categoryTransactionCount');
    if (countEl) {
        countEl.textContent = `${categoryTransactions.length} операций`;
    }

    if (categoryTransactions.length > 0) {
        document.getElementById('categoryTransactionsCard').style.display = 'block';

        const list = document.getElementById('categoryTransactionsList');
        list.innerHTML = categoryTransactions.map(t => {
            const date = new Date(t.date);
            const formattedDate = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const timeOnly = date.toLocaleString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="transaction-item" title="${formattedDate}">
                    <div>
                        <div class="transaction-date">${formattedDate.split(',')[0]}</div>
                        <div class="transaction-time">${timeOnly}</div>
                        <div class="transaction-desc">${t.description || '—'}</div>
                    </div>
                    <div class="transaction-amount">${formatMoney(t.amount)}</div>
                </div>
            `;
        }).join('');
    } else {
        document.getElementById('categoryTransactionsCard').style.display = 'none';
    }
}

function showCategoryType(type) {
    currentCategoryType = type;

    const incomeBtn = document.getElementById('cat-income-btn');
    const expenseBtn = document.getElementById('cat-expense-btn');
    const incomeList = document.getElementById('incomeCategoriesList');
    const expenseList = document.getElementById('expenseCategoriesList');

    if (incomeBtn) incomeBtn.classList.toggle('active', type === 'income');
    if (expenseBtn) expenseBtn.classList.toggle('active', type === 'expense');

    if (incomeList) incomeList.style.display = type === 'income' ? 'block' : 'none';
    if (expenseList) expenseList.style.display = type === 'expense' ? 'block' : 'none';

    updateCategoriesList();
}

function updateCategoriesList() {
    const incomeList = document.getElementById('incomeCategoriesList');
    const expenseList = document.getElementById('expenseCategoriesList');

    if (incomeList) {
        incomeList.innerHTML = getCategoriesHTML('income');
    }

    if (expenseList) {
        expenseList.innerHTML = getCategoriesHTML('expense');
    }
}

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
                <span class="category-type-badge">${type === 'income' ? '💰' : '💸'}</span>
            </div>
            <div class="category-actions">
                <button onclick="editCategory('${cat.id}')">✏️</button>
                <button onclick="deleteCategory('${cat.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function editCategory(categoryId) {
    let category = null;

    for (const type of ['income', 'expense']) {
        const found = appState.customCategories?.[type]?.find(c => c.id === categoryId);
        if (found) {
            category = found;
            break;
        }
    }

    if (!category) return;

    const newName = prompt('Новое название категории:', category.name);
    if (newName) {
        category.name = newName;
        updateCategoriesList();
        updateCategorySelector();
        updateAnalyticsCategorySelector();
        saveData();
    }
}

function deleteCategory(categoryId) {
    if (!confirm('Удалить категорию?')) return;

    for (const type of ['income', 'expense']) {
        if (appState.customCategories?.[type]) {
            appState.customCategories[type] = appState.customCategories[type].filter(c => c.id !== categoryId);
        }
    }

    updateCategoriesList();
    updateCategorySelector();
    updateAnalyticsCategorySelector();
    saveData();
}

// ===== ФУНКЦИИ ДЛЯ ПЕРИОДА =====
function setPeriod(period) {
    currentPeriod = period;

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const btn = document.getElementById(`period-${period}`);
    if (btn) btn.classList.add('active');

    const customPeriod = document.getElementById('customPeriod');
    if (customPeriod) {
        customPeriod.style.display = period === 'custom' ? 'block' : 'none';
    }

    updateStatsByPeriod();
}

function applyCustomPeriod() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (!startInput || !endInput) return;

    const start = startInput.value;
    const end = endInput.value;

    if (!start || !end) {
        console.log('Выберите даты');
        return;
    }

    customStartDate = new Date(start);
    customEndDate = new Date(end);
    customEndDate.setHours(23, 59, 59);

    updateStatsByPeriod();
}

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
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59);
    }
    return { startDate, endDate };
}

function updateStatsByPeriod() {
    const { startDate, endDate } = getPeriodDates();
    if (!startDate || !endDate) return;

    const filteredTransactions = appState.transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
    });

    let periodIncome = 0, periodExpense = 0;
    filteredTransactions.forEach(t => {
        if (t.type === 'income') periodIncome += t.amount;
        else periodExpense += t.amount;
    });

    const todayIncome = document.getElementById('todayIncome');
    const todayExpense = document.getElementById('todayExpense');
    if (todayIncome) todayIncome.textContent = formatMoney(periodIncome);
    if (todayExpense) todayExpense.textContent = formatMoney(periodExpense);

    updateTotalsWithFilter(filteredTransactions);
    if (selectedAnalysisCategory) updateCategoryAnalysis();
}

function updateTotalsWithFilter(transactions) {
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const totalDiffEl = document.getElementById('totalDiff');

    if (totalIncomeEl) totalIncomeEl.textContent = formatMoney(totalIncome);
    if (totalExpenseEl) totalExpenseEl.textContent = formatMoney(totalExpense);

    const diff = totalIncome - totalExpense;
    if (totalDiffEl) {
        totalDiffEl.textContent = formatMoney(diff);
        totalDiffEl.className = diff >= 0 ? 'income' : 'expense';
    }
}

// ===== ФУНКЦИИ ДЛЯ ВКЛАДОК =====
function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');

    document.getElementById('main-content').style.display = tab === 'main' ? 'block' : 'none';
    document.getElementById('analytics-content').style.display = tab === 'analytics' ? 'block' : 'none';
    document.getElementById('plans-content').style.display = tab === 'plans' ? 'block' : 'none';

    if (tab === 'analytics') {
        updateCharts();
        updateAnalyticsCategorySelector();
    } else if (tab === 'plans') {
        updatePlans();
        updatePlansChart();
    }
}

function updatePlansChart() {
    const canvas = document.getElementById('plansChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const now = new Date();
    const monthPlans = appState.plans?.filter(p => {
        const planDate = new Date(p.date);
        return planDate.getMonth() === now.getMonth() && planDate.getFullYear() === now.getFullYear();
    }) || [];

    const completed = monthPlans.filter(p => p.completed).reduce((sum, p) => sum + p.amount, 0);
    const pending = monthPlans.filter(p => !p.completed).reduce((sum, p) => sum + p.amount, 0);

    if (plansChart) plansChart.destroy();

    plansChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'Ожидает'],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ['#4CAF50', '#FFC107'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ===== ФУНКЦИИ ДЛЯ ЭМОДЗИ =====
function updateEmojiList() {
    const emojiCategory = document.getElementById('emojiCategory')?.value || 'all';
    const grid = document.getElementById('emojiGrid');
    if (!grid) return;

    const emojis = emojiData[emojiCategory] || emojiData.all;

    grid.innerHTML = emojis.map(emoji => `
        <div class="emoji-item ${selectedEmoji === emoji ? 'selected' : ''}"
             onclick="selectEmoji('${emoji}')">
            ${emoji}
        </div>
    `).join('');
}

function selectEmoji(emoji) {
    selectedEmoji = emoji;
    updateEmojiList();
}

// ===== ФУНКЦИИ ДЛЯ КРАСИВОЙ КНОПКИ =====
function showQuickActions() {
    document.getElementById('quickMenu').style.display = 'flex';
}

function hideQuickActions() {
    document.getElementById('quickMenu').style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideQuickActions();
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    initializeAccounts();
    updateAnalyticsCategorySelector();
    updateUI();
    setTimeout(checkFirstLaunch, 500);
});

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
}

// ===== ДЕТАЛЬНЫЙ ПРОСМОТР КАТЕГОРИИ =====
function showCategoryDetail(categoryId, categoryName, categoryIcon) {
    // Проверяем, существует ли модальное окно, если нет - создаем
    let modal = document.getElementById('categoryDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'categoryDetailModal';
        modal.className = 'category-detail-modal';
        modal.innerHTML = `
            <div class="category-detail-content">
                <div class="category-detail-header">
                    <div>
                        <span class="category-detail-icon" id="detailCategoryIcon">🍔</span>
                        <span class="category-detail-name" id="detailCategoryName">Продукты</span>
                    </div>
                    <button class="close-btn" onclick="hideCategoryDetail()">✖</button>
                </div>

                <div class="category-detail-total">
                    <div class="total-label">Всего потрачено</div>
                    <div class="total-amount" id="detailCategoryTotal">0 ₽</div>
                </div>

                <div class="category-detail-stats">
                    <div class="stat-chip">
                        <span class="stat-chip-label">Операций</span>
                        <span class="stat-chip-value" id="detailTransactionCount">0</span>
                    </div>
                    <div class="stat-chip">
                        <span class="stat-chip-label">Средний чек</span>
                        <span class="stat-chip-value" id="detailAverageAmount">0 ₽</span>
                    </div>
                    <div class="stat-chip">
                        <span class="stat-chip-label">Макс.</span>
                        <span class="stat-chip-value" id="detailMaxAmount">0 ₽</span>
                    </div>
                </div>

                <div class="category-detail-list">
                    <div class="list-header">
                        <span>Дата / Время</span>
                        <span>Сумма</span>
                        <span>Счет</span>
                    </div>
                    <div id="detailTransactionsList" class="transactions-detail-list"></div>
                </div>

                <div class="category-detail-footer">
                    <button class="btn btn-small" onclick="hideCategoryDetail()">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Устанавливаем иконку и название
    document.getElementById('detailCategoryIcon').textContent = categoryIcon || '📊';
    document.getElementById('detailCategoryName').textContent = categoryName;

    // Получаем транзакции по категории
    const categoryTransactions = appState.transactions.filter(t =>
        t.category === categoryId && t.type === 'expense'
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Считаем статистику
    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avg = categoryTransactions.length ? total / categoryTransactions.length : 0;
    const max = categoryTransactions.length ? Math.max(...categoryTransactions.map(t => t.amount)) : 0;

    // Обновляем статистику
    document.getElementById('detailCategoryTotal').textContent = formatMoney(total);
    document.getElementById('detailTransactionCount').textContent = categoryTransactions.length;
    document.getElementById('detailAverageAmount').textContent = formatMoney(avg);
    document.getElementById('detailMaxAmount').textContent = formatMoney(max);

    // Заполняем список транзакций
    const list = document.getElementById('detailTransactionsList');
    list.innerHTML = '';

    categoryTransactions.slice(0, 20).forEach(t => {
        const date = new Date(t.date);
        const formattedDateTime = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const timeOnly = date.toLocaleString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const account = appState.accounts.find(a => a.id === t.accountId);
        const accountName = account ? (account.name.split(' ')[1] || account.name) : 'Основной';

        list.innerHTML += `
            <div class="detail-transaction-item" title="${formattedDateTime}">
                <div class="detail-transaction-date">
                    <div>${formattedDateTime.split(',')[0]}</div>
                    <div class="transaction-time">${timeOnly}</div>
                </div>
                <span class="detail-transaction-amount">${formatMoney(t.amount)}</span>
                <span class="detail-transaction-account">${accountName}</span>
            </div>
        `;
    });

    // Показываем модалку
    modal.style.display = 'flex';
}

function hideCategoryDetail() {
    const modal = document.getElementById('categoryDetailModal');
    if (modal) modal.style.display = 'none';
}
// ===== IOS PWA ХАК =====
(function() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;

    // Только для iOS PWA
    if (isIOS && isPWA) {
        console.log('🍎 iOS PWA режим: включаем принудительную синхронизацию');

        // Ключ для хранения
        const STORAGE_KEY = 'financeData';

        // Функция загрузки данных
        function loadFromBrowser() {
            try {
                // Пробуем получить данные через куки (единственный общий канал на iOS)
                const cookieData = document.cookie.replace(/(?:(?:^|.*;\s*)financeData\s*\=\s*([^;]*).*$)|^.*$/, "$1");

                if (cookieData) {
                    const parsed = JSON.parse(decodeURIComponent(cookieData));

                    // Сравниваем с текущими данными
                    if (JSON.stringify(parsed) !== JSON.stringify(appState)) {
                        console.log('🔄 Обновляем данные из cookies');
                        appState = parsed;
                        localStorage.setItem(STORAGE_KEY, cookieData);

                        if (typeof initializeAccounts === 'function') initializeAccounts();
                        if (typeof updateCategorySelector === 'function') updateCategorySelector();
                        if (typeof updateAnalyticsCategorySelector === 'function') updateAnalyticsCategorySelector();
                        if (typeof updateUI === 'function') updateUI();
                    }
                }
            } catch (e) {
                console.log('❌ Ошибка загрузки из cookies:', e);
            }
        }

        // Сохраняем данные в cookies при каждом изменении
        const originalSaveData = window.saveData;
        window.saveData = function() {
            if (originalSaveData) originalSaveData();

            // Дублируем в cookies (живут 7 дней)
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                document.cookie = 'financeData=' + encodeURIComponent(data) + '; path=/; max-age=604800';
                console.log('🍪 Данные сохранены в cookies');
            }
        };

        // При фокусе проверяем cookies
        window.addEventListener('focus', loadFromBrowser);

        // Проверяем каждые 3 секунды
        setInterval(loadFromBrowser, 3000);

        // Принудительная загрузка при старте
        setTimeout(loadFromBrowser, 1000);

        // Также сохраняем в localStorage Safari (для совместимости)
        window.addEventListener('finance-data-changed', () => {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                document.cookie = 'financeData=' + encodeURIComponent(data) + '; path=/; max-age=604800';
            }
        });
    } else if (isIOS) {
        // В Safari — сохраняем в cookies при изменении
        console.log('🍎 iOS Safari режим: сохраняем в cookies');

        window.addEventListener('finance-data-changed', () => {
            const data = localStorage.getItem('financeData');
            if (data) {
                document.cookie = 'financeData=' + encodeURIComponent(data) + '; path=/; max-age=604800';
            }
        });

        // Сохраняем и при старте
        const data = localStorage.getItem('financeData');
        if (data) {
            document.cookie = 'financeData=' + encodeURIComponent(data) + '; path=/; max-age=604800';
        }
    }
})();
// ===== ЗАГРУЗКА ВЫПИСОК ИЗ БАНКОВ =====
function showBankInstructions(bank) {
    const instructionsDiv = document.getElementById('bankInstructions');
    let html = '<div style="font-weight: 600; margin-bottom: 10px;">📋 Как скачать выписку:</div>';

    switch(bank) {
        case 'sber':
            html += `
                <div class="instruction-step">
                    <span class="step-number">1</span>
                    <span>Войдите в Сбербанк Онлайн</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">2</span>
                    <span>Перейдите в "История операций"</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">3</span>
                    <span>Выберите период и нажмите "Выгрузить"</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">4</span>
                    <span>Выберите формат CSV</span>
                </div>
            `;
            break;

        case 'tinkoff':
            html += `
                <div class="instruction-step">
                    <span class="step-number">1</span>
                    <span>Откройте приложение Тинькофф</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">2</span>
                    <span>Выберите счет → "Выписка"</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">3</span>
                    <span>Нажмите "Экспорт в CSV"</span>
                </div>
            `;
            break;

        case 'alfa':
            html += `
                <div class="instruction-step">
                    <span class="step-number">1</span>
                    <span>Войдите в Альфа-Клик</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">2</span>
                    <span>История → "Выгрузить в Excel/CSV"</span>
                </div>
            `;
            break;

        case 'vtb':
            html += `
                <div class="instruction-step">
                    <span class="step-number">1</span>
                    <span>Войдите в ВТБ Онлайн</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">2</span>
                    <span>История операций → "Экспорт"</span>
                </div>
                <div class="instruction-step">
                    <span class="step-number">3</span>
                    <span>Выберите формат CSV</span>
                </div>
            `;
            break;
    }

    html += `
        <div style="margin-top: 15px; font-size: 12px; color: var(--hint-color);">
            После скачивания нажмите "Загрузить выписку CSV"
        </div>
    `;

    instructionsDiv.innerHTML = html;
    instructionsDiv.style.display = 'block';
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const csvText = e.target.result;

        // Определяем банк по имени файла и содержимому
        let bankName = getBankNameFromFile(file.name, csvText);

        // Если не определили, спрашиваем пользователя
        if (!bankName) {
            bankName = prompt('Не удалось определить банк. Введите название банка:', 'Сбербанк');
            if (!bankName) return;
        }

        // Создаем или получаем счет для этого банка
        const accountId = createBankAccount(bankName);

        // Делаем этот счет активным
        setActiveAccount(accountId);

        // Парсим CSV и импортируем операции
        parseCSV(csvText, accountId, bankName);
    };

    reader.readAsText(file);
}

function parseCSV(csvText, accountId, bankName) {
    // Показываем прогресс
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importProgressBar').style.width = '0%';

    // Разбиваем на строки
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    console.log('📊 Заголовки CSV:', headers);

    // Определяем индексы колонок (для разных банков)
    let dateIndex = -1;
    let descIndex = -1;
    let amountIndex = -1;

    // Ищем по ключевым словам
    headers.forEach((header, index) => {
        if (header.includes('date') || header.includes('дата') || header.includes('дд.мм.гггг')) {
            dateIndex = index;
        }
        if (header.includes('desc') || header.includes('описание') || header.includes('назначение') ||
            header.includes('комментарий') || header.includes('comment')) {
            descIndex = index;
        }
        if (header.includes('amount') || header.includes('сумма') || header.includes('debet') ||
            header.includes('credit') || header.includes('дебет') || header.includes('кредит')) {
            amountIndex = index;
        }
    });

    // Если не нашли, пробуем по позициям (часто в банковских выписках)
    if (dateIndex === -1 && headers.length > 0) dateIndex = 0;
    if (descIndex === -1 && headers.length > 1) descIndex = 1;
    if (amountIndex === -1 && headers.length > 2) amountIndex = 2;

    let imported = 0;
    let errors = 0;
    let totalAmount = 0;

    // Обрабатываем каждую строку
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        try {
            const values = parseCSVLine(lines[i]);

            // Проверяем, что хватает колонок
            if (values.length <= Math.max(dateIndex, descIndex, amountIndex)) continue;

            // Парсим дату
            let date = new Date();
            if (dateIndex >= 0 && values[dateIndex]) {
                const dateStr = values[dateIndex].replace(/"/g, '');

                // Пробуем разные форматы дат
                let parsedDate = null;

                // DD.MM.YYYY
                if (dateStr.includes('.')) {
                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        parsedDate = new Date(parts[2], parts[1]-1, parts[0]);
                    }
                }
                // YYYY-MM-DD
                else if (dateStr.includes('-')) {
                    parsedDate = new Date(dateStr);
                }

                if (parsedDate && !isNaN(parsedDate)) {
                    date = parsedDate;
                }
            }

            // Парсим сумму
            let amount = 0;
            if (amountIndex >= 0 && values[amountIndex]) {
                let amountStr = values[amountIndex].replace(/"/g, '').replace(/\s/g, '');

                // Убираем пробелы и заменяем запятую на точку
                amountStr = amountStr.replace(/\s/g, '').replace(',', '.');

                // Убираем символы валют
                amountStr = amountStr.replace(/[₽$€]/g, '');

                // Определяем знак (дебет/кредит)
                let sign = 1;
                if (amountStr.includes('-')) {
                    sign = -1;
                    amountStr = amountStr.replace('-', '');
                }

                // Проверяем отдельные колонки для дебета и кредита
                if (headers[amountIndex].includes('debet') || headers[amountIndex].includes('дебет')) {
                    sign = -1; // Дебет = расход
                } else if (headers[amountIndex].includes('credit') || headers[amountIndex].includes('кредит')) {
                    sign = 1; // Кредит = доход
                }

                amount = parseFloat(amountStr) || 0;
                amount *= sign;
            }

            if (amount === 0) continue;

            // Описание
            let description = '';
            if (descIndex >= 0 && values[descIndex]) {
                description = values[descIndex].replace(/"/g, '').trim();
            }

            if (!description) {
                description = `Операция ${date.toLocaleDateString()}`;
            }

            // Создаем транзакцию
            const transaction = {
                id: Date.now() + imported,
                accountId: accountId,
                type: amount > 0 ? 'income' : 'expense',
                amount: Math.abs(amount),
                category: detectCategoryFromDescription(description),
                description: description,
                date: date.toISOString()
            };

            appState.transactions.push(transaction);

            // Обновляем баланс счета
            const account = appState.accounts.find(a => a.id === accountId);
            if (account) {
                account.balance += amount;
                totalAmount += amount;
            }

            imported++;

            // Обновляем прогресс
            document.getElementById('importCount').textContent = imported;
            const percent = (i / lines.length) * 100;
            document.getElementById('importProgressBar').style.width = percent + '%';

        } catch (e) {
            errors++;
            console.log('Ошибка парсинга строки:', e, lines[i]);
        }
    }

    // Сохраняем и обновляем
    saveData();
    updateUI();

    // Показываем результат
    setTimeout(() => {
        document.getElementById('importProgress').style.display = 'none';

        const totalFormatted = formatMoney(Math.abs(totalAmount));
        const sign = totalAmount >= 0 ? 'пополнение' : 'списание';

        alert(`✅ Импорт из ${bankName} завершен!\n\n` +
              `📊 Добавлено: ${imported} операций\n` +
              `💰 Баланс: ${sign === 'пополнение' ? '+' : '-'}${totalFormatted}\n` +
              `📁 Счет: ${bankName}`);
    }, 500);
}

// ===== ИМПОРТ ИЗ PDF =====
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Показываем прогресс
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importProgressBar').style.width = '0%';
    document.getElementById('importCount').textContent = 'Чтение PDF...';

    try {
        // Читаем PDF файл
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        // Проходим по всем страницам
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';

            // Обновляем прогресс
            const percent = (i / pdf.numPages) * 100;
            document.getElementById('importProgressBar').style.width = percent + '%';
            document.getElementById('importCount').textContent = `Страница ${i} из ${pdf.numPages}`;
        }

        // Определяем банк по тексту
        const bankName = detectBankFromPDF(fullText);

        // Создаем счет для банка
        const accountId = createBankAccount(bankName);
        setActiveAccount(accountId);

        // Парсим транзакции из текста
        const transactions = parsePDFText(fullText, bankName);

        // Импортируем транзакции
        await importPDFTransactions(transactions, accountId);

    } catch (error) {
        console.error('Ошибка при чтении PDF:', error);
        alert('❌ Не удалось прочитать PDF файл. Убедитесь, что это выписка из банка.');
    }
}

function detectBankFromPDF(text) {
    text = text.toLowerCase();

    if (text.includes('сбербанк') || text.includes('sberbank')) {
        return 'Сбербанк';
    }
    if (text.includes('тинькофф') || text.includes('tinkoff')) {
        return 'Tinkoff';
    }
    if (text.includes('альфа') || text.includes('alfa')) {
        return 'Альфа-Банк';
    }
    if (text.includes('втб') || text.includes('vtb')) {
        return 'ВТБ';
    }
    if (text.includes('райффайзен') || text.includes('raiffeisen')) {
        return 'Райффайзен';
    }

    return 'Банк (неизвестный)';
}

function parsePDFText(text, bankName) {
    const lines = text.split('\n');
    const transactions = [];

    // Регулярные выражения для поиска транзакций
    const dateRegex = /\d{2}[\.\/]\d{2}[\.\/]\d{2,4}/g; // 01.01.2024
    const amountRegex = /[\+\-]?\s*[\d\s]+[.,]\d{2}\s*[₽$€]?/g;

    let currentDate = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Ищем дату
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            currentDate = dateMatch[0];
        }

        // Ищем сумму
        const amountMatch = line.match(amountRegex);
        if (amountMatch && currentDate) {
            let amountStr = amountMatch[0].replace(/\s/g, '').replace(',', '.').replace(/[₽$€]/g, '');
            let amount = parseFloat(amountStr) || 0;

            // Определяем знак (дебет/кредит)
            if (line.includes('дебет') || line.includes('списание') || amount < 0) {
                amount = -Math.abs(amount);
            } else if (line.includes('кредит') || line.includes('поступление')) {
                amount = Math.abs(amount);
            }

            if (amount !== 0) {
                transactions.push({
                    date: currentDate,
                    description: line.substring(0, 50),
                    amount: amount
                });
            }
        }
    }

    return transactions;
}

async function importPDFTransactions(transactions, accountId) {
    if (transactions.length === 0) {
        alert('❌ Не найдено транзакций в PDF. Возможно, неверный формат.');
        return;
    }

    let imported = 0;
    let totalAmount = 0;

    document.getElementById('importCount').textContent = `0/${transactions.length}`;

    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];

        // Парсим дату
        let date = new Date();
        if (t.date) {
            const parts = t.date.split(/[\.\/]/);
            if (parts.length === 3) {
                let day = parseInt(parts[0]);
                let month = parseInt(parts[1]) - 1;
                let year = parseInt(parts[2]);
                if (year < 100) year += 2000;
                date = new Date(year, month, day);
            }
        }

        // Создаем транзакцию
        const transaction = {
            id: Date.now() + imported,
            accountId: accountId,
            type: t.amount > 0 ? 'income' : 'expense',
            amount: Math.abs(t.amount),
            category: detectCategoryFromDescription(t.description),
            description: t.description,
            date: date.toISOString()
        };

        appState.transactions.push(transaction);

        // Обновляем баланс
        const account = appState.accounts.find(a => a.id === accountId);
        if (account) {
            account.balance += t.amount;
            totalAmount += t.amount;
        }

        imported++;

        // Обновляем прогресс
        document.getElementById('importCount').textContent = `${imported}/${transactions.length}`;
        document.getElementById('importProgressBar').style.width = (imported / transactions.length) * 100 + '%';
    }

    // Сохраняем и обновляем
    saveData();
    updateUI();

    // Показываем результат
    setTimeout(() => {
        document.getElementById('importProgress').style.display = 'none';

        const totalFormatted = formatMoney(Math.abs(totalAmount));
        const sign = totalAmount >= 0 ? 'пополнение' : 'списание';

        alert(`✅ Импорт завершен!\n\n` +
              `📊 Добавлено: ${imported} операций\n` +
              `💰 Общий баланс: ${totalAmount >= 0 ? '+' : '-'}${totalFormatted}`);
    }, 500);
}
// Дополнительные форматы для разных банков
function parseSberPDF(text) {
    // Специфичный парсинг для Сбера
    const lines = text.split('\n');
    const transactions = [];

    for (let line of lines) {
        // Пример: "01.03.2024 Покупка Пятерочка 1 500.00₽"
        const match = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+(\d[\d\s]*[.,]\d{2})[₽$€]?/);
        if (match) {
            transactions.push({
                date: match[1],
                description: match[2],
                amount: -parseFloat(match[3].replace(/\s/g, '').replace(',', '.'))
            });
        }
    }

    return transactions;
}

function parseTinkoffPDF(text) {
    // Специфичный парсинг для Тинькофф
    const transactions = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        // Тинькофф часто использует таблицы
        if (lines[i].includes('₽') && lines[i].match(/\d{2}\.\d{2}/)) {
            // Логика парсинга
        }
    }

    return transactions;
}
function parseCSVLine(line) {
    // Простой парсер CSV (учитывает кавычки)
    const result = [];
    let inQuotes = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

function getBankNameFromFile(fileName, csvText) {
    const name = fileName.toLowerCase();
    const text = csvText.toLowerCase();

    // Определяем банк по имени файла или содержимому
    if (name.includes('sber') || name.includes('сбер') || text.includes('сбербанк') || text.includes('sberbank')) {
        return 'Сбербанк';
    }
    if (name.includes('tinkoff') || name.includes('тинькофф') || text.includes('tinkoff') || text.includes('тинькофф')) {
        return 'Tinkoff';
    }
    if (name.includes('alfa') || name.includes('альфа') || text.includes('alfa') || text.includes('альфа')) {
        return 'Альфа-Банк';
    }
    if (name.includes('vtb') || name.includes('втб') || text.includes('vtb') || text.includes('втб')) {
        return 'ВТБ';
    }
    if (name.includes('raiffeisen') || name.includes('райффайзен') || text.includes('raiffeisen')) {
        return 'Райффайзен';
    }
    if (name.includes('gazprom') || name.includes('газпром') || text.includes('gazprombank')) {
        return 'Газпромбанк';
    }
    if (name.includes('otkritie') || name.includes('открытие') || text.includes('otkritie')) {
        return 'Банк Открытие';
    }
    if (name.includes('pochta') || name.includes('почта') || text.includes('pochta')) {
        return 'Почта Банк';
    }

    return null;
}

function createBankAccount(bankName) {
    // Иконки для разных банков
    const bankIcons = {
        'Сбербанк': '🏦',
        'Tinkoff': '💳',
        'Альфа-Банк': '🏛️',
        'ВТБ': '🏢',
        'Райффайзен': '🇦🇹',
        'Газпромбанк': '⛽',
        'Банк Открытие': '🔓',
        'Почта Банк': '📮'
    };

    // Цвета для разных банков
    const bankColors = {
        'Сбербанк': '#3CB371',  // зеленый
        'Tinkoff': '#FFDD00',    // желтый
        'Альфа-Банк': '#E31B23', // красный
        'ВТБ': '#003C7F',        // синий
        'Райффайзен': '#FDB913', // желтый
        'Газпромбанк': '#1B4F9E', // синий
        'Банк Открытие': '#00AEEF', // голубой
        'Почта Банк': '#660099'   // фиолетовый
    };

    // Проверяем, есть ли уже такой счет
    let existingAccount = appState.accounts.find(a => a.name.includes(bankName));

    if (existingAccount) {
        return existingAccount.id;
    }

    // Создаем новый счет для банка
    const newAccount = {
        id: 'bank_' + bankName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
        name: `${bankIcons[bankName] || '🏦'} ${bankName}`,
        type: 'debit',
        balance: 0,
        currency: 'RUB',
        icon: bankIcons[bankName] || '🏦',
        color: bankColors[bankName] || '#808080',
        isBank: true
    };

    appState.accounts.push(newAccount);

    // Обновляем интерфейс
    updateAccountSelector();
    updateAccountsSummary();
    saveData();

    console.log(`✅ Создан счет для банка: ${newAccount.name}`);
    return newAccount.id;
}

function detectCategoryFromDescription(text) {
    text = text.toLowerCase();

    // Категории расходов
    if (text.includes('пятерочка') || text.includes('магнит') || text.includes('перекресток') ||
        text.includes('продукт') || text.includes('еда') || text.includes('food')) {
        return 'food';
    }

    if (text.includes('аптека') || text.includes('здоровье') || text.includes('лекар')) {
        return 'health';
    }

    if (text.includes('такси') || text.includes('uber') || text.includes('яндекс') ||
        text.includes('metro') || text.includes('транспорт')) {
        return 'transport';
    }

    if (text.includes('одежда') || text.includes('zara') || text.includes('h&m')) {
        return 'clothes';
    }

    if (text.includes('ресторан') || text.includes('кафе') || text.includes('кофе')) {
        return 'food';
    }

    if (text.includes('кино') || text.includes('театр') || text.includes('клуб')) {
        return 'entertainment';
    }

    if (text.includes('мтс') || text.includes('билайн') || text.includes('мегафон')) {
        return 'communication';
    }

    if (text.includes('авито') || text.includes('avito')) {
        return 'other_expense';
    }

    // Категории доходов
    if (text.includes('зарплата') || text.includes('аванс')) {
        return 'salary';
    }

    if (text.includes('перевод')) {
        return 'transfer';
    }

    return 'other_expense';
}