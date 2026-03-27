// =============================================
// ADMIN HISTORY MODULE - Versão Completa
// =============================================

let allData = [];

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
        
        allData = (data || []).map(item => ({
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
        
        renderTable();
        updateSummary();
        
        console.log('✅ Tabela renderizada com', allData.length, 'itens');
        
    } catch (error) {
        console.error('Erro ao carregar:', error);
        showNotification('Erro ao carregar histórico completo', 'error');
    }
};

function renderTable() {
    const tableBody = document.getElementById('adminHistoryTable');
    const recordCount = document.getElementById('adminRecordCount');
    
    if (!tableBody) return;
    
    if (allData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-5">
                    <i class="fas fa-box-open fa-2x mb-2 d-block"></i>
                    Nenhuma contagem registrada
                </td>
            </tr>
        `;
        if (recordCount) recordCount.innerHTML = '';
        return;
    }
    
    // Atualizar contador de registros
    if (recordCount) {
        recordCount.innerHTML = `<i class="fas fa-database me-1"></i> ${allData.length} registro(s) encontrado(s)`;
    }
    
    tableBody.innerHTML = allData.map(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const diff = countedQty - systemQty;
        const diffClass = diff === 0 ? '' : (diff > 0 ? 'positive-diff' : 'negative-diff');
        const diffSign = diff > 0 ? '+' : '';
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        const typeColors = { 
            'Avaria': 'danger', 
            'RH': 'warning', 
            'Outro': 'secondary' 
        };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr onclick="showItemDetails('${item.id}')" style="cursor: pointer;">
                <td class="text-center">
                    <span class="badge bg-${typeColor}">${item.countingType}</span>
                </td>
                <td class="fw-semibold">${item.code}</td>
                <td class="text-truncate" style="max-width: 200px;" title="${item.description}">${item.description}</td>
                <td class="text-center">${systemQty}</td>
                <td class="text-center fw-bold">${countedQty}</td>
                <td class="text-center ${diffClass}">${diffSign}${diff}</td>
                <td class="text-end">R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td class="text-end">R$ ${totalValue.toFixed(2)}</td>
                <td class="text-center">${item.counts}</td>
                <td>
                    <div class="d-flex flex-column">
                        <small class="fw-semibold">${item.userName}</small>
                        <small class="text-muted" style="font-size: 0.7rem;">${date}</small>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSummary() {
    const totalItems = allData.length;
    const uniqueItems = [...new Set(allData.map(i => i.code))].length;
    const uniqueUsers = [...new Set(allData.map(i => i.userName))].length;
    const totalQuantity = allData.reduce((sum, i) => sum + (i.countedQuantity || 0), 0);
    
    const summaryHtml = `
        <div class="col-md-3 col-sm-6">
            <div class="card bg-primary bg-opacity-10 border-0 h-100">
                <div class="card-body text-center">
                    <i class="fas fa-chart-line fa-2x text-primary mb-2"></i>
                    <h6 class="text-muted mb-1">Total Contagens</h6>
                    <h3 class="mb-0 fw-bold">${totalItems}</h3>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6">
            <div class="card bg-success bg-opacity-10 border-0 h-100">
                <div class="card-body text-center">
                    <i class="fas fa-barcode fa-2x text-success mb-2"></i>
                    <h6 class="text-muted mb-1">Itens Únicos</h6>
                    <h3 class="mb-0 fw-bold">${uniqueItems}</h3>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6">
            <div class="card bg-info bg-opacity-10 border-0 h-100">
                <div class="card-body text-center">
                    <i class="fas fa-users fa-2x text-info mb-2"></i>
                    <h6 class="text-muted mb-1">Colaboradores</h6>
                    <h3 class="mb-0 fw-bold">${uniqueUsers}</h3>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6">
            <div class="card bg-warning bg-opacity-10 border-0 h-100">
                <div class="card-body text-center">
                    <i class="fas fa-boxes fa-2x text-warning mb-2"></i>
                    <h6 class="text-muted mb-1">Total Unidades</h6>
                    <h3 class="mb-0 fw-bold">${totalQuantity}</h3>
                </div>
            </div>
        </div>
    `;
    
    const summaryDiv = document.getElementById('adminHistorySummary');
    if (summaryDiv) summaryDiv.innerHTML = summaryHtml;
}

window.exportAllInventoryData = async function() {
    if (allData.length === 0) {
        showNotification('Não há dados para exportar', 'warning');
        return;
    }
    
    const data = [['Usuário', 'Tipo', 'Código', 'Descrição', 'Qtd Sistema', 'Qtd Contada', 'Diferença', 'Valor Unit.', 'Valor Total', 'Contagens', 'Data']];
    
    allData.forEach(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const diff = countedQty - systemQty;
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleString('pt-BR');
        
        data.push([
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
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Todas_Contagens');
    XLSX.writeFile(wb, `contagens_completas_${new Date().toISOString().slice(0, 19)}.xlsx`);
    
    showNotification('Relatório exportado com sucesso!', 'success');
};

window.filterAdminHistory = function() {
    const searchTerm = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('adminTypeFilter')?.value || '';
    const userFilter = document.getElementById('adminUserFilter')?.value || '';
    
    const filteredItems = allData.filter(item => {
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
                <td colspan="10" class="text-center text-muted py-5">
                    <i class="fas fa-search fa-2x mb-2 d-block"></i>
                    Nenhum resultado encontrado
                </td>
            </tr>
        `;
        if (recordCount) recordCount.innerHTML = '0 registro(s) encontrado(s)';
        return;
    }
    
    // Atualizar contador
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
            <tr onclick="showItemDetails('${item.id}')" style="cursor: pointer;">
                <td class="text-center"><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                <td class="fw-semibold">${item.code}</td>
                <td class="text-truncate" style="max-width: 200px;" title="${item.description}">${item.description}</td>
                <td class="text-center">${systemQty}</td>
                <td class="text-center fw-bold">${countedQty}</td>
                <td class="text-center ${diffClass}">${diffSign}${diff}</td>
                <td class="text-end">R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td class="text-end">R$ ${totalValue.toFixed(2)}</td>
                <td class="text-center">${item.counts}</td>
                <td>
                    <div class="d-flex flex-column">
                        <small class="fw-semibold">${item.userName}</small>
                        <small class="text-muted" style="font-size: 0.7rem;">${date}</small>
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
            userFilter.innerHTML = '<option value="">👥 Todos os usuários</option>' +
                users.map(u => `<option value="${u.full_name}">👤 ${u.full_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
};

// Função para mostrar detalhes do item (opcional)
window.showItemDetails = function(itemId) {
    const item = allData.find(i => i.id === itemId);
    if (item) {
        alert(`📦 ${item.code}\n\nDescrição: ${item.description}\nQuantidade: ${item.countedQuantity}\nValor Unit: R$ ${(item.unitValue || 0).toFixed(2)}\nValor Total: R$ ${(item.countedQuantity * (item.unitValue || 0)).toFixed(2)}\nUsuário: ${item.userName}\nData: ${new Date(item.date).toLocaleString('pt-BR')}`);
    }
};

console.log('✅ admin-history.js carregado');