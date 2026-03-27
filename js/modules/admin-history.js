// =============================================
// ADMIN HISTORY MODULE - Visualizar todas as contagens
// =============================================

// Usar variável global, não redeclarar
if (typeof window.allInventoryItems === 'undefined') {
    window.allInventoryItems = [];
}

// Carregar todas as contagens de todos os usuários (apenas para Admin)
async function loadAllInventoryData() {
    if (!currentUser || currentUser.role !== 'admin') {
        console.log('Apenas admin pode ver todas as contagens');
        return;
    }
    
    try {
        console.log('📊 Carregando todas as contagens...');
        
        const { data: inventoryData, error } = await supabaseClient
            .from('inventory_items')
            .select('*, system_users(full_name, email)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        window.allInventoryItems = (inventoryData || []).map(item => ({
            id: item.id,
            code: item.code || '',
            description: item.description || 'Sem descrição',
            systemQuantity: item.system_quantity || 0,
            countedQuantity: item.counted_quantity || 0,
            unitValue: item.unit_value || 0,
            counts: item.counts || 1,
            countingType: item.counting_type || 'Outro',
            date: item.created_at || new Date().toISOString(),
            userName: item.system_users?.full_name || 'Usuário desconhecido',
            userEmail: item.system_users?.email || ''
        }));
        
        console.log(`✅ ${window.allInventoryItems.length} contagens carregadas`);
        renderAdminHistoryTable();
        updateAdminSummary();
        
    } catch (error) {
        console.error('Erro ao carregar todas as contagens:', error);
        showNotification('Erro ao carregar histórico completo', 'error');
    }
}

// Renderizar tabela de histórico para Admin
function renderAdminHistoryTable() {
    const tableBody = document.getElementById('adminHistoryTable');
    if (!tableBody) return;
    
    if (!window.allInventoryItems || window.allInventoryItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="fas fa-box-open fa-2x mb-2 d-block"></i>
                    Nenhuma contagem registrada
                 </td>
             </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = window.allInventoryItems.map((item, index) => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const difference = countedQty - systemQty;
        const differenceClass = difference === 0 ? '' : (difference > 0 ? 'positive-diff' : 'negative-diff');
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Auditoria': 'info', 'Reposição': 'success', 'Outro': 'secondary' };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                <td>${item.code}</td>
                <td>${item.description}</td>
                <td>${systemQty}</td>
                <td>${countedQty}</td>
                <td class="${differenceClass}">${difference > 0 ? '+' : ''}${difference}</td>
                <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td>R$ ${totalValue.toFixed(2)}</td>
                <td>${item.counts}</td>
                <td>
                    <small class="text-muted">${item.userName}</small><br>
                    <small class="text-muted fs-10">${date}</small>
                </td>
            </tr>
        `;
    }).join('');
}

// Atualizar resumo do Admin
function updateAdminSummary() {
    const totalItems = window.allInventoryItems.length;
    const uniqueItems = [...new Set(window.allInventoryItems.map(i => i.code))].length;
    const uniqueUsers = [...new Set(window.allInventoryItems.map(i => i.userName))].length;
    const totalQuantity = window.allInventoryItems.reduce((sum, i) => sum + (i.countedQuantity || 0), 0);
    
    const summaryHtml = `
        <div class="row text-center">
            <div class="col-3">
                <div class="border rounded p-2">
                    <small class="text-muted">Total Contagens</small>
                    <h5 class="mb-0">${totalItems}</h5>
                </div>
            </div>
            <div class="col-3">
                <div class="border rounded p-2">
                    <small class="text-muted">Itens Únicos</small>
                    <h5 class="mb-0">${uniqueItems}</h5>
                </div>
            </div>
            <div class="col-3">
                <div class="border rounded p-2">
                    <small class="text-muted">Colaboradores</small>
                    <h5 class="mb-0">${uniqueUsers}</h5>
                </div>
            </div>
            <div class="col-3">
                <div class="border rounded p-2">
                    <small class="text-muted">Total Unidades</small>
                    <h5 class="mb-0">${totalQuantity}</h5>
                </div>
            </div>
        </div>
    `;
    
    const summaryDiv = document.getElementById('adminHistorySummary');
    if (summaryDiv) summaryDiv.innerHTML = summaryHtml;
}

// Exportar todas as contagens para Excel (Admin)
async function exportAllInventoryData() {
    if (!window.allInventoryItems || window.allInventoryItems.length === 0) {
        showNotification('Não há dados para exportar', 'warning');
        return;
    }
    
    const data = [['Usuário', 'Tipo', 'Código', 'Descrição', 'Qtd Sistema', 'Qtd Contada', 'Diferença', 'Valor Unit.', 'Valor Total', 'Contagens', 'Data']];
    
    window.allInventoryItems.forEach(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const difference = countedQty - systemQty;
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        data.push([
            item.userName,
            item.countingType,
            item.code,
            item.description,
            systemQty,
            countedQty,
            difference,
            item.unitValue || 0,
            totalValue,
            item.counts,
            date
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Todas_Contagens');
    XLSX.writeFile(wb, `contagens_completas_${new Date().toISOString().slice(0, 19)}.xlsx`);
    
    showNotification('Relatório exportado com sucesso!', 'success');
}

// Filtrar tabela do Admin
function filterAdminHistory() {
    const searchTerm = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('adminTypeFilter')?.value || '';
    const userFilter = document.getElementById('adminUserFilter')?.value || '';
    
    const filteredItems = window.allInventoryItems.filter(item => {
        const matchesSearch = item.code.toLowerCase().includes(searchTerm) || 
                             item.description.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || item.countingType === typeFilter;
        const matchesUser = !userFilter || item.userName === userFilter;
        return matchesSearch && matchesType && matchesUser;
    });
    
    const tableBody = document.getElementById('adminHistoryTable');
    if (!tableBody) return;
    
    if (filteredItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Nenhum resultado encontrado</td></tr>';
        return;
    }
    
    tableBody.innerHTML = filteredItems.map(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const difference = countedQty - systemQty;
        const differenceClass = difference === 0 ? '' : (difference > 0 ? 'positive-diff' : 'negative-diff');
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Auditoria': 'info', 'Reposição': 'success', 'Outro': 'secondary' };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                <td>${item.code}</td>
                <td>${item.description}</td>
                <td>${systemQty}</td>
                <td>${countedQty}</td>
                <td class="${differenceClass}">${difference > 0 ? '+' : ''}${difference}</td>
                <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td>R$ ${totalValue.toFixed(2)}</td>
                <td>${item.counts}</td>
                <td>
                    <small class="text-muted">${item.userName}</small><br>
                    <small class="text-muted fs-10">${date}</small>
                </td>
            </tr>
        `;
    }).join('');
}

// Carregar lista de usuários para o filtro
async function loadAdminUserFilter() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const { data: users, error } = await supabaseClient
            .from('system_users')
            .select('full_name')
            .order('full_name');
        
        if (error) throw error;
        
        const userFilter = document.getElementById('adminUserFilter');
        if (userFilter) {
            userFilter.innerHTML = '<option value="">Todos os usuários</option>' +
                users.map(u => `<option value="${u.full_name}">${u.full_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Exportar funções para uso global
window.loadAllInventoryData = loadAllInventoryData;
window.renderAdminHistoryTable = renderAdminHistoryTable;
window.updateAdminSummary = updateAdminSummary;
window.exportAllInventoryData = exportAllInventoryData;
window.filterAdminHistory = filterAdminHistory;
window.loadAdminUserFilter = loadAdminUserFilter;