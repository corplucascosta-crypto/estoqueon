// =============================================
// MAIN APPLICATION - Estoque-On
// =============================================

async function initializeSystem() {
    console.log('🚀 Inicializando sistema...');
    
    const savedUser = localStorage.getItem('currentUser');
    const savedIsAdmin = localStorage.getItem('isAdmin');
    
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAdmin = savedIsAdmin === 'true';
            document.querySelector('.navbar-nav').classList.add('visible');
        } catch (error) {
            console.error('Erro ao recuperar usuário:', error);
            currentUser = null;
            isAdmin = false;
        }
    }
    
    setupEventListeners();
    await initializeSystemUsers();
    await ensureAdminExists();
    updateUI();
    
    if (currentUser) {
        await loadUserData();
        updateDashboard();
        switchView('counting');
    }
    
    renderInventoryTable();
    updateSummary();
    console.log('✅ Sistema inicializado');
}

function setupEventListeners() {
    document.querySelectorAll('.view-switch').forEach(el => {
        el.addEventListener('click', handleViewSwitch);
    });
    
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('loginBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        switchView('login');
    });
    
    document.getElementById('submitRegisterBtn')?.addEventListener('click', handleRegister);
    document.getElementById('inventoryForm')?.addEventListener('submit', handleInventorySubmit);
    document.getElementById('itemCode')?.addEventListener('input', handleItemCodeInput);
    document.getElementById('resetButton')?.addEventListener('click', resetItemForm);
    document.getElementById('countingType')?.addEventListener('change', handleCountingTypeChange);
    document.getElementById('finalizeCountingBtn')?.addEventListener('click', handleFinalizeCountingSession);
    document.getElementById('searchInput')?.addEventListener('input', filterInventoryTable);
    document.getElementById('exportBtn')?.addEventListener('click', exportToExcel);
    document.getElementById('clearAllBtn')?.addEventListener('click', function() {
        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    });
    document.getElementById('confirmClear')?.addEventListener('click', clearAllData);
    document.getElementById('refreshDashboard')?.addEventListener('click', updateDashboard);
    document.getElementById('exportDashboard')?.addEventListener('click', exportDashboardData);
    document.getElementById('saveUserBtn')?.addEventListener('click', saveUser);
    document.getElementById('userSearch')?.addEventListener('input', filterUsersTable);
    document.getElementById('roleFilter')?.addEventListener('change', filterUsersTable);
    document.getElementById('confirmDeleteUser')?.addEventListener('click', function() {
        if (currentEditingUserId) deleteUser(currentEditingUserId);
    });
    document.getElementById('excelFile')?.addEventListener('change', previewExcelFile);
    document.getElementById('confirmImport')?.addEventListener('click', importExcelData);
    document.getElementById('migrateBaseBtn')?.addEventListener('click', migrateToPermanentBase);
    document.getElementById('userModal')?.addEventListener('hidden.bs.modal', resetUserForm);
    document.getElementById('addCountBtn')?.addEventListener('click', addNewCount);
    document.getElementById('replaceCountBtn')?.addEventListener('click', replaceExistingCount);
    document.getElementById('countedQuantity')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('submitButton')?.click();
        }
    });
    
    setupKeyboardShortcuts();
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('itemCode')?.focus();
        }
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            resetItemForm();
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
    setTimeout(testSupabaseConnection, 2000);
});
