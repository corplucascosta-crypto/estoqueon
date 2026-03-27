// Admin History Module - Versão Corrigida
(function() {
    let allData = [];

    window.loadAllInventoryData = async function() {
        if (!currentUser || currentUser.role !== 'admin') {
            console.log('Apenas admin pode ver todas as contagens');
            return;
        }
        
        try {
            console.log('Carregando todas as contagens...');
            const { data, error } = await supabaseClient
                .from('inventory_items')
                .select('*, system_users(full_name, email)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
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
            console.log(allData.length + ' contagens carregadas');
        } catch (error) {
            console.error('Erro ao carregar:', error);
        }
    };

    function renderTable() {
        const tableBody = document.getElementById('adminHistoryTable');
        if (!tableBody) return;
        
        if (allData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Nenhuma contagem registrada</td></tr>';
            return;
        }
        
        tableBody.innerHTML = allData.map(item => {
            const systemQty = item.systemQuantity || 0;
            const countedQty = item.countedQuantity || 0;
            const diff = countedQty - systemQty;
            const diffClass = diff === 0 ? '' : (diff > 0 ? 'positive-diff' : 'negative-diff');
            const totalValue = countedQty * (item.unitValue || 0);
            const date = new Date(item.date).toLocaleString('pt-BR');
            
            const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' };
            const typeColor = typeColors[item.countingType] || 'secondary';
            
            return `
                <tr>
                    <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                    <td>${item.code}</td>
                    <td>${item.description}</td>
                    <td>${systemQty}</td>
                    <td>${countedQty}</td>
                    <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
                    <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>${item.counts}</td>
                    <td><small>${item.userName}</small><br><small class="text-muted">${date}</small></td>
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
            const matchesSearch = item.code.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm);
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
            const diff = countedQty - systemQty;
            const diffClass = diff === 0 ? '' : (diff > 0 ? 'positive-diff' : 'negative-diff');
            const totalValue = countedQty * (item.unitValue || 0);
            const date = new Date(item.date).toLocaleString('pt-BR');
            
            const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' };
            const typeColor = typeColors[item.countingType] || 'secondary';
            
            return `
                <tr>
                    <td><span class="badge bg-${typeColor}">${item.countingType}</span></td>
                    <td>${item.code}</td>
                    <td>${item.description}</td>
                    <td>${systemQty}</td>
                    <td>${countedQty}</td>
                    <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
                    <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>${item.counts}</td>
                    <td><small>${item.userName}</small><br><small class="text-muted">${date}</small></td>
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
})();