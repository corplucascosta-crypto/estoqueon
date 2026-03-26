// =============================================
// INVENTORY MODULE
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
        
        inventoryItems = inventoryData || [];
        
        const localData = localStorage.getItem(`inventoryItems_${currentUser.id}`);
        if (!inventoryItems.length && localData) {
            inventoryItems = JSON.parse(localData);
        }
        
    } catch (error) {
        console.error('Erro carregar dados:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

// Save inventory data to Supabase
async function saveInventoryData() {
    try {
        if (currentUser?.id) {
            localStorage.setItem(`inventoryItems_${currentUser.id}`, JSON.stringify(inventoryItems));
        }
        
        if (navigator.onLine && currentUser && currentUser.id) {
            for (const item of inventoryItems) {
                try {
                    const payload = buildInventoryPayload(item);
                    const { data: existing, error: checkError } = await supabaseClient
                        .from('inventory_items')
                        .select('id')
                        .eq('user_id', payload.user_id)
                        .eq('code', payload.code)
                        .maybeSingle();
                    
                    if (existing && existing.id) {
                        const updatePayload = Object.assign({}, payload, { updated_at: new Date().toISOString() });
                        delete updatePayload.created_at;
                        await supabaseClient.from('inventory_items').update(updatePayload).eq('id', existing.id);
                    } else {
                        await supabaseClient.from('inventory_items').insert(payload);
                    }
                } catch (itemError) {
                    console.warn('⚠️ Erro ao sincronizar item:', item.code, itemError);
                }
            }
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
    const descricao = item.descricao || item.DESCRICAO;
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
        itemDescriptionDisplay.innerHTML += `<div class="count-history"><small>Já contado: ${existingItem.countedQuantity} unidades (${existingItem.counts} vez(es))</small></div>`;
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
    
    if (countedQuantity > 999999) {
        showNotification('Quantidade muito alta! Verifique o valor.', 'warning');
        return;
    }
    
    if (existingItemIndex !== -1) {
        currentCountedQuantity = countedQuantity;
        showItemAlreadyCountedModal();
        return;
    }
    
    await addNewInventoryItem(countedQuantity);
}

// Show modal for already counted item
function showItemAlreadyCountedModal() {
    const existingItem = inventoryItems[existingItemIndex];
    const existingCountsInfoEl = document.getElementById('existingCountsInfo');
    
    existingCountsInfoEl.innerHTML = `
        <div class="count-history-item"><strong>Contagem atual:</strong> ${existingItem.countedQuantity} unidades<br><small>Contado ${existingItem.counts} vez(es)</small></div>
        <div class="count-history-item"><strong>Nova contagem:</strong> ${currentCountedQuantity} unidades</div>
        <div class="count-history-item bg-light p-2 rounded mt-2"><strong>Resultado se SOMAR:</strong> ${existingItem.countedQuantity + currentCountedQuantity} unidades</div>
    `;
    
    new bootstrap.Modal(document.getElementById('itemAlreadyCountedModal')).show();
}

// Add new count to existing item
async function addNewCount() {
    const existingItem = inventoryItems[existingItemIndex];
    const totalCounted = existingItem.countedQuantity + currentCountedQuantity;
    
    inventoryItems[existingItemIndex] = {
        ...existingItem,
        countedQuantity: totalCounted,
        counts: existingItem.counts + 1,
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
    inventoryItems[existingItemIndex] = {
        ...inventoryItems[existingItemIndex],
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

// Add new inventory item
async function addNewInventoryItem(countedQuantity) {
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
    
    const newItem = {
        code: currentItemCode,
        description: itemDescription,
        systemQuantity: 0,
        countedQuantity: countedQuantity,
        unitValue: 0,
        counts: 1,
        countingType: currentCountingType,
        date: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), quantity: countedQuantity, type: currentCountingType }]
    };
    
    inventoryItems.push(newItem);
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

// Render inventory table
function renderInventoryTable() {
    const inventoryTable = document.getElementById('inventoryTable');
    
    if (inventoryItems.length === 0) {
        inventoryTable.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="fas fa-box-open fa-2x mb-2 d-block"></i>Nenhum item contado ainda</td></tr>`;
        return;
    }
    
    inventoryTable.innerHTML = inventoryItems.map((item, index) => {
        const difference = item.countedQuantity - item.systemQuantity;
        const differenceClass = difference === 0 ? '' : (difference > 0 ? 'positive-diff' : 'negative-diff');
        const totalValue = item.countedQuantity * item.unitValue;
        const typeColors = { 'Avaria': 'danger', 'RH': 'warning', 'Auditoria': 'info', 'Reposição': 'success', 'Outro': 'secondary' };
        const typeColor = typeColors[item.countingType] || 'secondary';
        
        return `
            <tr>
                <td><span class="badge bg-${typeColor}">${item.countingType || 'N/A'}</span></td>
                <td>${item.code}</td>
                <td>${item.description}</td>
                <td>${item.systemQuantity}</td>
                <td>${item.countedQuantity}</td>
                <td class="${differenceClass}">${difference > 0 ? '+' : ''}${difference}</td>
                <td>R$ ${item.unitValue.toFixed(2)}</td>
                <td>R$ ${totalValue.toFixed(2)}</td>
                <td>${item.counts}</td>
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
    
    alert(`Histórico de contagens para ${item.description} (${item.code}):\n\nQuantidade no sistema: ${item.systemQuantity}\nQuantidade contada: ${item.countedQuantity}\nDiferença: ${item.countedQuantity - item.systemQuantity}\n\nHistórico de contagens:\n${historyHTML.replace(/<[^>]*>/g, '')}`);
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
    const matchingItems = inventoryItems.filter(item => item.countedQuantity === item.systemQuantity).length;
    const positiveDiffItems = inventoryItems.filter(item => item.countedQuantity > item.systemQuantity).length;
    const negativeDiffItems = inventoryItems.filter(item => item.countedQuantity < item.systemQuantity).length;
    
    let totalSystemValue = 0, totalCountedValue = 0;
    inventoryItems.forEach(item => {
        totalSystemValue += item.systemQuantity * item.unitValue;
        totalCountedValue += item.countedQuantity * item.unitValue;
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
        const difference = item.countedQuantity - item.systemQuantity;
        const totalValue = item.countedQuantity * item.unitValue;
        const date = new Date(item.date).toLocaleDateString('pt-BR');
        data.push([item.countingType || 'N/A', item.code, item.description, item.systemQuantity, item.countedQuantity, difference, item.unitValue, totalValue, item.counts, date]);
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
    bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
    showNotification('Todos os dados foram limpos!', 'success');
}
// =============================================
// INTEGRA��O COM CONTAGEM COLABORATIVA
// =============================================

// Sobrescrever a fun��o addNewInventoryItem
const originalAddNewInventoryItem = addNewInventoryItem;
window.addNewInventoryItem = async function(countedQuantity) {
    if (!currentItemCode) {
        showNotification('C�digo do item n�o foi validado', 'error');
        return;
    }
    
    if (!currentCountingType) {
        showNotification('?? Selecione um tipo de contagem', 'warning');
        document.getElementById('countingType').focus();
        return;
    }
    
    let itemDescription = 'Item n�o identificado';
    const itemDescriptionDisplay = document.getElementById('itemDescriptionDisplay');
    
    try {
        const descriptionElement = itemDescriptionDisplay.querySelector('strong');
        if (descriptionElement && descriptionElement.textContent) {
            itemDescription = descriptionElement.textContent.trim();
        }
    } catch (error) {}
    
    if (itemDescription === 'Item n�o identificado') {
        try {
            const item = await findItemByCode(currentItemCode);
            if (item && item.descricao) itemDescription = item.descricao;
        } catch (error) {}
    }
    
    let unitValue = 0;
    try {
        const item = await findItemByCode(currentItemCode);
        if (item && item.valor) unitValue = item.valor;
    } catch (error) {}
    
    // Usar contagem colaborativa
    if (typeof window.addCollaborativeItem === 'function') {
        const success = await window.addCollaborativeItem(
            currentItemCode,
            itemDescription,
            countedQuantity,
            unitValue
        );
        
        if (success) {
            resetFormAfterSubmission();
            if (typeof updateDashboard === 'function') updateDashboard();
        }
    } else {
        // Fallback para contagem local
        await originalAddNewInventoryItem(countedQuantity);
    }
};
