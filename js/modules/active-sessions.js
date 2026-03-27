// =============================================
// ACTIVE SESSIONS MODULE - Sessões ativas em tempo real
// =============================================

let activeSessionsInterval = null;

async function loadActiveSessions() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const { data: sessions, error } = await supabaseClient
            .from('counting_session')
            .select(`
                *,
                system_users (full_name, email)
            `)
            .eq('is_active', true)
            .order('started_at', { ascending: false });
        
        if (error) throw error;
        
        renderActiveSessions(sessions || []);
        
    } catch (error) {
        console.error('Erro ao carregar sessões ativas:', error);
    }
}

function renderActiveSessions(sessions) {
    const container = document.getElementById('activeSessionsContainer');
    if (!container) return;
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-users fa-2x mb-2 d-block"></i>
                Nenhuma sessão ativa no momento
            </div>
        `;
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="card mb-2 border-left-primary">
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-${session.type === 'Avaria' ? 'danger' : session.type === 'RH' ? 'warning' : 'secondary'} me-2">
                            ${session.type}
                        </span>
                        <strong>${session.system_users?.full_name || 'Usuário'}</strong>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            ${new Date(session.started_at).toLocaleTimeString()}
                        </small>
                        <br>
                        <small class="text-success">
                            <i class="fas fa-boxes me-1"></i>
                            ${session.total_items || 0} itens
                        </small>
                    </div>
                </div>
                <div class="progress mt-2" style="height: 4px;">
                    <div class="progress-bar bg-success" style="width: ${Math.min((session.total_items || 0) / 100 * 100, 100)}%"></div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-sm btn-outline-danger end-session-btn" data-id="${session.id}" data-type="${session.type}">
                        <i class="fas fa-stop me-1"></i>Encerrar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.end-session-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const sessionId = this.getAttribute('data-id');
            const sessionType = this.getAttribute('data-type');
            if (confirm(`Encerrar sessão de ${sessionType}?`)) {
                await endSession(sessionId);
            }
        });
    });
}

async function endSession(sessionId) {
    try {
        const { error } = await supabaseClient
            .from('counting_session')
            .update({ ended_at: new Date().toISOString(), is_active: false })
            .eq('id', sessionId);
        
        if (error) throw error;
        
        showNotification('Sessão encerrada com sucesso!', 'success');
        await loadActiveSessions();
        
    } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
        showNotification('Erro ao encerrar sessão', 'error');
    }
}

// Iniciar atualização automática a cada 10 segundos
function startActiveSessionsWatcher() {
    if (activeSessionsInterval) clearInterval(activeSessionsInterval);
    activeSessionsInterval = setInterval(loadActiveSessions, 10000);
}

function stopActiveSessionsWatcher() {
    if (activeSessionsInterval) {
        clearInterval(activeSessionsInterval);
        activeSessionsInterval = null;
    }
}

// Exportar funções
window.loadActiveSessions = loadActiveSessions;
window.startActiveSessionsWatcher = startActiveSessionsWatcher;
window.stopActiveSessionsWatcher = stopActiveSessionsWatcher;