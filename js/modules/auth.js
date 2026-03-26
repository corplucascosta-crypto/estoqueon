// =============================================
// AUTHENTICATION MODULE
// =============================================

// Initialize system users
async function initializeSystemUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('system_users')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar usuários:', error);
        return false;
    }
}

// Ensure admin exists
async function ensureAdminExists() {
    try {
        const adminEmail = 'admin@estoque.local';
        const { data: existingAdmin, error: checkError } = await supabaseClient
            .from('system_users')
            .select('*')
            .eq('email', adminEmail)
            .limit(1);
        
        if (existingAdmin && existingAdmin.length > 0) {
            const admin = existingAdmin[0];
            if (admin.role !== 'admin') {
                await supabaseClient
                    .from('system_users')
                    .update({ role: 'admin' })
                    .eq('id', admin.id);
            }
            return true;
        }
        
        const adminUser = {
            email: adminEmail,
            full_name: 'Administrador Master',
            password_hash: btoa('admin123'),
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await supabaseClient.from('system_users').insert([adminUser]);
        return true;
    } catch (error) {
        console.error('❌ Erro ao verificar/criar admin:', error.message);
        return false;
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const matricula = document.getElementById('matricula').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        const email = `${matricula}@estoque.local`;
        const { data: users, error } = await supabaseClient
            .from('system_users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true);
            
        if (error) throw error;
        
        if (!users || users.length === 0) {
            showNotification('Matrícula não encontrada', 'error');
            return;
        }
        
        const user = users[0];
        
        if (user.password_hash !== btoa(password)) {
            showNotification('Senha incorreta', 'error');
            return;
        }
        
        await supabaseClient
            .from('system_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        currentUser = user;
        isAdmin = user.role === 'admin';
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isAdmin', isAdmin.toString());
        
        document.querySelector('.navbar-nav').classList.add('visible');
        
        await loadUserData();
        updateUI();
        
        setTimeout(() => checkAdminStatus(), 200);
        switchView('counting');
        
        showNotification(`✅ Login realizado! Bem-vindo, ${user.full_name}`, 'success');
        
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login', 'error');
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    currentUser = null;
    isAdmin = false;
    inventoryItems = [];
    
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    
    document.querySelector('.navbar-nav').classList.remove('visible');
    
    updateUI();
    switchView('login');
    
    showNotification('👋 Logout realizado com sucesso!', 'info');
}

// Handle user registration
async function handleRegister(e) {
    const regMatricula = document.getElementById('regMatricula').value.trim();
    const regNome = document.getElementById('regNome').value.trim();
    const regSenha = document.getElementById('regSenha').value;
    const regConfirmSenha = document.getElementById('regConfirmSenha').value;
    const alertBox = document.getElementById('registerAlertBox');
    const submitBtn = document.getElementById('submitRegisterBtn');
    
    if (!regMatricula || !regNome || !regSenha || !regConfirmSenha) {
        alertBox.innerHTML = '<strong>Erro:</strong> Todos os campos são obrigatórios';
        alertBox.className = 'alert alert-danger';
        alertBox.classList.remove('d-none');
        return;
    }
    
    if (regSenha.length < 6) {
        alertBox.innerHTML = '<strong>Erro:</strong> A senha deve ter mínimo 6 caracteres';
        alertBox.className = 'alert alert-danger';
        alertBox.classList.remove('d-none');
        return;
    }
    
    if (regSenha !== regConfirmSenha) {
        alertBox.innerHTML = '<strong>Erro:</strong> As senhas não conferem';
        alertBox.className = 'alert alert-danger';
        alertBox.classList.remove('d-none');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Criando...';
        
        const email = `${regMatricula}@estoque.local`;
        const { data: existingUsers, error: checkError } = await supabaseClient
            .from('system_users')
            .select('id')
            .eq('email', email);
        
        if (checkError) throw checkError;
        
        if (existingUsers && existingUsers.length > 0) {
            alertBox.innerHTML = '<strong>Erro:</strong> Esta matrícula já está cadastrada';
            alertBox.className = 'alert alert-danger';
            alertBox.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Criar Conta';
            return;
        }
        
        const newUser = {
            email: email,
            full_name: regNome,
            password_hash: btoa(regSenha),
            role: 'user',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await supabaseClient.from('system_users').insert([newUser]);
        
        alertBox.innerHTML = '<strong>Sucesso!</strong> Conta criada com sucesso! Faça login agora.';
        alertBox.className = 'alert alert-success';
        alertBox.classList.remove('d-none');
        
        document.getElementById('registerForm').reset();
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            alertBox.classList.add('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Criar Conta';
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao registrar:', error);
        alertBox.innerHTML = `<strong>Erro:</strong> ${error.message || 'Erro ao criar conta'}`;
        alertBox.className = 'alert alert-danger';
        alertBox.classList.remove('d-none');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Criar Conta';
    }
}