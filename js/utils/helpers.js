// =============================================
// UTILITY FUNCTIONS
// =============================================

// Show notification (console only for now)
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Role badge classes
function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'bg-danger',
        'manager': 'bg-warning',
        'user': 'bg-info'
    };
    return classes[role] || 'bg-secondary';
}

// Role color classes
function getRoleColorClass(role) {
    const classes = {
        'admin': 'text-danger',
        'manager': 'text-warning',
        'user': 'text-info'
    };
    return classes[role] || 'text-secondary';
}

// Role icons
function getRoleIcon(role) {
    const icons = {
        'admin': 'fa-shield-alt',
        'manager': 'fa-user-tie',
        'user': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

// Role display names
function getRoleDisplayName(role) {
    const names = {
        'admin': 'Administrador',
        'manager': 'Gerente',
        'user': 'Usuário'
    };
    return names[role] || role;
}

// Update UI based on user role
function updateUI() {
    checkAdminStatus();
    updateUserStatus();
}

// Check admin status and show/hide elements
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
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('loginBtn').style.display = 'none';
    } else {
        adminOnlyElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        managerOnlyElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
    }
}

// Update user status display
function updateUserStatus() {
    const userStatus = document.getElementById('userStatus');
    const userName = document.getElementById('userName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    
    if (currentUser) {
        userName.textContent = currentUser.full_name;
        userRoleBadge.textContent = getRoleDisplayName(currentUser.role);
        userRoleBadge.className = `user-role-badge badge ${getRoleBadgeClass(currentUser.role)}`;
        userStatus.style.display = 'block';
    } else {
        userStatus.style.display = 'none';
    }
}

// Switch between views
async function switchView(viewName) {
    document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.view-switch').forEach(link => link.classList.remove('active'));
    
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.classList.add('active');
        const activeLink = document.querySelector(`.view-switch[data-view="${viewName}"]`);
        if (activeLink) activeLink.classList.add('active');
        
        switch(viewName) {
            case 'counting':
                setTimeout(() => {
                    const input = document.getElementById('itemCode');
                    if (input) input.focus();
                }, 100);
                break;
            case 'history':
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
                if (typeof updateSummary === 'function') updateSummary();
                break;
            case 'dashboard':
                if (typeof updateDashboard === 'function') updateDashboard();
                break;
            case 'users':
                if (typeof loadUsers === 'function') loadUsers();
                break;
    
        }
    }
}

// Handle view switch event
function handleViewSwitch(e) {
    e.preventDefault();
    const targetView = this.getAttribute('data-view');
    switchView(targetView);
}