// =============================================
// UTILITY FUNCTIONS - Helpers
// =============================================

// Notificações DESATIVADAS em tela - apenas console
function showNotification(message, type = 'info') {
    // Apenas log no console - sem elementos visuais na tela
    if (type === 'error') {
        console.error(`[ERRO] ${message}`);
    } else if (type === 'warning') {
        console.warn(`[AVISO] ${message}`);
    } else if (type === 'success') {
        console.log(`[SUCESSO] ${message}`);
    } else {
        console.log(`[INFO] ${message}`);
    }
}

// Role badge classes (mantido)
function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'bg-danger',
        'manager': 'bg-warning',
        'user': 'bg-info'
    };
    return classes[role] || 'bg-secondary';
}

// Role color classes (mantido)
function getRoleColorClass(role) {
    const classes = {
        'admin': 'text-danger',
        'manager': 'text-warning',
        'user': 'text-info'
    };
    return classes[role] || 'text-secondary';
}

// Role icons (mantido)
function getRoleIcon(role) {
    const icons = {
        'admin': 'fa-shield-alt',
        'manager': 'fa-user-tie',
        'user': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

// Role display names (mantido)
function getRoleDisplayName(role) {
    const names = {
        'admin': 'Administrador',
        'manager': 'Gerente',
        'user': 'Usuário'
    };
    return names[role] || role;
}

// Update UI based on user role (mantido)
function updateUI() {
    checkAdminStatus();
    updateUserStatus();
}

// Check admin status and show/hide elements (mantido)
function checkAdminStatus() {
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const managerOnlyElements = document.querySelectorAll('.manager-only');
    
    if (currentUser) {
        if (currentUser.role === 'admin') {
            adminOnlyElements.forEach(el => {
                el.style.display = 'block';
                el.style.setProperty('display', 'block', 'important');
            });
            managerOnlyElements.forEach(el => {
                el.style.display = 'block';
                el.style.setProperty('display', 'block', 'important');
            });
        } else if (currentUser.role === 'manager' || currentUser.role === 'user') {
            adminOnlyElements.forEach(el => el.style.display = 'none');
            managerOnlyElements.forEach(el => {
                el.style.display = 'block';
                el.style.setProperty('display', 'block', 'important');
            });
        } else {
            adminOnlyElements.forEach(el => el.style.display = 'none');
            managerOnlyElements.forEach(el => el.style.display = 'none');
        }
        const logoutBtn = document.getElementById('logoutBtn');
        const loginBtn = document.getElementById('loginBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
    } else {
        adminOnlyElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        managerOnlyElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        const logoutBtn = document.getElementById('logoutBtn');
        const loginBtn = document.getElementById('loginBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
    }
}

// Update user status display (mantido)
function updateUserStatus() {
    const userStatus = document.getElementById('userStatus');
    const userName = document.getElementById('userName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    
    if (currentUser && userStatus) {
        userName.textContent = currentUser.full_name;
        userRoleBadge.textContent = getRoleDisplayName(currentUser.role);
        userRoleBadge.className = `user-role-badge badge ${getRoleBadgeClass(currentUser.role)}`;
        userStatus.style.display = 'block';
    } else if (userStatus) {
        userStatus.style.display = 'none';
    }
}

// Switch between views (mantido)
async function switchView(viewName) {
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });
    
    document.querySelectorAll('.view-switch').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.classList.add('active');
        
        const activeLink = document.querySelector(`.view-switch[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        switch(viewName) {
            case 'counting':
                setTimeout(() => {
                    const itemCodeInput = document.getElementById('itemCode');
                    if (itemCodeInput) itemCodeInput.focus();
                }, 100);
                break;
            case 'history':
                if (typeof renderInventoryTable === 'function') {
                    renderInventoryTable();
                }
                if (typeof updateSummary === 'function') {
                    updateSummary();
                }
                break;
            case 'dashboard':
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
                break;
            case 'users':
                if (typeof loadUsers === 'function') {
                    loadUsers();
                }
                break;
            case 'adminHistory':
                console.log('📊 Carregando histórico geral...');
                if (typeof loadAllInventoryData === 'function') {
                    await loadAllInventoryData();
                }
                if (typeof loadAdminUserFilter === 'function') {
                    await loadAdminUserFilter();
                }
                break;
            default:
                console.log('View carregada:', viewName);
        }
    } else {
        console.warn('View não encontrada:', viewName + 'View');
    }
}

// Handle view switch event (mantido)
function handleViewSwitch(e) {
    e.preventDefault();
    const targetView = this.getAttribute('data-view');
    if (targetView) {
        switchView(targetView);
    }
}

// Exportar funções globais
window.showNotification = showNotification;
window.getRoleBadgeClass = getRoleBadgeClass;
window.getRoleColorClass = getRoleColorClass;
window.getRoleIcon = getRoleIcon;
window.getRoleDisplayName = getRoleDisplayName;
window.updateUI = updateUI;
window.checkAdminStatus = checkAdminStatus;
window.updateUserStatus = updateUserStatus;
window.switchView = switchView;
window.handleViewSwitch = handleViewSwitch;

console.log('✅ helpers.js carregado');