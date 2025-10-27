// Lightweight API helper
const api = async (path, opts = {}) => {
    const res = await fetch(path, opts);
    // Try to parse JSON safely
    try {
        const data = await res.json();
        return data;
    } catch (e) {
        return { ok: false, error: 'Invalid JSON response' };
    }
};

const setToken = (t) => localStorage.setItem('token', t);
const getToken = () => localStorage.getItem('token');
const setResetToken = (t) => localStorage.setItem('resetToken', t);
const getResetToken = () => localStorage.getItem('resetToken');

const headersWithAuth = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + getToken(),
});

// Debug logging for inputs
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
if (emailInput) {
    emailInput.addEventListener('input', (e) => {
        console.log('email input:', e.target.value);
    });
}
if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
        const masked = '*'.repeat(e.target.value.length);
        console.log('password input length:', e.target.value.length, 'masked:', masked);
    });
}

// Reset Password Section
const resetSection = document.getElementById('reset-password-section');
const btnForgotPassword = document.getElementById('btn-forgot-password');
const btnResetPassword = document.getElementById('btn-reset-password');

if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async () => {
        console.log('Forgot password clicked');
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
                resetSection.style.display = 'block';
                document.getElementById('reset-message').innerText = 
                    `Your reset token is: ${response.token}\n\nPlease enter this token and your new password below.`;
                document.getElementById('auth-message').innerText = response.message;
            } else {
                document.getElementById('auth-message').innerText = response.message;
            }
        } catch (error) {
            document.getElementById('auth-message').innerText = 'Reset request failed';
        }
    });
}

if (btnResetPassword) {
    btnResetPassword.addEventListener('click', async () => {
        console.log('Reset password clicked');
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
                resetSection.style.display = 'none';
                localStorage.removeItem('resetToken');
            }
        } catch (error) {
            document.getElementById('reset-message').innerText = 'Password reset failed';
        }
    });
}

// Register
const btnRegister = document.getElementById('btn-register');
if (btnRegister) {
    // log click to ensure handler is attached
    btnRegister.addEventListener('click', async (ev) => {
        console.log('btn-register clicked', ev);
        const email = document.getElementById('email')?.value || '';
        const password = document.getElementById('password')?.value || '';

        console.log('Register attempt', { email });

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

            console.log('Register response', res);

            if (res && res.ok) {
                setToken(res.token);
                onLoggedIn();
            } else {
                document.getElementById('auth-message').innerText = res.error || 'Registration failed';
            }
        } catch (err) {
            console.error(err);
            document.getElementById('auth-message').innerText = 'Network error';
        }
    });
}

// Login
const btnLogin = document.getElementById('btn-login');
if (btnLogin) {
    btnLogin.addEventListener('click', async (ev) => {
        console.log('btn-login clicked', ev);
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

            console.log('Login response', res);

            if (res && res.ok) {
                setToken(res.token);
                onLoggedIn();
            } else {
                document.getElementById('auth-message').innerText = res.error || 'Login failed';
            }
        } catch (err) {
            console.error(err);
            document.getElementById('auth-message').innerText = 'Network error';
        }
    });
}

function onLoggedIn() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('entry').style.display = 'block';
}

// Add expense
const btnAdd = document.getElementById('btn-add');
if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
        const date = document.getElementById('date')?.value || '';
        const description = document.getElementById('description')?.value || '';
        const category = document.getElementById('category')?.value || '';
        const amountRaw = document.getElementById('amount')?.value || '';
        const amount = parseFloat(amountRaw || 0);

        const msgEl = document.getElementById('expense-message');

        if (!date || !amount) {
            if (msgEl) msgEl.innerText = 'Date and amount are required';
            return;
        }

        try {
            const res = await api('/api/expenses', {
                method: 'POST',
                headers: headersWithAuth(),
                body: JSON.stringify({ date, description, category, amount }),
            });

            console.log('Add expense response', res);

            if (res && res.ok) {
                if (msgEl) {
                    msgEl.innerText = 'Expense added successfully!';
                    msgEl.style.color = 'green';
                }
                // Clear inputs
                document.getElementById('date').value = '';
                document.getElementById('description').value = '';
                document.getElementById('category').value = '';
                document.getElementById('amount').value = '';
            } else {
                if (msgEl) {
                    msgEl.innerText = res.error || 'Failed to add expense';
                    msgEl.style.color = 'red';
                }
            }
        } catch (err) {
            console.error(err);
            if (msgEl) msgEl.innerText = 'Network error while adding expense';
        }
    });
}

// Report
const btnReport = document.getElementById('btn-report');
if (btnReport) {
    btnReport.addEventListener('click', async () => {
        try {
            const res = await api('/api/report', {
                method: 'GET',
                headers: headersWithAuth(),
            });

            console.log('Report response', res);

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
            console.error(err);
            const out = document.getElementById('report');
            if (out) out.innerText = 'Network error while fetching report';
        }
    });
}

// Back button handler
const btnBack = document.getElementById('btn-back');
if (btnBack) {
    btnBack.addEventListener('click', () => {
        document.getElementById('auth').style.display = 'block';
        document.getElementById('entry').style.display = 'none';
    });
}

// Logout button handler
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token'); // Clear the auth token
        document.getElementById('auth').style.display = 'block';
        document.getElementById('entry').style.display = 'none';
        // Clear any displayed messages and input fields
        document.getElementById('auth-message').innerText = '';
        document.getElementById('expense-message').innerText = '';
        document.getElementById('report').innerText = '';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    });
}

// Show auth screen by default
document.getElementById('auth').style.display = 'block';
document.getElementById('entry').style.display = 'none';
