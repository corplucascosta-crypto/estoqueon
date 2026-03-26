// =============================================
// USER MANAGEMENT MODULE
// =============================================

// Load users from Supabase
async function loadUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('system_users')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        systemUsers = data || [];
        updateUsersStats();
        renderUsersTable();
        showNotification(`${systemUsers.length} usuários carregados`, 'success');
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showNotification('Erro ao carregar usuários: ' + error.message, 'error');
    }
}

// Update users statistics
function updateUsersStats() {
    const totalUsers = systemUsers.length;
    const activeUsers = systemUsers.filter(user => user.is_active).length;
    const adminUsers = systemUsers.filter(user => user.role === 'admin').length;
    const todayLogins = systemUsers.filter(user => {
        if (!user.last_login) return false;
        const today = new Date().toDateString();
        const lastLogin = new Date(user.last_login).toDateString();
        return today === lastLogin;
    }).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('adminUsers').textContent = adminUsers;
    document.getElementById('todayLogins').textContent = todayLogins;
}

// Render users table
function renderUsersTable() {
    const usersTable = document.getElementById('usersTable');
    
    if (systemUsers.length === 0) {
        usersTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-users fa-2x mb-2 d-block"></i>Nenhum usuário cadastrado</td></tr>`;
        return;
    }
    
    usersTable.innerHTML = systemUsers.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-2">
                        <i class="fas fa-user-circle ${getRoleColorClass(user.role)}"></i>
                    </div>
                    <div>
                        <strong>${user.full_name}</strong>
                        ${user.id === currentUser?.id ? '<span class="badge bg-info ms-1">Você</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${getRoleBadgeClass(user.role)}">
                    <i class="fas ${getRoleIcon(user.role)} me-1"></i>
                    ${getRoleDisplayName(user.role)}
                </span>
            </td>
            <td>
                <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                    ${user.is_active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                ${user.last_login ? 
                    `<small>${new Date(user.last_login).toLocaleDateString('pt-BR')}<br>${new Date(user.last_login).toLocaleTimeString('pt-BR')}</small>` : 
                    '<span class="text-muted">Nunca</span>'
                }
            </td>
            <td>${new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary edit-user" data-id="${user.id}" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-user" data-id="${user.id}" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteUser(btn.getAttribute('data-id')));
    });
}

// Filter users table
function filterUsersTable() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    
    const filteredUsers = systemUsers.filter(user => {
        const matchesSearch = user.full_name.toLowerCase().includes(searchTerm) || 
                             user.email.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });
    
    const usersTable = document.getElementById('usersTable');
    
    if (filteredUsers.length === 0) {
        usersTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-search fa-2x mb-2 d-block"></i>Nenhum usuário encontrado</td></tr>`;
        return;
    }
    
    usersTable.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-2">
                        <i class="fas fa-user-circle ${getRoleColorClass(user.role)}"></i>
                    </div>
                    <div>
                        <strong>${user.full_name}</strong>
                        ${user.id === currentUser?.id ? '<span class="badge bg-info ms-1">Você</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${getRoleBadgeClass(user.role)}">
                    <i class="fas ${getRoleIcon(user.role)} me-1"></i>
                    ${getRoleDisplayName(user.role)}
                </span>
            </td>
            <td>
                <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                    ${user.is_active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                ${user.last_login ? 
                    `<small>${new Date(user.last_login).toLocaleDateString('pt-BR')}<br>${new Date(user.last_login).toLocaleTimeString('pt-BR')}</small>` : 
                    '<span class="text-muted">Nunca</span>'
                }
            </td>
            <td>${new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary edit-user" data-id="${user.id}" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-user" data-id="${user.id}" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteUser(btn.getAttribute('data-id')));
    });
}

// Edit user
function editUser(userId) {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) return;
    
    currentEditingUserId = userId;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit me-2"></i>Editar Usuário';
    document.getElementById('editUserId').value = user.id;
    document.getElementById('userFullName').value = user.full_name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userActive').checked = user.is_active;
    document.getElementById('passwordLabel').textContent = 'Nova Senha';
    document.getElementById('passwordHelp').textContent = 'Deixe em branco para manter a senha atual';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

// Confirm delete user
function confirmDeleteUser(userId) {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (user.id === currentUser?.id) {
        showNotification('Você não pode excluir seu próprio usuário', 'error');
        return;
    }
    
    document.getElementById('deleteUserName').textContent = user.full_name;
    currentEditingUserId = userId;
    new bootstrap.Modal(document.getElementById('deleteUserModal')).show();
}

// Delete user
async function deleteUser(userId) {
    try {
        const { error } = await supabaseClient
            .from('system_users')
            .delete()
            .eq('id', userId);
            
        if (error) throw error;
        
        await loadUsers();
        showNotification('Usuário excluído com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        showNotification('Erro ao excluir usuário: ' + error.message, 'error');
    }
}

// Save user (create or update)
async function saveUser() {
    const form = document.getElementById('userForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const userData = {
        full_name: document.getElementById('userFullName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        role: document.getElementById('userRole').value,
        is_active: document.getElementById('userActive').checked,
        updated_at: new Date().toISOString()
    };
    
    if (currentEditingUserId) userData.id = currentEditingUserId;
    
    const password = document.getElementById('userPassword').value;
    if (password && password.length >= 6) {
        userData.password_hash = btoa(password);
    }
    
    try {
        const saveBtn = document.getElementById('saveUserBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
        
        if (currentEditingUserId) {
            await supabaseClient
                .from('system_users')
                .update(userData)
                .eq('id', currentEditingUserId);
        } else {
            userData.created_by = currentUser?.id || null;
            await supabaseClient
                .from('system_users')
                .insert([userData]);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        await loadUsers();
        
        showNotification(
            currentEditingUserId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!', 
            'success'
        );
        
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        showNotification('Erro ao salvar usuário: ' + error.message, 'error');
    } finally {
        document.getElementById('saveUserBtn').disabled = false;
        document.getElementById('saveUserBtn').innerHTML = '<i class="fas fa-save me-1"></i>Salvar Usuário';
    }
}

// Reset user form
function resetUserForm() {
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus me-2"></i>Novo Usuário';
    document.getElementById('passwordLabel').textContent = 'Senha';
    document.getElementById('passwordHelp').textContent = 'Mínimo 6 caracteres';
    document.getElementById('userPassword').required = true;
    document.getElementById('editUserId').value = '';
    currentEditingUserId = null;
}