// =============================================
// DATABASE IMPORT/EXPORT MODULE
// =============================================

// Preview Excel file
function previewExcelFile() {
    const file = document.getElementById('excelFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const previewTable = document.querySelector('#previewTable tbody');
        previewTable.innerHTML = '';
        
        const maxRows = Math.min(5, jsonData.length);
        for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < jsonData[i].length; j++) {
                const cell = document.createElement('td');
                cell.textContent = jsonData[i][j] || '';
                row.appendChild(cell);
            }
            previewTable.appendChild(row);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Import Excel data
async function importExcelData() {
    const file = document.getElementById('excelFile').files[0];
    if (!file) {
        showNotification('Por favor, selecione um arquivo Excel.', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            const mappedData = jsonData.map(row => {
                const mappedRow = {};
                for (const key in row) {
                    const normalizedKey = key.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    
                    if (normalizedKey.includes('CODIGO') || normalizedKey.includes('COD')) {
                        mappedRow.CODE = row[key]?.toString() || '';
                    } else if (normalizedKey.includes('DESCRICAO') || normalizedKey.includes('DESC')) {
                        mappedRow.DESCRICAO = row[key]?.toString() || '';
                    } else if (normalizedKey.includes('QUANTIDADE') || normalizedKey.includes('QTD')) {
                        mappedRow.QUANTIDADE = parseFloat(row[key]) || 0;
                    } else if (normalizedKey.includes('VALOR') || normalizedKey.includes('PRECO')) {
                        mappedRow.VALOR = parseFloat(row[key]) || 0;
                    } else if (normalizedKey.includes('DUN')) {
                        mappedRow.DUN = row[key]?.toString() || '';
                    } else if (normalizedKey.includes('EAN')) {
                        mappedRow.EAN = row[key]?.toString() || '';
                    } else if (normalizedKey.includes('EMBALAGEM') || normalizedKey.includes('EMB')) {
                        mappedRow.EMBALAGEM = row[key]?.toString() || '';
                    }
                }
                return mappedRow;
            });
            
            itemDatabase = mappedData.filter(item => item.CODE && item.DESCRICAO);
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            showNotification(`Base de dados importada com sucesso! ${itemDatabase.length} itens carregados.`, 'success');
        } catch (error) {
            console.error('Erro ao importar arquivo:', error);
            showNotification('Erro ao importar arquivo. Verifique o formato.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Migrate to permanent base
async function migrateToPermanentBase() {
    if (!itemDatabase || itemDatabase.length === 0) {
        showNotification('Não há dados para migrar.', 'warning');
        return;
    }
    
    if (!navigator.onLine) {
        showNotification('Sem conexão com a internet.', 'error');
        return;
    }
    
    const button = document.getElementById('migrateBaseBtn');
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Migrando...';
        button.disabled = true;
        
        const { data: tableStructure, error: structureError } = await supabaseClient
            .from('products_base')
            .select('*')
            .limit(1);
        
        let availableColumns = [];
        if (structureError) {
            throw new Error(`Tabela inacessível: ${structureError.message}`);
        } else if (tableStructure && tableStructure.length > 0) {
            availableColumns = Object.keys(tableStructure[0]);
        } else {
            availableColumns = ['code', 'descricao', 'quantidade', 'valor', 'dun', 'ean', 'embalagem'];
        }
        
        const conflictColumn = availableColumns.includes('CODE') ? 'CODE' : 
                              availableColumns.includes('code') ? 'code' : 'code';
        
        const itemsToUpsert = [];
        const codeCounter = new Map();
        
        itemDatabase.forEach((item, index) => {
            const codeBase = (item.CODE || item.CODIGO)?.toString().trim();
            if (!codeBase) return;
            
            const count = (codeCounter.get(codeBase) || 0) + 1;
            codeCounter.set(codeBase, count);
            const codeUnico = count > 1 ? `${codeBase}_DUP${count}` : codeBase;
            
            const mappedItem = {};
            availableColumns.forEach(col => {
                const upperCol = col.toUpperCase();
                if (upperCol === 'CODE' || upperCol === 'CODIGO') {
                    mappedItem[col] = codeUnico;
                } else if (upperCol === 'DESCRICAO' || upperCol === 'DESCRIPTION') {
                    const descricaoBase = item.DESCRICAO?.toString().trim() || item.DESCRIPTION?.toString().trim() || '';
                    mappedItem[col] = count > 1 ? `${descricaoBase} [DUPLICATA ${count}]` : descricaoBase;
                } else if (upperCol === 'QUANTIDADE' || upperCol === 'QUANTITY' || upperCol === 'SYSTEM_QUANTITY') {
                    mappedItem[col] = Number(item.QUANTIDADE || item.QUANTITY || item.SYSTEM_QUANTITY) || 0;
                } else if (upperCol === 'VALOR' || upperCol === 'VALUE' || upperCol === 'UNIT_VALUE') {
                    mappedItem[col] = Number(item.VALOR || item.VALUE || item.UNIT_VALUE) || 0;
                } else if (upperCol === 'DUN') {
                    mappedItem[col] = item.DUN?.toString().trim() || null;
                } else if (upperCol === 'EAN') {
                    mappedItem[col] = item.EAN?.toString().trim() || null;
                } else if (upperCol === 'EMBALAGEM' || upperCol === 'PACKAGING') {
                    mappedItem[col] = item.EMBALAGEM?.toString().trim() || item.PACKAGING?.toString().trim() || null;
                }
            });
            itemsToUpsert.push(mappedItem);
        });
        
        if (itemsToUpsert.length === 0) {
            showNotification('Nenhum item válido para migrar.', 'error');
            return;
        }
        
        const BATCH_SIZE = 100;
        let successfulMigrations = 0;
        
        for (let i = 0; i < itemsToUpsert.length; i += BATCH_SIZE) {
            const batch = itemsToUpsert.slice(i, i + BATCH_SIZE);
            const { data, error } = await supabaseClient
                .from('products_base')
                .upsert(batch, { onConflict: conflictColumn });
            
            if (error) throw new Error(`Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`);
            successfulMigrations += batch.length;
        }
        
        showNotification(`Migração concluída! ${successfulMigrations} produtos migrados.`, 'success');
        
    } catch (error) {
        console.error('Erro na migração:', error);
        showNotification('Erro na migração: ' + error.message, 'error');
    } finally {
        button.innerHTML = '<i class="fas fa-upload me-1"></i>Migrar para Online';
        button.disabled = false;
    }
}