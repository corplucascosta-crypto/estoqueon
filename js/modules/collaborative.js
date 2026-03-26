// =============================================
// COLLABORATIVE MODULE - Contagem simultânea
// =============================================

let currentSession = null;
let collaborativeItems = [];

// Iniciar sessão colaborativa
async function startCollaborativeSession(sessionType) {
    if (!currentUser) {
        showNotification('Faça login primeiro', 'error');
        return false;
    }
    
    try {
        // Verificar se já existe sessão ativa do mesmo tipo
        const { data: existing, error: checkError } = await supabaseClient
            .from('counting_session')
            .select('*')
            .eq('type', sessionType)
            .eq('is_active', true)
            .single();
        
        if (existing) {
            currentSession = existing;
            showNotification(`Sessão ${sessionType} já está ativa! Entrando na contagem...`, 'info');
            await loadCollaborativeItems(sessionType);
            return true;
        }
        
        // Criar nova sessão
        const { data: session, error } = await supabaseClient
            .from('counting_session')
            .insert({
                type: sessionType,
                started_by: currentUser.id,
                started_at: new Date().toISOString(),
                is_active: true
            })
            .select()
            .single();
        
        if (error) throw error;
        
        currentSession = session;
        collaborativeItems = [];
        showNotification(`✅ Sessão ${sessionType} iniciada!`, 'success');
        return true;
        
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
        showNotification('Erro ao iniciar sessão colaborativa', 'error');
        return false;
    }
}

// Carregar itens da sessão colaborativa
async function loadCollaborativeItems(sessionType) {
    try {
        const { data, error } = await supabaseClient
            .from('collaborative_count')
            .select('*')
            .eq('counting_type', sessionType)
            .order('counted_at', { ascending: false });
        
        if (error) throw error;
        
        collaborativeItems = data || [];
        renderCollaborativeTable();
        updateCollaborativeSummary();
        
        showNotification(`📊 ${collaborativeItems.length} itens contados na sessão`, 'info');
        
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

// Adicionar item na contagem colaborativa
async function addCollaborativeItem(code, description, quantity, unitValue = 0) {
    if (!currentSession) {
        showNotification('Nenhuma sessão ativa. Inicie uma contagem primeiro.', 'error');
        return false;
    }
    
    try {
        // Verificar se item já foi contado
        const { data: existing, error: checkError } = await supabaseClient
            .from('collaborative_count')
            .select('*')
            .eq('code', code)
            .eq('counting_type', currentSession.type)
            .maybeSingle();
        
        if (existing) {
            // Atualizar contagem existente (somar)
            const newQuantity = existing.counted_quantity + quantity;
            
            const { error: updateError } = await supabaseClient
                .from('collaborative_count')
                .update({
                    counted_quantity: newQuantity,
                    counted_by: currentUser.id,
                    counted_by_name: currentUser.full_name,
                    counted_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            
            if (updateError) throw updateError;
            
            showNotification(`📦 ${description}: +${quantity} unidades (Total: ${newQuantity})`, 'success');
            
        } else {
            // Inserir novo item
            const { error: insertError } = await supabaseClient
                .from('collaborative_count')
                .insert({
                    code: code,
                    description: description,
                    counting_type: currentSession.type,
                    counted_quantity: quantity,
                    unit_value: unitValue,
                    counted_by: currentUser.id,
                    counted_by_name: currentUser.full_name,
                    counted_at: new Date().toISOString(),
                    session_id: currentSession.id
                });
            
            if (insertError) throw insertError;
            
            showNotification(`✅ ${description}: ${quantity} unidades adicionadas`, 'success');
        }
        
        // Atualizar contador da sessão
        await supabaseClient
            .from('counting_session')
            .update({ total_items: collaborativeItems.length + 1 })
            .eq('id', currentSession.id);
        
        // Recarregar dados
        await loadCollaborativeItems(currentSession.type);
        return true;
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        showNotification('Erro ao adicionar item', 'error');
        return false;
    }
}

// Renderizar tabela colaborativa
function renderCollaborativeTable() {
    const tableBody = document.getElementById('collaborativeTable');
    if (!tableBody) return;
    
    if (collaborativeItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-2 d-block"></i>
                    Nenhum item contado ainda. Seja o primeiro!
                </td>
            </tr>
        `;
        return;
    }
    
    // Agrupar por código para mostrar contagem total
    const groupedItems = {};
    collaborativeItems.forEach(item => {
        if (!groupedItems[item.code]) {
            groupedItems[item.code] = {
                code: item.code,
                description: item.description,
                totalQuantity: 0,
                unitValue: item.unit_value,
                counts: [],
                lastCount: null
            };
        }
        groupedItems[item.code].totalQuantity += item.counted_quantity;
        groupedItems[item.code].counts.push({
            quantity: item.counted_quantity,
            by: item.counted_by_name,
            at: item.counted_at
        });
        groupedItems[item.code].lastCount = item.counted_at;
    });
    
    tableBody.innerHTML = Object.values(groupedItems).map(item => {
        const contributors = [...new Set(item.counts.map(c => c.by))].join(', ');
        
        return `
            <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.description}</td>
                <td class="text-success fw-bold">${item.totalQuantity}</td>
                <td>R$ ${(item.totalQuantity * item.unitValue).toFixed(2)}</td>
                <td><small>${item.counts.length}x</small></td>
                <td><small class="text-muted">${contributors}</small></td>
                <td><small>${new Date(item.lastCount).toLocaleTimeString()}</small></td>
            </tr>
        `;
    }).join('');
}

// Atualizar resumo da contagem colaborativa
function updateCollaborativeSummary() {
    const totalItems = collaborativeItems.length;
    const totalQuantity = collaborativeItems.reduce((sum, item) => sum + item.counted_quantity, 0);
    const uniqueItems = [...new Set(collaborativeItems.map(i => i.code))].length;
    const contributors = [...new Set(collaborativeItems.map(i => i.counted_by_name))];
    
    const summaryHtml = `
        <div class="row text-center">
            <div class="col-4">
                <div class="border rounded p-2">
                    <small class="text-muted">Itens Únicos</small>
                    <h5 class="mb-0">${uniqueItems}</h5>
                </div>
            </div>
            <div class="col-4">
                <div class="border rounded p-2">
                    <small class="text-muted">Total Contagens</small>
                    <h5 class="mb-0">${totalItems}</h5>
                </div>
            </div>
            <div class="col-4">
                <div class="border rounded p-2">
                    <small class="text-muted">Colaboradores</small>
                    <h5 class="mb-0">${contributors.length}</h5>
                </div>
            </div>
        </div>
    `;
    
    const summaryDiv = document.getElementById('collaborativeSummary');
    if (summaryDiv) summaryDiv.innerHTML = summaryHtml;
}

// Finalizar sessão colaborativa
async function finalizeCollaborativeSession() {
    if (!currentSession) {
        showNotification('Nenhuma sessão ativa', 'warning');
        return false;
    }
    
    if (confirm(`Finalizar sessão ${currentSession.type}?\nTotal de itens: ${collaborativeItems.length}`)) {
        try {
            const { error } = await supabaseClient
                .from('counting_session')
                .update({
                    ended_at: new Date().toISOString(),
                    is_active: false
                })
                .eq('id', currentSession.id);
            
            if (error) throw error;
            
            currentSession = null;
            collaborativeItems = [];
            renderCollaborativeTable();
            updateCollaborativeSummary();
            
            showNotification(`✅ Sessão ${currentSession?.type || ''} finalizada!`, 'success');
            return true;
            
        } catch (error) {
            console.error('Erro ao finalizar sessão:', error);
            showNotification('Erro ao finalizar sessão', 'error');
            return false;
        }
    }
    return false;
}

// Exportar relatório da contagem colaborativa
async function exportCollaborativeReport() {
    if (collaborativeItems.length === 0) {
        showNotification('Nenhum dado para exportar', 'warning');
        return;
    }
    
    const data = [
        ['Código', 'Descrição', 'Quantidade Total', 'Valor Unit.', 'Valor Total', 'Contribuidores', 'Última Contagem']
    ];
    
    const groupedItems = {};
    collaborativeItems.forEach(item => {
        if (!groupedItems[item.code]) {
            groupedItems[item.code] = {
                code: item.code,
                description: item.description,
                totalQuantity: 0,
                unitValue: item.unit_value,
                contributors: [],
                lastCount: item.counted_at
            };
        }
        groupedItems[item.code].totalQuantity += item.counted_quantity;
        groupedItems[item.code].contributors.push(item.counted_by_name);
    });
    
    Object.values(groupedItems).forEach(item => {
        const uniqueContributors = [...new Set(item.contributors)].join(', ');
        data.push([
            item.code,
            item.description,
            item.totalQuantity,
            item.unitValue,
            (item.totalQuantity * item.unitValue).toFixed(2),
            uniqueContributors,
            new Date(item.lastCount).toLocaleString()
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Contagem_${currentSession?.type || 'Geral'}`);
    XLSX.writeFile(wb, `contagem_colaborativa_${new Date().toISOString().slice(0,19)}.xlsx`);
    
    showNotification('Relatório exportado com sucesso!', 'success');
}

// Adicionar no módulo global
window.startCollaborativeSession = startCollaborativeSession;
window.loadCollaborativeItems = loadCollaborativeItems;
window.addCollaborativeItem = addCollaborativeItem;
window.renderCollaborativeTable = renderCollaborativeTable;
window.updateCollaborativeSummary = updateCollaborativeSummary;
window.finalizeCollaborativeSession = finalizeCollaborativeSession;
window.exportCollaborativeReport = exportCollaborativeReport;