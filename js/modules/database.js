// =============================================
// DATABASE MODULE - Import/Export
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

// Migrate to permanent base - Versão corrigida para permitir duplicatas
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

        // Criar chave única combinando código + DUN + EAN
        const itemsToInsert = [];
        const itemsUpdate = [];
        
        for (const item of itemDatabase) {
            let codigo = null;
            
            if (item.CODE) codigo = item.CODE.toString().trim();
            else if (item.CODIGO) codigo = item.CODIGO.toString().trim();
            else if (item.codigo) codigo = item.codigo.toString().trim();
            
            if (!codigo) continue;
            
            const dun = (item.DUN || item.dun || '').toString().trim() || null;
            const ean = (item.EAN || item.ean || '').toString().trim() || null;
            
            // Criar chave única para identificar duplicatas
            const uniqueKey = dun ? `${codigo}_DUN_${dun}` : (ean ? `${codigo}_EAN_${ean}` : codigo);
            
            const mappedItem = {
                codigo: codigo,
                descricao: (item.DESCRICAO || item.descricao || '').toString().trim(),
                quantidade: Number(item.QUANTIDADE || item.quantidade || 0),
                valor: Number(item.VALOR || item.valor || 0),
                dun: dun,
                ean: ean,
                embalagem: (item.EMBALAGEM || item.embalagem || '').toString().trim() || null
            };
            
            // Verificar se já existe no banco
            let query = supabaseClient
                .from('products_base')
                .select('codigo')
                .eq('codigo', codigo);
            
            if (dun) {
                query = query.eq('dun', dun);
            } else if (ean) {
                query = query.eq('ean', ean);
            }
            
            const { data: existing } = await query.maybeSingle();
            
            if (existing) {
                itemsUpdate.push(mappedItem);
            } else {
                itemsToInsert.push(mappedItem);
            }
        }

        console.log(`📦 ${itemsToInsert.length} novos itens para inserir`);
        console.log(`📦 ${itemsUpdate.length} itens para atualizar`);

        // Inserir novos itens
        let insertedCount = 0;
        let updatedCount = 0;

        for (const item of itemsToInsert) {
            try {
                const { error } = await supabaseClient
                    .from('products_base')
                    .insert(item);
                
                if (!error) insertedCount++;
                else console.warn(`Erro ao inserir ${item.codigo}:`, error);
            } catch (err) {
                console.warn(`Erro no item ${item.codigo}:`, err);
            }
        }

        // Atualizar itens existentes
        for (const item of itemsUpdate) {
            try {
                let query = supabaseClient
                    .from('products_base')
                    .update({
                        descricao: item.descricao,
                        quantidade: item.quantidade,
                        valor: item.valor,
                        embalagem: item.embalagem,
                        updated_at: new Date().toISOString()
                    })
                    .eq('codigo', item.codigo);
                
                if (item.dun) {
                    query = query.eq('dun', item.dun);
                } else if (item.ean) {
                    query = query.eq('ean', item.ean);
                }
                
                const { error } = await query;
                
                if (!error) updatedCount++;
                else console.warn(`Erro ao atualizar ${item.codigo}:`, error);
            } catch (err) {
                console.warn(`Erro no item ${item.codigo}:`, err);
            }
        }

        showNotification(`Migração concluída! ${insertedCount} inseridos, ${updatedCount} atualizados.`, 'success');

    } catch (error) {
        console.error('Erro na migração:', error);
        showNotification('Erro na migração: ' + error.message, 'error');
    } finally {
        button.innerHTML = '<i class="fas fa-upload me-1"></i>Migrar para Online';
        button.disabled = false;
    }
}
