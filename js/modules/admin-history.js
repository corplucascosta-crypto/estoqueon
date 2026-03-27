// =============================================
// ADMIN HISTORY MODULE - Versão Corrigida
// =============================================

// Usar variável global para evitar duplicação
if (typeof window.allHistoryData === 'undefined') {
    window.allHistoryData = [];
}

window.loadAllInventoryData = async function() {
    if (!currentUser || currentUser.role !== 'admin') {
        console.log('Apenas admin pode ver todas as contagens');
        return;
    }
    
    try {
        console.log('📊 Carregando todas as contagens...');
        
        const { data, error } = await supabaseClient
            .from('inventory_items')
            .select(`
                *,
                system_users (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('✅ Dados recebidos:', data ? data.length : 0);
        
        window.allHistoryData = (data || []).map(item => ({
            id: item.id,
            code: item.code || '',
            description: item.description || 'Sem descrição',
            systemQuantity: item.system_quantity || 0,
            countedQuantity: item.counted_quantity || 0,
            unitValue: item.unit_value || 0,
            counts: item.counts || 1,
            countingType: item.counting_type || 'Outro',
            date: item.created_at || new Date().toISOString(),
            userName: item.system_users?.full_name || 'Usuário',
            userEmail: item.system_users?.email || ''
        }));
        
        renderAdminTable();
        updateAdminSummary();
        
        console.log('✅ Tabela renderizada com', window.allHistoryData.length, 'itens');
        
    } catch (error) {
        console.error('Erro ao carregar:', error);
        showNotification('Erro ao carregar histórico completo', 'error');
    }
};

function renderAdminTable() {
    const tableBody = document.getElementById('adminHistoryTable');
    const recordCount = document.getElementById('adminRecordCount');
    
    if (!tableBody) return;
    
    const data = window.allHistoryData;
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="fas fa-box-open fa-2x mb-2 d-block"></i>
                    Nenhuma contagem registrada
                 </td>
             </tr>
        `;
        if (recordCount) recordCount.innerHTML = '';
        return;
    }
    
    if (recordCount) {
        recordCount.innerHTML = `<i class="fas fa-database me-1"></i> ${data.length} registro(s) encontrado(s)`;
    }
    
    tableBody.innerHTML = data.map(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const diff = countedQty - systemQty;
        const diffClass = diff === 0 ? '' : (diff > 0 ? 'positive-diff' : 'negative-diff');
        const diffSign = diff > 0 ? '+' : '';
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                <td><strong>${item.code}</strong></td>
                <td style="max-width: 250px; white-space: normal; word-break: break-word;">${item.description}</td>
                <td class="text-center">${systemQty}</td>
                <td class="text-center fw-bold">${countedQty}</td>
                <td class="text-center ${diffClass}">${diffSign}${diff}</td>
                <td class="text-end">R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td class="text-end">R$ ${totalValue.toFixed(2)}</td>
                <td class="text-center">${item.counts}</td>
                <td>
                    <div>
                        <strong>${item.userName}</strong>
                        <br>
                        <small class="text-muted">${date}</small>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateAdminSummary() {
    const data = window.allHistoryData;
    const totalItems = data.length;
    const uniqueItems = [...new Set(data.map(i => i.code))].length;
    const uniqueUsers = [...new Set(data.map(i => i.userName))].length;
    const totalQuantity = data.reduce((sum, i) => sum + (i.countedQuantity || 0), 0);
    
    const totalItemsEl = document.getElementById('adminTotalItems');
    const uniqueItemsEl = document.getElementById('adminUniqueItems');
    const uniqueUsersEl = document.getElementById('adminUniqueUsers');
    const totalQuantityEl = document.getElementById('adminTotalQuantity');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (uniqueItemsEl) uniqueItemsEl.textContent = uniqueItems;
    if (uniqueUsersEl) uniqueUsersEl.textContent = uniqueUsers;
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
}

window.exportAllInventoryData = async function() {
    const data = window.allHistoryData;
    
    if (data.length === 0) {
        showNotification('Não há dados para exportar', 'warning');
        return;
    }
    
    const startDate = document.getElementById('exportStartDate')?.value;
    const endDate = document.getElementById('exportEndDate')?.value;
    
    let filteredData = [...data];
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filteredData = filteredData.filter(item => new Date(item.date) >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(item => new Date(item.date) <= end);
    }
    
    if (filteredData.length === 0) {
        showNotification('Nenhum dado no período selecionado', 'warning');
        return;
    }
    
    const excelData = [['Usuário', 'Tipo', 'Código', 'Descrição', 'Qtd Sistema', 'Qtd Contada', 'Diferença', 'Valor Unit.', 'Valor Total', 'Contagens', 'Data']];
    
    filteredData.forEach(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const diff = countedQty - systemQty;
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        excelData.push([
            item.userName,
            item.countingType,
            item.code,
            item.description,
            systemQty,
            countedQty,
            diff,
            item.unitValue || 0,
            totalValue,
            item.counts,
            date
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contagens');
    
    const fileName = `contagens_${startDate || 'inicio'}_${endDate || 'hoje'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification(`${filteredData.length} registros exportados!`, 'success');
};

window.filterAdminHistory = function() {
    const searchTerm = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('adminTypeFilter')?.value || '';
    const userFilter = document.getElementById('adminUserFilter')?.value || '';
    
    const data = window.allHistoryData;
    
    const filteredItems = data.filter(item => {
        const matchesSearch = item.code.toLowerCase().includes(searchTerm) || 
                             item.description.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || item.countingType === typeFilter;
        const matchesUser = !userFilter || item.userName === userFilter;
        return matchesSearch && matchesType && matchesUser;
    });
    
    const tableBody = document.getElementById('adminHistoryTable');
    const recordCount = document.getElementById('adminRecordCount');
    
    if (!tableBody) return;
    
    if (filteredItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="fas fa-search fa-2x mb-2 d-block"></i>
                    Nenhum resultado encontrado
                </td>
            </tr>
        `;
        if (recordCount) recordCount.innerHTML = '0 registro(s) encontrado(s)';
        return;
    }
    
    if (recordCount) {
        recordCount.innerHTML = `<i class="fas fa-database me-1"></i> ${filteredItems.length} registro(s) encontrado(s)`;
    }
    
    tableBody.innerHTML = filteredItems.map(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const diff = countedQty - systemQty;
        const diffClass = diff === 0 ? '' : (diff > 0 ? 'positive-diff' : 'negative-diff');
        const diffSign = diff > 0 ? '+' : '';
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                <td><strong>${item.code}</strong></td>
                <td style="max-width: 250px; white-space: normal; word-break: break-word;">${item.description}</td>
                <td class="text-center">${systemQty}</td>
                <td class="text-center fw-bold">${countedQty}</td>
                <td class="text-center ${diffClass}">${diffSign}${diff}</td>
                <td class="text-end">R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td class="text-end">R$ ${totalValue.toFixed(2)}</td>
                <td class="text-center">${item.counts}</td>
                <td>
                    <div>
                        <strong>${item.userName}</strong>
                        <br>
                        <small class="text-muted">${date}</small>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.loadAdminUserFilter = async function() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const { data: users, error } = await supabaseClient
            .from('system_users')
            .select('full_name')
            .order('full_name');
        
        if (error) throw error;
        
        const userFilter = document.getElementById('adminUserFilter');
        if (userFilter && users) {
            userFilter.innerHTML = '<option value="">Todos os usuários</option>' +
                users.map(u => `<option value="${u.full_name}">${u.full_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
};

console.log('✅ admin-history.js carregado');