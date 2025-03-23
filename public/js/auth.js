let authToken = localStorage.getItem('authToken');
let currentUser = localStorage.getItem('currentUser');

async function signup(username, email, password) {
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) throw new Error('Signup failed');
        
        const data = await response.json();
        authToken = data.token;
        currentUser = data.username;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', currentUser);
        
        return true;
    } catch (error) {
        console.error('Signup error:', error);
        return false;
    }
}

async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) throw new Error('Login failed');
        
        const data = await response.json();
        authToken = data.token;
        currentUser = data.username;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', currentUser);
        
        updateNavbar();
        return true;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateNavbar();
    window.location.href = '/';
}

function isAuthenticated() {
    return !!authToken;
}
