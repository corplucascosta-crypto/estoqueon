// =============================================
// UTILITY FUNCTIONS - Helpers
// =============================================

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (type === 'error') {
        console.error(message);
    } else if (type === 'warning') {
        console.warn(message);
    }
// Notificações discretas - não bloqueiam a visualização
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Criar notificação discreta no canto superior direito
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 m-3 p-2 rounded shadow-sm';
    toast.style.zIndex = 9999;
    toast.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
    toast.style.color = 'white';
    toast.style.fontSize = '0.7rem';
    toast.style.maxWidth = '250px';
    toast.style.opacity = '0.85';
    toast.style.borderRadius = '6px';
    toast.style.padding = '5px 10px';
    toast.style.pointerEvents = 'none';
    toast.style.fontWeight = '500';
    
    // Ícone conforme o tipo
    let icon = '';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✗';
    else if (type === 'warning') icon = '!';
    else icon = 'ℹ';
    
    toast.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(toast);
    
    // Remover após 2 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'bg-danger',
        'manager': 'bg-warning',
        'user': 'bg-info'
    };
    return classes[role] || 'bg-secondary';
}

function getRoleColorClass(role) {
    const classes = {
        'admin': 'text-danger',
        'manager': 'text-warning',
        'user': 'text-info'
    };
    return classes[role] || 'text-secondary';
}

function getRoleIcon(role) {
    const icons = {
        'admin': 'fa-shield-alt',
        'manager': 'fa-user-tie',
        'user': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

function getRoleDisplayName(role) {
    const names = {
        'admin': 'Administrador',
        'manager': 'Gerente',
        'user': 'Usuário'
    };
    return names[role] || role;
}

function updateUI() {
    checkAdminStatus();
    updateUserStatus();
}

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
            case 'productivity':
                console.log('📈 Carregando gráfico de produtividade...');
                if (typeof loadProductivityData === 'function') {
                    await loadProductivityData();
                }
                break;
            default:
                console.log('View carregada:', viewName);
        }

    } else {
        console.warn('View não encontrada:', viewName + 'View');
    }
}}

function handleViewSwitch(e) {
    e.preventDefault();
    const targetView = this.getAttribute('data-view');
    if (targetView) {
        switchView(targetView);
    }
}

// Função para criar alerta visual
function createAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = 9999;
    alertDiv.style.minWidth = '300px';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.fontSize = '0.8rem';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

     2000;


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
window.createAlert = createAlert;

console.log('✅ helpers.js carregado');