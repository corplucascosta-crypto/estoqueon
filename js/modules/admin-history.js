// Admin History Module
(function() {
    let allData = [];

    window.loadAllInventoryData = async function() {
        if (!currentUser || currentUser.role !== 'admin') return;
        
        try {
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
        } catch (error) {
            console.error('Erro:', error);
        }
    };

    function renderTable() {
        const tableBody = document.getElementById('adminHistoryTable');
        if (!tableBody) return;
        
        if (allData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhuma contagem registrada</td></tr>';
            return;
        }
        
        tableBody.innerHTML = allData.map(item => {
            const diff = (item.countedQuantity || 0) - (item.systemQuantity || 0);
            const total = (item.countedQuantity || 0) * (item.unitValue || 0);
            const date = new Date(item.date).toLocaleString('pt-BR');
            const typeColor = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' }[item.countingType] || 'secondary';
            
            return 
                <tr>
                    <td><span class="badge bg-"></span></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class=""></td>
                    <td>R$ </td>
                    <td>R$ </td>
                    <td></td>
                    <td><small></small><br><small></small></td>
                </tr>
            ;
        }).join('');
    }

    function updateSummary() {
        const total = allData.length;
        const uniqueItems = [...new Set(allData.map(i => i.code))].length;
        const users = [...new Set(allData.map(i => i.userName))].length;
        const quantity = allData.reduce((s, i) => s + (i.countedQuantity || 0), 0);
        
        const html = 
            <div class="row text-center">
                <div class="col-3"><div class="border p-2"><small>Contagens</small><h5></h5></div></div>
                <div class="col-3"><div class="border p-2"><small>Itens</small><h5></h5></div></div>
                <div class="col-3"><div class="border p-2"><small>Usuários</small><h5></h5></div></div>
                <div class="col-3"><div class="border p-2"><small>Unidades</small><h5></h5></div></div>
            </div>
        ;
        const summaryDiv = document.getElementById('adminHistorySummary');
        if (summaryDiv) summaryDiv.innerHTML = html;
    }

    window.exportAllInventoryData = async function() {
        if (allData.length === 0) return;
        
        const data = [['Usuário', 'Tipo', 'Código', 'Descrição', 'Qtd Sistema', 'Qtd Contada', 'Diferença', 'Valor', 'Total', 'Data']];
        allData.forEach(item => {
            const diff = (item.countedQuantity || 0) - (item.systemQuantity || 0);
            data.push([
                item.userName, item.countingType, item.code, item.description,
                item.systemQuantity || 0, item.countedQuantity || 0, diff,
                item.unitValue || 0, (item.countedQuantity || 0) * (item.unitValue || 0),
                new Date(item.date).toLocaleString('pt-BR')
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contagens');
        XLSX.writeFile(wb, contagens_.xlsx);
        showNotification('Exportado!', 'success');
    };

    window.filterAdminHistory = function() {
        const search = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
        const type = document.getElementById('adminTypeFilter')?.value || '';
        const user = document.getElementById('adminUserFilter')?.value || '';
        
        const filtered = allData.filter(item => {
            const matchSearch = item.code.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
            const matchType = !type || item.countingType === type;
            const matchUser = !user || item.userName === user;
            return matchSearch && matchType && matchUser;
        });
        
        const tableBody = document.getElementById('adminHistoryTable');
        if (!tableBody) return;
        
        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum resultado</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filtered.map(item => {
            const diff = (item.countedQuantity || 0) - (item.systemQuantity || 0);
            const total = (item.countedQuantity || 0) * (item.unitValue || 0);
            const date = new Date(item.date).toLocaleString('pt-BR');
            const typeColor = { 'Avaria': 'danger', 'RH': 'warning', 'Outro': 'secondary' }[item.countingType] || 'secondary';
            
            return 
                <tr>
                    <td><span class="badge bg-"></span></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class=""></td>
                    <td>R$ </td>
                    <td>R$ </td>
                    <td></td>
                    <td><small></small><br><small></small></td>
                </tr>
            ;
        }).join('');
    };

    window.loadAdminUserFilter = async function() {
        try {
            const { data } = await supabaseClient.from('system_users').select('full_name').order('full_name');
            const filter = document.getElementById('adminUserFilter');
            if (filter && data) {
                filter.innerHTML = '<option value="">Todos</option>' + data.map(u => <option value=""></option>).join('');
            }
        } catch(e) {}
    };
})();
