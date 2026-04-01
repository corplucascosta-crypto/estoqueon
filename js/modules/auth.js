// =============================================
// AUTHENTICATION MODULE - Versão Otimizada
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
            console.log('✅ Admin já existe no Supabase:', admin.id);
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
        
        const { data: newAdmin, error: insertError } = await supabaseClient
            .from('system_users')
            .insert([adminUser])
            .select();
        
        if (insertError) {
            console.error('Erro ao criar admin no Supabase:', insertError);
            return false;
        }
        
        console.log('✅ Admin criado no Supabase:', newAdmin[0]?.id);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao verificar/criar admin:', error.message);
        return false;
    }
}

// Handle login - VERSÃO OTIMIZADA
async function handleLogin(e) {
    e.preventDefault();
    
    const matricula = document.getElementById('matricula').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = loginBtn.innerHTML;
    
    // Desabilitar botão durante login
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Entrando...';
    
    try {
        // LOGIN ADMIN DIRETO (mais rápido - sem esperar Supabase)
        if (matricula === 'admin' && password === 'admin123') {
            console.log('👑 Login Admin direto');
            
            currentUser = {
                id: 'admin-local',
                full_name: 'Administrador',
                email: 'admin@estoque.local',
                role: 'admin',
                is_active: true
            };
            isAdmin = true;
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('isAdmin', 'true');
            
            document.querySelector('.navbar-nav').classList.add('visible');
            updateUI();
            
            // Carregar dados em segundo plano (não bloqueia a tela)
            setTimeout(async () => {
                try {
                    await loadUserData();
                    if (typeof updateDashboard === 'function') updateDashboard();
                    console.log('✅ Dados carregados em background');
                } catch (err) {
                    console.warn('Erro ao carregar dados:', err);
                }
            }, 100);
            
            switchView('counting');
            showNotification('✅ Login realizado como Administrador!', 'success');
            
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
            return;
        }
        
        // LOGIN DE USUÁRIOS NORMAIS - otimizado
        const email = `${matricula}@estoque.local`;
        
        // Usar maybeSingle() para resposta mais rápida
        const { data: user, error } = await supabaseClient
            .from('system_users')
            .select('id, full_name, email, role, is_active, password_hash')
            .eq('email', email)
            .eq('is_active', true)
            .maybeSingle();
            
        if (error) {
            console.error('Erro ao buscar usuário:', error);
            showNotification('Erro de conexão com o servidor', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (!user) {
            showNotification('Matrícula não encontrada', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (user.password_hash !== btoa(password)) {
            showNotification('Senha incorreta', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
            return;
        }
        
        // Atualizar último login em background (não bloqueia)
        supabaseClient
            .from('system_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)
            .then(() => console.log('Login registrado'))
            .catch(err => console.warn('Erro ao registrar login:', err));
        
        currentUser = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        };
        isAdmin = user.role === 'admin';
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAdmin', isAdmin.toString());
        
        document.querySelector('.navbar-nav').classList.add('visible');
        
        // Carregar dados em segundo plano
        setTimeout(async () => {
            try {
                await loadUserData();
                if (typeof updateDashboard === 'function') updateDashboard();
                console.log('✅ Dados carregados em background');
            } catch (err) {
                console.warn('Erro ao carregar dados:', err);
            }
        }, 100);
        
        updateUI();
        setTimeout(() => checkAdminStatus(), 100);
        switchView('counting');
        
        showNotification(`✅ Bem-vindo, ${user.full_name}!`, 'success');
        
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnText;
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
    const originalBtnText = submitBtn.innerHTML;
    
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
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Criando...';
    
    try {
        const email = `${regMatricula}@estoque.local`;
        
        // Verificar se email já existe
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('system_users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existingUser) {
            alertBox.innerHTML = '<strong>Erro:</strong> Esta matrícula já está cadastrada';
            alertBox.className = 'alert alert-danger';
            alertBox.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
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
        
        const { data: createdUser, error: insertError } = await supabaseClient
            .from('system_users')
            .insert([newUser])
            .select();
        
        if (insertError) throw insertError;
        
        alertBox.innerHTML = '<strong>Sucesso!</strong> Conta criada com sucesso! Faça login agora.';
        alertBox.className = 'alert alert-success';
        alertBox.classList.remove('d-none');
        
        document.getElementById('registerForm').reset();
        
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            if (modal) modal.hide();
            alertBox.classList.add('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao registrar:', error);
        alertBox.innerHTML = `<strong>Erro:</strong> ${error.message || 'Erro ao criar conta'}`;
        alertBox.className = 'alert alert-danger';
        alertBox.classList.remove('d-none');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}