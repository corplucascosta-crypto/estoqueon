// Estoque-On - Main Application
// As variáveis globais já estão definidas em supabase.js

function showNotification(msg, type) {
    console.log(msg);
}

function switchView(viewName) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewName + 'View');
    if (target) target.classList.add('active');
}

function updateUI() {
    const adminOnly = document.querySelectorAll('.admin-only');
    const managerOnly = document.querySelectorAll('.manager-only');
    if (currentUser) {
        if (currentUser.role === 'admin') {
            adminOnly.forEach(el => el.style.display = 'block');
            managerOnly.forEach(el => el.style.display = 'block');
        } else if (currentUser.role === 'manager') {
            adminOnly.forEach(el => el.style.display = 'none');
            managerOnly.forEach(el => el.style.display = 'block');
        } else {
            adminOnly.forEach(el => el.style.display = 'none');
            managerOnly.forEach(el => el.style.display = 'none');
        }
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('loginBtn').style.display = 'none';
    } else {
        adminOnly.forEach(el => el.style.display = 'none');
        managerOnly.forEach(el => el.style.display = 'none');
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
    }
}

async function initializeSystem() {
    console.log('Sistema iniciando');
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAdmin = currentUser.role === 'admin';
            document.querySelector('.navbar-nav').classList.add('visible');
        } catch(e) {}
    }
    updateUI();
    if (currentUser) switchView('counting');
}

function setupEventListeners() {
    document.querySelectorAll('.view-switch').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(el.getAttribute('data-view'));
        });
    });
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matricula = document.getElementById('matricula').value;
        const senha = document.getElementById('password').value;
        if (matricula === 'admin' && senha === 'admin123') {
            currentUser = { id: '1', full_name: 'Administrador', role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.querySelector('.navbar-nav').classList.add('visible');
            updateUI();
            switchView('counting');
            showNotification('Login realizado', 'success');
        } else {
            showNotification('Credenciais invalidas', 'error');
        }
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        document.querySelector('.navbar-nav').classList.remove('visible');
        updateUI();
        switchView('login');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    setupEventListeners();
});