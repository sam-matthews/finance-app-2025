// API helper
const api = async (path, opts = {}) => {
    const res = await fetch(path, opts);
    try {
        const data = await res.json();
        return data;
    } catch (e) {
        return { ok: false, error: 'Invalid JSON response' };
    }
};

// Token management
const setToken = (t) => localStorage.setItem('token', t);
const getToken = () => localStorage.getItem('token');
const setResetToken = (t) => localStorage.setItem('resetToken', t);
const getResetToken = () => localStorage.getItem('resetToken');

const headersWithAuth = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + getToken(),
});

// Initialize views
document.getElementById('auth').style.display = 'block';
document.getElementById('entry').style.display = 'none';

// Event handlers
document.addEventListener('DOMContentLoaded', () => {
    setupResetPassword();
    setupRegister();
    setupLogin();
    setupExpense();
    setupReport();
    setupNavigation();
});

function setupResetPassword() {
    const resetSection = document.getElementById('reset-password-section');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnResetPassword = document.getElementById('btn-reset-password');

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', handleForgotPassword);
    }

    if (btnResetPassword) {
        btnResetPassword.addEventListener('click', handleResetPassword);
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('email')?.value;
    
    if (!email) {
        document.getElementById('auth-message').innerText = 'Please enter your email';
        return;
    }

    try {
        const response = await api('/api/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.token) {
            setResetToken(response.token);
            document.getElementById('reset-password-section').style.display = 'block';
            document.getElementById('reset-message').innerText = 
                `Your reset token is: ${response.token}\n\nPlease enter this token and your new password below.`;
            document.getElementById('auth-message').innerText = response.message;
        } else {
            document.getElementById('auth-message').innerText = response.message;
        }
    } catch (error) {
        document.getElementById('auth-message').innerText = 'Reset request failed';
    }
}

async function handleResetPassword() {
    const token = document.getElementById('reset-token')?.value;
    const newPassword = document.getElementById('new-password')?.value;

    if (!token || !newPassword) {
        document.getElementById('reset-message').innerText = 'Token and new password are required';
        return;
    }

    try {
        const response = await api('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });

        if (response.message) {
            document.getElementById('reset-message').innerText = 'Password reset successful. Please login with your new password.';
            document.getElementById('reset-password-section').style.display = 'none';
            localStorage.removeItem('resetToken');
        }
    } catch (error) {
        document.getElementById('reset-message').innerText = 'Password reset failed';
    }
}

function setupRegister() {
    const btnRegister = document.getElementById('btn-register');
    if (btnRegister) {
        btnRegister.addEventListener('click', handleRegister);
    }
}

async function handleRegister() {
    const email = document.getElementById('email')?.value || '';
    const password = document.getElementById('password')?.value || '';

    if (!email || !password) {
        document.getElementById('auth-message').innerText = 'Email and password are required';
        return;
    }

    try {
        const res = await api('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res && res.ok) {
            setToken(res.token);
            onLoggedIn();
        } else {
            document.getElementById('auth-message').innerText = res.error || 'Registration failed';
        }
    } catch (err) {
        document.getElementById('auth-message').innerText = 'Network error';
    }
}

function setupLogin() {
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', handleLogin);
    }
}

async function handleLogin() {
    const email = document.getElementById('email')?.value || '';
    const password = document.getElementById('password')?.value || '';

    if (!email || !password) {
        document.getElementById('auth-message').innerText = 'Email and password are required';
        return;
    }

    try {
        const res = await api('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res && res.ok) {
            setToken(res.token);
            onLoggedIn();
        } else {
            document.getElementById('auth-message').innerText = res.error || 'Login failed';
        }
    } catch (err) {
        document.getElementById('auth-message').innerText = 'Network error';
    }
}

function onLoggedIn() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('entry').style.display = 'block';
    // Load lookup data after successful login
    loadExpenseTypes();
    loadAccounts();
}

function setupExpense() {
    const btnAdd = document.getElementById('btn-add');
    if (btnAdd) {
        btnAdd.addEventListener('click', handleAddExpense);
    }
}

async function loadExpenseTypes() {
    try {
        const res = await api('/api/expense-types', {
            method: 'GET',
            headers: headersWithAuth(),
        });
        console.log('Expense Types Response:', res); // Debug log

        if (res && res.ok) {
            const select = document.getElementById('expense-type');
            res.types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                option.title = type.description;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Failed to load expense types:', err);
    }
}

async function loadAccounts() {
    try {
        const res = await api('/api/accounts', {
            method: 'GET',
            headers: headersWithAuth(),
        });
        console.log('Accounts Response:', res); // Debug log

        if (res && res.ok) {
            const select = document.getElementById('account');
            res.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                option.title = account.description;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Failed to load accounts:', err);
    }
}

async function handleAddExpense() {
    const date = document.getElementById('date')?.value || '';
    const description = document.getElementById('description')?.value || '';
    const category = document.getElementById('category')?.value || '';
    const typeId = document.getElementById('expense-type')?.value || '';
    const accountId = document.getElementById('account')?.value || '';
    const amountRaw = document.getElementById('amount')?.value || '';
    const amount = parseFloat(amountRaw || 0);

    const msgEl = document.getElementById('expense-message');

    if (!date || !amount || !typeId || !accountId) {
        if (msgEl) msgEl.innerText = 'Date, amount, expense type, and account are required';
        return;
    }

    try {
        const data = { 
            date, 
            description, 
            category, 
            amount,
            type_id: parseInt(typeId),
            account_id: parseInt(accountId)
        };
        console.log('Sending expense data:', data);  // Debug log
        
        const res = await api('/api/expenses', {
            method: 'POST',
            headers: headersWithAuth(),
            body: JSON.stringify(data),
        });

        if (res && res.ok) {
            if (msgEl) {
                msgEl.innerText = 'Expense added successfully!';
                msgEl.style.color = 'green';
            }
            // Clear inputs
            document.getElementById('date').value = '';
            document.getElementById('description').value = '';
            document.getElementById('category').value = '';
            document.getElementById('expense-type').value = '';
            document.getElementById('account').value = '';
            document.getElementById('amount').value = '';
        } else {
            if (msgEl) {
                msgEl.innerText = res.error || 'Failed to add expense';
                msgEl.style.color = 'red';
            }
        }
    } catch (err) {
        if (msgEl) msgEl.innerText = 'Network error while adding expense';
    }
}

function setupReport() {
    const btnReport = document.getElementById('btn-report');
    if (btnReport) {
        btnReport.addEventListener('click', handleGetReport);
    }
}

async function handleGetReport() {
    try {
        const res = await api('/api/report', {
            method: 'GET',
            headers: headersWithAuth(),
        });

        const out = document.getElementById('report');
        if (!out) return;

        if (res && res.data) {
            let html = `<h3>Report (${res.from} -> ${res.to})</h3><ul>`;
            res.data.forEach((d) => {
                html += `<li>${d.category}: $${parseFloat(d.total).toFixed(2)}</li>`;
            });
            html += '</ul>';
            out.innerHTML = html;
        } else {
            out.innerText = res.error || 'No data';
        }
    } catch (err) {
        const out = document.getElementById('report');
        if (out) out.innerText = 'Network error while fetching report';
    }
}

function setupNavigation() {
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', handleBack);
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
}

function handleBack() {
    document.getElementById('auth').style.display = 'block';
    document.getElementById('entry').style.display = 'none';
}

function handleLogout() {
    localStorage.removeItem('token');
    document.getElementById('auth').style.display = 'block';
    document.getElementById('entry').style.display = 'none';
    // Clear any displayed messages and input fields
    document.getElementById('auth-message').innerText = '';
    document.getElementById('expense-message').innerText = '';
    document.getElementById('report').innerText = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
}
