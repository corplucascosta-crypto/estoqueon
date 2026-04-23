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

        showNotification('Iniciando migração...', 'info');

        // Mapear os dados para as colunas do Supabase
        const itemsToUpsert = [];
        
        for (const item of itemDatabase) {
            const mappedItem = {};
            
            // Mapear para "codigo" (sem acento)
            if (item.CODE) mappedItem.codigo = item.CODE.toString().trim();
            else if (item.CODIGO) mappedItem.codigo = item.CODIGO.toString().trim();
            else if (item.codigo) mappedItem.codigo = item.codigo.toString().trim();
            
            if (!mappedItem.codigo) continue;
            
            // Descrição
            if (item.DESCRICAO) mappedItem.descricao = item.DESCRICAO.toString().trim();
            else if (item.descricao) mappedItem.descricao = item.descricao.toString().trim();
            
            // Quantidade
            if (item.QUANTIDADE) mappedItem.quantidade = Number(item.QUANTIDADE) || 0;
            else if (item.quantidade) mappedItem.quantidade = Number(item.quantidade) || 0;
            
            // Valor
            if (item.VALOR) mappedItem.valor = Number(item.VALOR) || 0;
            else if (item.valor) mappedItem.valor = Number(item.valor) || 0;
            
            // DUN
            if (item.DUN) mappedItem.dun = item.DUN.toString().trim();
            else if (item.dun) mappedItem.dun = item.dun.toString().trim();
            
            // EAN
            if (item.EAN) mappedItem.ean = item.EAN.toString().trim();
            else if (item.ean) mappedItem.ean = item.ean.toString().trim();
            
            // Embalagem
            if (item.EMBALAGEM) mappedItem.embalagem = item.EMBALAGEM.toString().trim();
            else if (item.embalagem) mappedItem.embalagem = item.embalagem.toString().trim();
            
            itemsToUpsert.push(mappedItem);
        }

        if (itemsToUpsert.length === 0) {
            showNotification('Nenhum item válido para migrar.', 'error');
            return;
        }

        console.log('Primeiros itens para migrar:', itemsToUpsert.slice(0, 2));
        
        // Migrar em lotes
        const BATCH_SIZE = 50;
        let successfulMigrations = 0;

        for (let i = 0; i < itemsToUpsert.length; i += BATCH_SIZE) {
            const batch = itemsToUpsert.slice(i, i + BATCH_SIZE);
            
            const { error } = await supabaseClient
                .from('products_base')
                .upsert(batch, { onConflict: 'codigo' });

            if (error) {
                console.error(`Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
                throw new Error(`Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`);
            }

            successfulMigrations += batch.length;
            console.log(`${successfulMigrations}/${itemsToUpsert.length} itens migrados`);
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