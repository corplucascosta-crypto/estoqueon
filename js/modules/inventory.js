// =============================================
// INVENTORY MODULE - Versão Estável Corrigida
// =============================================

// Load user data from Supabase
async function loadUserData() {
    try {
        if (!currentUser || !currentUser.id) {
            inventoryItems = [];
            return;
        }
        
        const { data: inventoryData, error: inventoryError } = await supabaseClient
            .from('inventory_items')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (inventoryError) throw inventoryError;
        
        // Garantir que todos os itens tenham valores padrão
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
        
        const localData = localStorage.getItem(`inventoryItems_${currentUser.id}`);
        if (!inventoryItems.length && localData) {
            inventoryItems = JSON.parse(localData);
        }
        
    } catch (error) {
        console.error('Erro carregar dados:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

// Save inventory data to Supabase - Versão corrigida
async function saveInventoryData() {
    try {
        // Primeiro, salvar no localStorage como backup
        if (currentUser?.id) {
            localStorage.setItem(`inventoryItems_${currentUser.id}`, JSON.stringify(inventoryItems));
            console.log('💾 Dados salvos no localStorage para usuário:', currentUser.id);
        }
        
        // Se estiver online e usuário logado, salvar no Supabase
        if (navigator.onLine && currentUser && currentUser.id) {
            console.log('☁️ Sincronizando com Supabase...', inventoryItems.length, 'itens');
            
            for (const item of inventoryItems) {
                try {
                    const payload = {
                        code: item.code,
                        description: item.description || 'Sem descrição',
                        system_quantity: item.systemQuantity || 0,
                        counted_quantity: item.countedQuantity || 0,
                        unit_value: item.unitValue || 0,
                        counts: item.counts || 1,
                        counting_type: item.countingType || 'Outro',
                        user_id: currentUser.id,
                        created_at: item.date || new Date().toISOString()
                    };
                    
                    console.log('📤 Salvando item:', payload.code, 'para usuário:', payload.user_id);
                    
                    // Verificar se o item já existe para este usuário
                    const { data: existing, error: checkError } = await supabaseClient
                        .from('inventory_items')
                        .select('id')
                        .eq('user_id', payload.user_id)
                        .eq('code', payload.code)
                        .maybeSingle();
                    
                    if (checkError) {
                        console.warn('Erro ao verificar existência:', checkError);
                    }
                    
                    if (existing && existing.id) {
                        // Atualizar item existente
                        const { error: updateError } = await supabaseClient
                            .from('inventory_items')
                            .update(payload)
                            .eq('id', existing.id);
                        
                        if (updateError) {
                            console.error('Erro ao atualizar:', updateError);
                        } else {
                            console.log('✅ Item atualizado:', payload.code);
                        }
                    } else {
                        // Inserir novo item
                        const { error: insertError } = await supabaseClient
                            .from('inventory_items')
                            .insert(payload);
                        
                        if (insertError) {
                            console.error('Erro ao inserir:', insertError);
                        } else {
                            console.log('✅ Item inserido:', payload.code);
                        }
                    }
                } catch (itemError) {
                    console.error('⚠️ Erro ao sincronizar item:', item.code, itemError);
                }
            }
            
            console.log('✅ Sincronização concluída');
        } else {
            console.log('📴 Offline ou sem usuário - dados salvos apenas localmente');
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
        
        const candidateCols = ['code', 'codigo', 'cod', 'dun', 'ean', 'gtin'];
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
    
    if (code.length >= 8) {
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
        }, 300);
    } else if (code.length > 0 && code.length < 8) {
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
        showNotification(`✏️ Sessão de contagem iniciada: ${countingType}`, 'info');
    } else {
        currentCountingType = '';
        countingSessionActive = false;
        finalizeBtn.style.display = 'none';
        sessionStatus.style.display = 'none';
        showNotification('⚠️ Selecione um tipo de contagem', 'warning');
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
        showNotification('Quantidade muito alta! Verifique o valor.', 'warning');
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
    showNotification('Nova contagem adicionada com sucesso! Total: ' + totalCounted + ' unidades', 'success');
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
    showNotification('Contagem substituída com sucesso!', 'success');
}

// Add new inventory item - Versão corrigida
async function addNewInventoryItem(countedQuantity) {
    console.log('📝 addNewInventoryItem chamada com:', countedQuantity);
    
    if (!currentItemCode) {
        showNotification('Código do item não foi validado', 'error');
        return;
    }
    
    if (!currentCountingType) {
        showNotification('⚠️ Selecione um tipo de contagem', 'warning');
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
        if (item && item.VALOR) unitValue = parseFloat(item.VALOR) || 0;
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
    
    inventoryItems.push(newItem);
    console.log('✅ Item adicionado ao array:', inventoryItems.length);
    
    await saveInventoryData();
    resetFormAfterSubmission();
    renderInventoryTable();
    updateSummary();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    showNotification(`✅ "${itemDescription}" registrado com sucesso!`, 'success');
}

// Reset form after submission
function resetFormAfterSubmission() {
    const itemCodeInput = document.getElementById('itemCode');
    itemCodeInput.value = '';
    resetItemForm();
    setTimeout(() => itemCodeInput.focus(), 100);
}

function resetFormAfterSubmission() {
    const itemCodeInput = document.getElementById('itemCode');
    const countedQuantityInput = document.getElementById('countedQuantity');
    
    itemCodeInput.value = '';
    countedQuantityInput.value = '';
    resetItemForm();
    
    // Foco automático no campo de código
    setTimeout(() => {
        itemCodeInput.focus();
        itemCodeInput.select();
    }, 100);
}

// Handle finalize counting session
async function handleFinalizeCountingSession() {
    if (!countingSessionActive || inventoryItems.length === 0) {
        showNotification('⚠️ Nenhum item contado nesta sessão', 'warning');
        return;
    }
    
    const countingType = currentCountingType;
    const itemCount = inventoryItems.filter(item => item.countingType === countingType).length;
    
    if (confirm(`Tem certeza que deseja finalizar esta contagem?\n\nTipo: ${countingType}\nItens: ${itemCount}`)) {
        try {
            await saveInventoryData();
            const sessionLog = {
                type: countingType,
                itemsCount: itemCount,
                finalizedAt: new Date().toISOString(),
                userId: currentUser?.id
            };
            let sessionHistory = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
            sessionHistory.push(sessionLog);
            localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
            
            document.getElementById('countingType').value = '';
            currentCountingType = '';
            countingSessionActive = false;
            document.getElementById('finalizeCountingBtn').style.display = 'none';
            document.getElementById('sessionStatus').style.display = 'none';
            
            showNotification(`✅ Contagem "${countingType}" finalizada com sucesso! (${itemCount} itens)`, 'success');
        } catch (error) {
            console.error('Erro ao finalizar contagem:', error);
            showNotification('Erro ao finalizar contagem', 'error');
        }
    }
}

// Render inventory table - Versão corrigida com tratamento de undefined
function renderInventoryTable() {
    const inventoryTable = document.getElementById('inventoryTable');
    
    if (!inventoryItems || inventoryItems.length === 0) {
        inventoryTable.innerHTML = `一线<td colspan="10" class="text-center text-muted py-4"><i class="fas fa-box-open fa-2x mb-2 d-block"></i>Nenhum item contado ainda</td></tr>`;
        return;
    }
    
    inventoryTable.innerHTML = inventoryItems.map((item, index) => {
        // Garantir que todos os valores existem
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
                <td>${systemQty}</td>
                <td>${countedQty}</td>
                <td class="${differenceClass}">${difference > 0 ? '+' : ''}${difference}</td>
                <td>R$ ${unitVal.toFixed(2)}</td>
                <td>R$ ${totalValue.toFixed(2)}</td>
                <td>${counts}</td>
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
            if (confirm('Tem certeza que deseja excluir este item?')) {
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
    
    alert(`Histórico de contagens para ${item.description} (${item.code}):\n\nQuantidade no sistema: ${item.systemQuantity || 0}\nQuantidade contada: ${item.countedQuantity || 0}\nDiferença: ${(item.countedQuantity || 0) - (item.systemQuantity || 0)}\n\nHistórico de contagens:\n${historyHTML.replace(/<[^>]*>/g, '')}`);
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
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('matchingItems').textContent = matchingItems;
    document.getElementById('positiveDiffItems').textContent = positiveDiffItems;
    document.getElementById('negativeDiffItems').textContent = negativeDiffItems;
    document.getElementById('totalSystemValue').textContent = `R$ ${totalSystemValue.toFixed(2)}`;
    document.getElementById('totalCountedValue').textContent = `R$ ${totalCountedValue.toFixed(2)}`;
    
    const differenceClass = totalDifferenceValue === 0 ? '' : (totalDifferenceValue > 0 ? 'positive-diff' : 'negative-diff');
    document.getElementById('totalDifferenceValue').innerHTML = `<span class="${differenceClass}">R$ ${totalDifferenceValue.toFixed(2)}</span>`;
}

// Export to Excel
function exportToExcel() {
    if (inventoryItems.length === 0) {
        showNotification('Não há dados para exportar.', 'warning');
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
    
    showNotification('Relatório exportado com sucesso!', 'success');
}

// Clear all data
async function clearAllData() {
    if (currentUser && currentUser.id !== 'local-admin') {
        try {
            await supabaseClient.from('inventory_items').delete().eq('user_id', currentUser.id);
        } catch (error) {
            console.error('Erro limpar dados online:', error);
            showNotification('Erro ao limpar dados online', 'error');
            return;
        }
    }
    
    inventoryItems = [];
    await saveInventoryData();
    renderInventoryTable();
    updateSummary();
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
    if (modal) modal.hide();
    showNotification('Todos os dados foram limpos!', 'success');
}

// =============================================
// MODO RÁPIDO - Contagem por Lote
// =============================================

let quickModeActive = false;
let quickModeBuffer = [];

function toggleQuickMode() {
    quickModeActive = !quickModeActive;
    const btn = document.getElementById('quickModeBtn');
    const status = document.getElementById('quickModeStatus');
    
    if (quickModeActive) {
        btn?.classList.add('btn-warning');
        btn?.classList.remove('btn-outline-secondary');
        if (status) {
            status.innerHTML = '<span class="badge bg-warning text-dark">⚡ Modo Rápido ATIVO</span>';
            status.style.display = 'inline-block';
        }
        showNotification('Modo Rápido ativado! Escaneie vários itens do mesmo produto.', 'success');
    } else {
        btn?.classList.remove('btn-warning');
        btn?.classList.add('btn-outline-secondary');
        if (status) status.style.display = 'none';
        showNotification('Modo Rápido desativado.', 'info');
    }
}

async function addBatchItem(countedQuantity) {
    if (!quickModeActive) return false;
    
    if (!currentItemCode) {
        showNotification('Código do item não foi validado', 'error');
        return false;
    }
    
    quickModeBuffer.push({
        code: currentItemCode,
        quantity: countedQuantity,
        timestamp: new Date().toISOString()
    });
    
    showNotification(`📦 +${countedQuantity} adicionado ao lote (${quickModeBuffer.length} itens no lote)`, 'success');
    
    // Limpar e focar para próximo
    document.getElementById('itemCode').value = '';
    document.getElementById('countedQuantity').value = '';
    document.getElementById('itemCode').focus();
    
    return true;
}

async function commitBatch() {
    if (quickModeBuffer.length === 0) {
        showNotification('Nenhum item no lote para salvar', 'warning');
        return;
    }
    
    showNotification(`💾 Salvando ${quickModeBuffer.length} itens...`, 'info');
    
    for (const batchItem of quickModeBuffer) {
        // Buscar descrição do item
        let description = 'Item não identificado';
        let unitValue = 0;
        try {
            const item = await findItemByCode(batchItem.code);
            if (item) {
                description = item.descricao || item.DESCRICAO || 'Item não identificado';
                unitValue = item.valor || item.VALOR || 0;
            }
        } catch(e) {}
        
        // Adicionar item
        const newItem = {
            code: batchItem.code,
            description: description,
            systemQuantity: 0,
            countedQuantity: batchItem.quantity,
            unitValue: unitValue,
            counts: 1,
            countingType: currentCountingType,
            date: new Date().toISOString(),
            history: [{ date: new Date().toISOString(), quantity: batchItem.quantity, type: currentCountingType }]
        };
        
        const existingIndex = inventoryItems.findIndex(i => i.code === batchItem.code);
        if (existingIndex !== -1) {
            inventoryItems[existingIndex].countedQuantity += batchItem.quantity;
            inventoryItems[existingIndex].counts += 1;
        } else {
            inventoryItems.push(newItem);
        }
    }
    
    await saveInventoryData();
    renderInventoryTable();
    updateSummary();
    
    showNotification(`✅ Lote salvo! ${quickModeBuffer.length} itens adicionados.`, 'success');
    quickModeBuffer = [];
}