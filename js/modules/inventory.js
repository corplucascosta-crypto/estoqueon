// =============================================
// INVENTORY MODULE - Versão Estável
// =============================================

// Load user data from Supabase
async function loadUserData() {
    try {
        if (!currentUser || !currentUser.id) {
            inventoryItems = [];
            return;
        }
        
        // IMPORTANTE: Admin local NÃO existe no Supabase
        if (currentUser.id === 'admin-local') {
            console.log('👑 Admin local - carregando dados do localStorage apenas');
            const localData = localStorage.getItem(`inventoryItems_admin-local`);
            if (localData) {
                inventoryItems = JSON.parse(localData);
                console.log(`📦 ${inventoryItems.length} itens carregados do localStorage`);
            } else {
                inventoryItems = [];
                console.log('📦 Nenhum item encontrado no localStorage');
            }
            return;
        }
        
        // Para usuários normais, buscar do Supabase
        console.log('🔄 Buscando dados do Supabase para usuário:', currentUser.id);
        const { data: inventoryData, error: inventoryError } = await supabaseClient
            .from('inventory_items')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (inventoryError) throw inventoryError;
        
        inventoryItems = (inventoryData || []).map(item => ({
            code: item.code || '',
            description: item.description || 'Sem descrição',
            systemQuantity: item.system_quantity || 0,
            countedQuantity: item.counted_quantity || 0,
            unitValue: item.unit_value || 0,
            counts: item.counts || 1,
            countingType: item.counting_type || 'Outro',
            date: item.created_at || new Date().toISOString(),
            history: item.history || []
        }));
        
        console.log(`📦 ${inventoryItems.length} itens carregados do Supabase`);
        
    } catch (error) {
        console.error('Erro carregar dados:', error);
        // Fallback para localStorage
        const localData = localStorage.getItem(`inventoryItems_${currentUser.id}`);
        if (localData) {
            inventoryItems = JSON.parse(localData);
            console.log(`📦 Fallback: ${inventoryItems.length} itens do localStorage`);
        }
    }
}

// Save inventory data
async function saveInventoryData() {
    try {
        // Admin local: salva apenas no localStorage
        if (currentUser?.id === 'admin-local') {
            localStorage.setItem(`inventoryItems_admin-local`, JSON.stringify(inventoryItems));
            console.log('💾 Admin local - dados salvos no localStorage');
            return;
        }
        
        // Usuários normais: salva no localStorage + Supabase
        if (currentUser?.id) {
            localStorage.setItem(`inventoryItems_${currentUser.id}`, JSON.stringify(inventoryItems));
        }
        
        if (navigator.onLine && currentUser && currentUser.id) {
            console.log('☁️ Sincronizando com Supabase...');
            for (const item of inventoryItems) {
                try {
                    const payload = {
                        code: item.code,
                        description: item.description,
                        system_quantity: item.systemQuantity || 0,
                        counted_quantity: item.countedQuantity || 0,
                        unit_value: item.unitValue || 0,
                        counts: item.counts || 1,
                        counting_type: item.countingType || 'Outro',
                        user_id: currentUser.id,
                        created_at: item.date || new Date().toISOString()
                    };
                    
                    const { data: existing, error: checkError } = await supabaseClient
                        .from('inventory_items')
                        .select('id')
                        .eq('user_id', payload.user_id)
                        .eq('code', payload.code)
                        .maybeSingle();
                    
                    if (existing && existing.id) {
                        await supabaseClient.from('inventory_items').update(payload).eq('id', existing.id);
                    } else {
                        await supabaseClient.from('inventory_items').insert(payload);
                    }
                } catch (itemError) {
                    console.warn('⚠️ Erro ao sincronizar item:', item.code);
                }
            }
            console.log('✅ Sincronização concluída');
        }
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
}

// Find item by code in products_base
async function findItemByCode(code) {
    try {
        const sanitizedCode = code?.toString().replace(/[^a-zA-Z0-9]/g, '') || '';
        if (!sanitizedCode) return null;
        
        let availableCols = inventoryColumnsCache;
        if (!availableCols) {
            try {
                const { data: sample, error: sampleErr } = await supabaseClient
                    .from('products_base')
                    .select('*')
                    .limit(1);
                if (!sampleErr && sample && sample.length > 0) {
                    availableCols = Object.keys(sample[0]).map(k => k.toLowerCase());
                } else {
                    availableCols = [];
                }
            } catch (err) {
                console.warn('Erro ao obter colunas:', err);
                availableCols = [];
            }
            inventoryColumnsCache = availableCols;
        }
        
        const candidateCols = ['codigo', 'code', 'dun', 'ean', 'gtin'];
        const colsToQuery = candidateCols.filter(c => availableCols.includes(c));
        
        if (colsToQuery.length === 0) return null;
        
        for (const col of colsToQuery) {
            const { data, error } = await supabaseClient
                .from('products_base')
                .select('*')
                .eq(col, sanitizedCode)
                .limit(1);
            
            if (error) continue;
            if (data && data.length > 0) return data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Erro na busca:', error);
        return null;
    }
}

// Handle item code input with debounce
function handleItemCodeInput() {
    const code = this.value.trim();
    const codeLoading = document.getElementById('codeLoading');
    
    if (itemCodeSearchTimeout) clearTimeout(itemCodeSearchTimeout);
    
    if (code.length >= 3) {
        codeLoading.style.display = 'inline-block';
        itemCodeSearchTimeout = setTimeout(async () => {
            try {
                const item = await findItemByCode(code);
                if (item) {
                    displayItemInfo(item);
                    moveFocusToQuantity();
                } else {
                    displayItemNotFound(code);
                }
            } catch (error) {
                displayItemNotFound(code);
            }
            codeLoading.style.display = 'none';
            itemCodeSearchTimeout = null;
        }, 200);
    } else {
        resetItemForm();
    }
}

// Display item information
function displayItemInfo(item) {
    const code = item.code || item.CODE || item.codigo || item.CODIGO;
    const descricao = item.descricao || item.DESCRICAO || 'Produto sem descrição';
    const quantidade = item.quantidade || item.QUANTIDADE || 0;
    const valor = item.valor || item.VALOR || 0;
    const embalagem = item.embalagem || item.EMBALAGEM || 'N/A';
    
    const itemDescriptionDisplay = document.getElementById('itemDescriptionDisplay');
    itemDescriptionDisplay.innerHTML = `
        <strong>${descricao}</strong>
        <span class="status-indicator online" title="Código válido"><i class="fas fa-circle"></i></span>
        <br>
        <small class="text-muted">Sistema: ${quantidade} unidades | Valor: R$ ${valor.toFixed(2)} | Embalagem: ${embalagem}</small>
    `;
    
    const countedQuantityInput = document.getElementById('countedQuantity');
    const submitButton = document.getElementById('submitButton');
    
    countedQuantityInput.disabled = false;
    submitButton.disabled = false;
    
    existingItemIndex = inventoryItems.findIndex(invItem => invItem.code === code);
    if (existingItemIndex !== -1) {
        const existingItem = inventoryItems[existingItemIndex];
        itemDescriptionDisplay.innerHTML += `<div class="count-history"><small>Já contado: ${existingItem.countedQuantity || 0} unidades (${existingItem.counts || 1} vez(es))</small></div>`;
    }
    
    currentItemCode = code;
}

// Display item not found message
function displayItemNotFound(code) {
    const itemDescriptionDisplay = document.getElementById('itemDescriptionDisplay');
    itemDescriptionDisplay.innerHTML = `
        <span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Item não encontrado na base online</span>
        <span class="status-indicator offline" title="Código não encontrado"><i class="fas fa-circle"></i></span>
        <br>
        <small class="text-muted">Código: ${code}</small>
    `;
    
    const countedQuantityInput = document.getElementById('countedQuantity');
    const submitButton = document.getElementById('submitButton');
    
    countedQuantityInput.disabled = true;
    submitButton.disabled = true;
    currentItemCode = '';
}

// Reset item form
function resetItemForm() {
    const itemDescriptionDisplay = document.getElementById('itemDescriptionDisplay');
    const countedQuantityInput = document.getElementById('countedQuantity');
    const submitButton = document.getElementById('submitButton');
    const codeLoading = document.getElementById('codeLoading');
    
    itemDescriptionDisplay.innerHTML = '<span class="text-muted">A descrição aparecerá aqui ao inserir o código</span>';
    countedQuantityInput.value = '';
    countedQuantityInput.disabled = true;
    submitButton.disabled = true;
    currentItemCode = '';
    existingItemIndex = -1;
    codeLoading.style.display = 'none';
}

// Move focus to quantity field
function moveFocusToQuantity() {
    const countedQuantityInput = document.getElementById('countedQuantity');
    if (!countedQuantityInput.disabled) {
        countedQuantityInput.classList.add('auto-focus');
        countedQuantityInput.focus();
        countedQuantityInput.select();
        setTimeout(() => countedQuantityInput.classList.remove('auto-focus'), 1000);
    }
}

// Handle counting type change
function handleCountingTypeChange() {
    const countingType = document.getElementById('countingType').value;
    const finalizeBtn = document.getElementById('finalizeCountingBtn');
    const sessionStatus = document.getElementById('sessionStatus');
    const sessionTypeDisplay = document.getElementById('sessionTypeDisplay');
    
    if (countingType) {
        currentCountingType = countingType;
        countingSessionActive = true;
        finalizeBtn.style.display = 'block';
        sessionStatus.style.display = 'inline-block';
        sessionTypeDisplay.textContent = `📋 Contagem: ${countingType}`;
        sessionStatus.className = 'badge bg-success ms-3';
        document.getElementById('itemCode').focus();
        showNotification(`Sessão iniciada: ${countingType}`, 'info');
    } else {
        currentCountingType = '';
        countingSessionActive = false;
        finalizeBtn.style.display = 'none';
        sessionStatus.style.display = 'none';
        showNotification('Selecione um tipo de contagem', 'warning');
    }
}

// Handle inventory form submission
async function handleInventorySubmit(e) {
    e.preventDefault();
    await processInventoryItem();
}

// Process inventory item
async function processInventoryItem() {
    const countedQuantityInput = document.getElementById('countedQuantity');
    const countedQuantity = parseInt(countedQuantityInput.value);
    
    if (isNaN(countedQuantity) || countedQuantity <= 0) {
        showNotification('Digite uma quantidade válida', 'warning');
        return;
    }
    
    if (countedQuantity > 999999) {
        showNotification('Quantidade muito alta!', 'warning');
        return;
    }
    
    if (existingItemIndex !== -1 && inventoryItems[existingItemIndex]) {
        currentCountedQuantity = countedQuantity;
        showItemAlreadyCountedModal();
        return;
    }
    
    await addNewInventoryItem(countedQuantity);
}

// Show modal for already counted item
function showItemAlreadyCountedModal() {
    const existingItem = inventoryItems[existingItemIndex];
    if (!existingItem) return;
    
    const existingCountsInfoEl = document.getElementById('existingCountsInfo');
    
    existingCountsInfoEl.innerHTML = `
        <div class="count-history-item"><strong>Contagem atual:</strong> ${existingItem.countedQuantity || 0} unidades<br><small>Contado ${existingItem.counts || 1} vez(es)</small></div>
        <div class="count-history-item"><strong>Nova contagem:</strong> ${currentCountedQuantity} unidades</div>
        <div class="count-history-item bg-light p-2 rounded mt-2"><strong>Resultado se SOMAR:</strong> ${(existingItem.countedQuantity || 0) + currentCountedQuantity} unidades</div>
    `;
    
    new bootstrap.Modal(document.getElementById('itemAlreadyCountedModal')).show();
}

// Add new count to existing item
async function addNewCount() {
    const existingItem = inventoryItems[existingItemIndex];
    if (!existingItem) return;
    
    const totalCounted = (existingItem.countedQuantity || 0) + currentCountedQuantity;
    
    inventoryItems[existingItemIndex] = {
        ...existingItem,
        countedQuantity: totalCounted,
        counts: (existingItem.counts || 1) + 1,
        history: [...(existingItem.history || []), { date: new Date().toISOString(), quantity: currentCountedQuantity, type: currentCountingType }]
    };
    
    await saveInventoryData();
    resetFormAfterSubmission();
    renderInventoryTable();
    updateSummary();
    if (typeof updateDashboard === 'function') updateDashboard();
    showNotification('Nova contagem adicionada!', 'success');
}

// Replace existing count
async function replaceExistingCount() {
    const existingItem = inventoryItems[existingItemIndex];
    if (!existingItem) return;
    
    inventoryItems[existingItemIndex] = {
        ...existingItem,
        countedQuantity: currentCountedQuantity,
        counts: 1,
        countingType: currentCountingType,
        history: [{ date: new Date().toISOString(), quantity: currentCountedQuantity, type: currentCountingType }]
    };
    
    await saveInventoryData();
    resetFormAfterSubmission();
    renderInventoryTable();
    updateSummary();
    if (typeof updateDashboard === 'function') updateDashboard();
    showNotification('Contagem substituída!', 'success');
}

// Add new inventory item
async function addNewInventoryItem(countedQuantity) {
    if (!currentItemCode) {
        showNotification('Código do item não foi validado', 'error');
        return;
    }
    
    if (!currentCountingType) {
        showNotification('Selecione um tipo de contagem', 'warning');
        document.getElementById('countingType').focus();
        return;
    }
    
    let itemDescription = 'Item não identificado';
    const itemDescriptionDisplay = document.getElementById('itemDescriptionDisplay');
    
    try {
        const descriptionElement = itemDescriptionDisplay.querySelector('strong');
        if (descriptionElement && descriptionElement.textContent) {
            itemDescription = descriptionElement.textContent.trim();
        }
    } catch (error) {}
    
    if (itemDescription === 'Item não identificado') {
        try {
            const item = await findItemByCode(currentItemCode);
            if (item && item.descricao) itemDescription = item.descricao;
        } catch (error) {}
    }
    
    let unitValue = 0;
    try {
        const item = await findItemByCode(currentItemCode);
        if (item && item.valor) unitValue = parseFloat(item.valor) || 0;
    } catch (error) {}
    
    const newItem = {
        code: currentItemCode,
        description: itemDescription || 'Sem descrição',
        systemQuantity: 0,
        countedQuantity: parseInt(countedQuantity) || 0,
        unitValue: unitValue,
        counts: 1,
        countingType: currentCountingType,
        date: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), quantity: parseInt(countedQuantity) || 0, type: currentCountingType }]
    };
    
    // Verificar se item já existe
    const existingIndex = inventoryItems.findIndex(i => i.code === currentItemCode);
    if (existingIndex !== -1) {
        inventoryItems[existingIndex].countedQuantity += newItem.countedQuantity;
        inventoryItems[existingIndex].counts += 1;
        inventoryItems[existingIndex].history.push(newItem.history[0]);
        showNotification(`+${countedQuantity} ${itemDescription}`, 'success');
    } else {
        inventoryItems.push(newItem);
        showNotification(`✅ ${itemDescription}: ${countedQuantity} un`, 'success');
    }
    
    await saveInventoryData();
    resetFormAfterSubmission();
    renderInventoryTable();
    updateSummary();
    if (typeof updateDashboard === 'function') updateDashboard();
}

// Reset form after submission
function resetFormAfterSubmission() {
    const itemCodeInput = document.getElementById('itemCode');
    const countedQuantityInput = document.getElementById('countedQuantity');
    
    itemCodeInput.value = '';
    countedQuantityInput.value = '';
    resetItemForm();
    
    setTimeout(() => {
        itemCodeInput.focus();
    }, 100);
}

// Handle finalize counting session
async function handleFinalizeCountingSession() {
    if (!countingSessionActive || inventoryItems.length === 0) {
        showNotification('Nenhum item contado nesta sessão', 'warning');
        return;
    }
    
    const countingType = currentCountingType;
    const itemCount = inventoryItems.filter(item => item.countingType === countingType).length;
    
    if (confirm(`Finalizar contagem ${countingType}?\n${itemCount} itens`)) {
        try {
            await saveInventoryData();
            document.getElementById('countingType').value = '';
            currentCountingType = '';
            countingSessionActive = false;
            document.getElementById('finalizeCountingBtn').style.display = 'none';
            document.getElementById('sessionStatus').style.display = 'none';
            showNotification(`Contagem ${countingType} finalizada!`, 'success');
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro ao finalizar', 'error');
        }
    }
}

// Render inventory table
function renderInventoryTable() {
    const inventoryTable = document.getElementById('inventoryTable');
    
    if (!inventoryItems || inventoryItems.length === 0) {
        inventoryTable.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="fas fa-box-open fa-2x mb-2 d-block"></i>Nenhum item contado ainda</td></tr>`;
        return;
    }
    
    inventoryTable.innerHTML = inventoryItems.map((item, index) => {
        const systemQty = item.systemQuantity !== undefined ? item.systemQuantity : 0;
        const countedQty = item.countedQuantity !== undefined ? item.countedQuantity : 0;
        const unitVal = item.unitValue !== undefined ? item.unitValue : 0;
        const counts = item.counts !== undefined ? item.counts : 1;
        const codeType = item.countingType || 'N/A';
        const code = item.code || '';
        const description = item.description || 'Sem descrição';
        
        const difference = countedQty - systemQty;
        const differenceClass = difference === 0 ? '' : (difference > 0 ? 'positive-diff' : 'negative-diff');
        const totalValue = countedQty * unitVal;
        
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Auditoria': 'info', 'Reposição': 'success', 'Outro': 'secondary' };
        const typeColor = typeColors[codeType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${codeType}</span></td>
                <td>${code}</td>
                <td>${description}</td>
                <td class="text-center">${systemQty}</td>
                <td class="text-center fw-bold">${countedQty}</td>
                <td class="text-center ${differenceClass}">${difference > 0 ? '+' : ''}${difference}</td>
                <td class="text-end">R$ ${unitVal.toFixed(2)}</td>
                <td class="text-end">R$ ${totalValue.toFixed(2)}</td>
                <td class="text-center">${counts}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-history" data-index="${index}" title="Ver histórico"><i class="fas fa-history"></i></button>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline-danger delete-item" data-index="${index}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                 </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.view-history').forEach(btn => {
        btn.addEventListener('click', function() {
            viewItemHistory(parseInt(this.getAttribute('data-index')));
        });
    });
    
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (confirm('Excluir este item?')) {
                inventoryItems.splice(parseInt(this.getAttribute('data-index')), 1);
                await saveInventoryData();
                renderInventoryTable();
                updateSummary();
            }
        });
    });
}

// View item history
function viewItemHistory(index) {
    const item = inventoryItems[index];
    if (!item) return;
    
    let historyHTML = '';
    if (item.history && item.history.length > 0) {
        historyHTML = '<ul class="list-unstyled">';
        item.history.forEach(record => {
            const date = new Date(record.date).toLocaleString('pt-BR');
            historyHTML += `<li><small>${date}: ${record.quantity} unidades</small></li>`;
        });
        historyHTML += '</ul>';
    } else {
        historyHTML = '<p class="text-muted">Nenhum histórico disponível.</p>';
    }
    
    alert(`Histórico: ${item.description}\n\nSistema: ${item.systemQuantity || 0}\nContado: ${item.countedQuantity || 0}\nDiferença: ${(item.countedQuantity || 0) - (item.systemQuantity || 0)}\n\n${historyHTML.replace(/<[^>]*>/g, '')}`);
}

// Filter inventory table
function filterInventoryTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryTable tr');
    
    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        let found = false;
        for (let cell of cells) {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                found = true;
                break;
            }
        }
        row.style.display = found ? '' : 'none';
    });
}

// Update summary
function updateSummary() {
    const totalItems = inventoryItems.length;
    const matchingItems = inventoryItems.filter(item => (item.countedQuantity || 0) === (item.systemQuantity || 0)).length;
    const positiveDiffItems = inventoryItems.filter(item => (item.countedQuantity || 0) > (item.systemQuantity || 0)).length;
    const negativeDiffItems = inventoryItems.filter(item => (item.countedQuantity || 0) < (item.systemQuantity || 0)).length;
    
    let totalSystemValue = 0, totalCountedValue = 0;
    inventoryItems.forEach(item => {
        totalSystemValue += (item.systemQuantity || 0) * (item.unitValue || 0);
        totalCountedValue += (item.countedQuantity || 0) * (item.unitValue || 0);
    });
    
    const totalDifferenceValue = totalCountedValue - totalSystemValue;
    
    const totalItemsEl = document.getElementById('totalItems');
    const matchingItemsEl = document.getElementById('matchingItems');
    const positiveDiffItemsEl = document.getElementById('positiveDiffItems');
    const negativeDiffItemsEl = document.getElementById('negativeDiffItems');
    const totalSystemValueEl = document.getElementById('totalSystemValue');
    const totalCountedValueEl = document.getElementById('totalCountedValue');
    const totalDifferenceValueEl = document.getElementById('totalDifferenceValue');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (matchingItemsEl) matchingItemsEl.textContent = matchingItems;
    if (positiveDiffItemsEl) positiveDiffItemsEl.textContent = positiveDiffItems;
    if (negativeDiffItemsEl) negativeDiffItemsEl.textContent = negativeDiffItems;
    if (totalSystemValueEl) totalSystemValueEl.textContent = `R$ ${totalSystemValue.toFixed(2)}`;
    if (totalCountedValueEl) totalCountedValueEl.textContent = `R$ ${totalCountedValue.toFixed(2)}`;
    
    const differenceClass = totalDifferenceValue === 0 ? '' : (totalDifferenceValue > 0 ? 'positive-diff' : 'negative-diff');
    if (totalDifferenceValueEl) totalDifferenceValueEl.innerHTML = `<span class="${differenceClass}">R$ ${totalDifferenceValue.toFixed(2)}</span>`;
}

// Export to Excel
function exportToExcel() {
    if (inventoryItems.length === 0) {
        showNotification('Não há dados para exportar', 'warning');
        return;
    }
    
    const data = [['Tipo Contagem', 'Código', 'Descrição', 'Quantidade Sistema', 'Quantidade Contada', 'Diferença', 'Valor Unitário', 'Valor Total', 'Contagens', 'Data']];
    
    inventoryItems.forEach(item => {
        const systemQty = item.systemQuantity || 0;
        const countedQty = item.countedQuantity || 0;
        const difference = countedQty - systemQty;
        const totalValue = countedQty * (item.unitValue || 0);
        const date = new Date(item.date).toLocaleDateString('pt-BR');
        data.push([item.countingType || 'N/A', item.code, item.description, systemQty, countedQty, difference, item.unitValue || 0, totalValue, item.counts || 1, date]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário');
    XLSX.writeFile(wb, 'inventario.xlsx');
    
    showNotification('Relatório exportado!', 'success');
}

// Clear all data
async function clearAllData() {
    if (!confirm('Limpar todos os dados? Esta ação não pode ser desfeita.')) return;
    
    if (currentUser && currentUser.id !== 'admin-local') {
        try {
            await supabaseClient.from('inventory_items').delete().eq('user_id', currentUser.id);
        } catch (error) {
            console.error('Erro ao limpar dados online:', error);
            showNotification('Erro ao limpar dados', 'error');
            return;
        }
    }
    
    inventoryItems = [];
    await saveInventoryData();
    renderInventoryTable();
    updateSummary();
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
    if (modal) modal.hide();
    showNotification('Dados limpos!', 'success');
}