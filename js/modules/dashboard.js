// =============================================
// DASHBOARD MODULE
// =============================================

// Update dashboard with charts and KPIs
function updateDashboard() {
    const totalItems = inventoryItems.length;
    
    if (totalItems === 0) {
        document.getElementById('kpiTotalItems').textContent = '0';
        document.getElementById('kpiAccuracy').textContent = '0%';
        document.getElementById('kpiDivergenceValue').textContent = 'R$ 0,00';
        document.getElementById('kpiProgress').textContent = '0%';
        document.getElementById('analysisTable').innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhum dado disponível para análise.</td></tr>';
        document.getElementById('criticalItemsList').innerHTML = '<p class="text-muted">Nenhum item crítico identificado.</p>';
        return;
    }
    
    const matchingItems = inventoryItems.filter(item => item.countedQuantity === item.systemQuantity).length;
    let totalDivergenceValue = 0, positiveItems = 0, negativeItems = 0;
    
    inventoryItems.forEach(item => {
        const diff = item.countedQuantity - item.systemQuantity;
        const divergenceValue = Math.abs(diff) * (item.unitValue || 0);
        totalDivergenceValue += divergenceValue;
        if (diff > 0) positiveItems++;
        else if (diff < 0) negativeItems++;
    });
    
    document.getElementById('kpiTotalItems').textContent = totalItems;
    document.getElementById('kpiAccuracy').textContent = `${((matchingItems / totalItems) * 100).toFixed(1)}%`;
    document.getElementById('kpiDivergenceValue').textContent = `R$ ${totalDivergenceValue.toFixed(2)}`;
    document.getElementById('kpiProgress').textContent = `100%`;
    
    const quantityLabels = ['Acima', 'Abaixo', 'Correto'];
    const quantityData = [positiveItems, negativeItems, matchingItems];
    const quantityColors = ['#4caf50', '#f44336', '#2196f3'];
    
    // Quantity Chart
    const ctxQuantity = document.getElementById('quantityChart').getContext('2d');
    if (quantityChart) quantityChart.destroy();
    quantityChart = new Chart(ctxQuantity, {
        type: 'bar',
        data: {
            labels: quantityLabels,
            datasets: [{
                label: 'Itens',
                data: quantityData,
                backgroundColor: quantityColors,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: totalItems } }
        }
    });
    
    // Distribution Chart
    const ctxDistribution = document.getElementById('distributionChart').getContext('2d');
    if (distributionChart) distributionChart.destroy();
    distributionChart = new Chart(ctxDistribution, {
        type: 'doughnut',
        data: {
            labels: quantityLabels,
            datasets: [{
                data: quantityData,
                backgroundColor: quantityColors,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
    
    // Timeline Chart
    const timelineLabels = inventoryItems.map(item => item.code);
    const timelineData = inventoryItems.map(item => item.countedQuantity - item.systemQuantity);
    
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: timelineLabels,
            datasets: [{
                label: 'Divergência por Item',
                data: timelineData,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: timelineData.map(v => v > 0 ? '#4caf50' : v < 0 ? '#f44336' : '#2196f3'),
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Analysis Table
    const analysisTable = document.getElementById('analysisTable');
    analysisTable.innerHTML = inventoryItems.map(item => {
        const diff = item.countedQuantity - item.systemQuantity;
        const diffValue = Math.abs(diff) * (item.unitValue || 0);
        const impactIcon = diff > 0 ? '📈' : diff < 0 ? '📉' : '✅';
        
        return `
            <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.description || 'N/A'}</td>
                <td>${item.systemQuantity || 0}</td>
                <td>${item.countedQuantity}</td>
                <td class="${diff > 0 ? 'positive-diff' : diff < 0 ? 'negative-diff' : ''}">${diff > 0 ? '+' : ''}${diff}</td>
                <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                <td>R$ ${diffValue.toFixed(2)}</td>
                <td>${impactIcon}</td>
            </tr>
        `;
    }).join('');
    
    // Critical Items
    const criticalItems = [...inventoryItems]
        .map(item => ({
            ...item,
            divergenceValue: Math.abs(item.countedQuantity - item.systemQuantity) * (item.unitValue || 0)
        }))
        .sort((a, b) => b.divergenceValue - a.divergenceValue)
        .slice(0, 3);
    
    const criticalListHtml = criticalItems.length > 0 ? criticalItems.map(item => {
        const diff = item.countedQuantity - item.systemQuantity;
        return `
            <div class="critical-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${item.code}</strong><br>
                        <small class="text-muted">${item.description || 'Sem descrição'}</small>
                    </div>
                    <span class="badge ${diff > 0 ? 'bg-success' : 'bg-danger'}">
                        ${diff > 0 ? '+' : ''}${diff}
                    </span>
                </div>
                <div class="mt-2">
                    <small>Impacto: <strong>R$ ${(Math.abs(diff) * (item.unitValue || 0)).toFixed(2)}</strong></small>
                </div>
            </div>
        `;
    }).join('') : '<p class="text-muted">Nenhum item crítico identificado.</p>';
    
    document.getElementById('criticalItemsList').innerHTML = criticalListHtml;
}

// Export dashboard data
function exportDashboardData() {
    showNotification('Funcionalidade de exportação do dashboard em desenvolvimento', 'info');
}

// =============================================
// GRÁFICO DE PRODUTIVIDADE - Versão separada
// =============================================

let productivityChart = null;

async function loadProductivityData() {
    if (!currentUser) return;
    
    try {
        const { data: items, error } = await supabaseClient
            .from('inventory_items')
            .select('user_id, system_users(full_name), counted_quantity, created_at');
        
        if (error) throw error;
        
        // Agrupar por usuário
        const userStats = {};
        items.forEach(item => {
            const userName = item.system_users?.full_name || 'Desconhecido';
            if (!userStats[userName]) {
                userStats[userName] = { total: 0, count: 0 };
            }
            userStats[userName].total += item.counted_quantity || 0;
            userStats[userName].count++;
        });
        
        const users = Object.keys(userStats);
        const totals = users.map(u => userStats[u].total);
        const counts = users.map(u => userStats[u].count);
        
        renderProductivityChart(users, totals, counts);
        renderRankings(users, totals, counts, userStats);
        
    } catch (error) {
        console.error('Erro ao carregar dados de produtividade:', error);
    }
}

function renderProductivityChart(users, totals, counts) {
    const ctx = document.getElementById('productivityChart')?.getContext('2d');
    if (!ctx) return;
    
    if (productivityChart) productivityChart.destroy();
    
    productivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: users,
            datasets: [
                {
                    label: 'Unidades Contadas',
                    data: totals,
                    backgroundColor: 'rgba(100, 116, 139, 0.7)',
                    borderColor: '#64748b',
                    borderWidth: 1,
                    yAxisID: 'y',
                    borderRadius: 8
                },
                {
                    label: 'Número de Contagens',
                    data: counts,
                    backgroundColor: 'rgba(134, 239, 172, 0.7)',
                    borderColor: '#86efac',
                    borderWidth: 1,
                    yAxisID: 'y1',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false },
                title: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Unidades', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y1: { 
                    position: 'right', 
                    beginAtZero: true, 
                    title: { display: true, text: 'Contagens', font: { weight: 'bold' } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

function renderRankings(users, totals, counts, userStats) {
    // Ranking por unidades
    const rankingUnits = users
        .map((user, i) => ({ user, total: totals[i] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    
    const rankingContainerUnits = document.getElementById('rankingByUnits');
    if (rankingContainerUnits) {
        rankingContainerUnits.innerHTML = rankingUnits.map((item, idx) => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                <div>
                    <span class="badge bg-${idx === 0 ? 'warning' : idx === 1 ? 'secondary' : idx === 2 ? 'danger' : 'light'} me-2">
                        ${idx + 1}º
                    </span>
                    <strong>${item.user}</strong>
                </div>
                <div class="text-success fw-bold">${item.total} unidades</div>
            </div>
        `).join('');
        
        if (rankingUnits.length === 0) {
            rankingContainerUnits.innerHTML = '<p class="text-muted text-center">Nenhum dado disponível</p>';
        }
    }
    
    // Ranking por contagens
    const rankingCounts = users
        .map((user, i) => ({ user, count: counts[i] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    const rankingContainerCounts = document.getElementById('rankingByCounts');
    if (rankingContainerCounts) {
        rankingContainerCounts.innerHTML = rankingCounts.map((item, idx) => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                <div>
                    <span class="badge bg-${idx === 0 ? 'warning' : idx === 1 ? 'secondary' : idx === 2 ? 'danger' : 'light'} me-2">
                        ${idx + 1}º
                    </span>
                    <strong>${item.user}</strong>
                </div>
                <div class="text-info fw-bold">${item.count} contagens</div>
            </div>
        `).join('');
        
        if (rankingCounts.length === 0) {
            rankingContainerCounts.innerHTML = '<p class="text-muted text-center">Nenhum dado disponível</p>';
        }
    }
}

// Exportar para uso global
window.loadProductivityData = loadProductivityData;

// Adicionar no updateDashboard
const originalUpdateDashboard = window.updateDashboard;
window.updateDashboard = function() {
    if (originalUpdateDashboard) originalUpdateDashboard();
    loadProductivityData();
};

// =============================================
// ALERTAS DE DIVERGÊNCIA
// =============================================

function checkDivergenceAlerts() {
    const highDivergence = inventoryItems.filter(item => {
        const diff = Math.abs(item.countedQuantity - item.systemQuantity);
        return diff > 10 && (item.unitValue * diff) > 100;
    });
    
    const alertContainer = document.getElementById('divergenceAlerts');
    if (!alertContainer) return;
    
    if (highDivergence.length === 0) {
        alertContainer.innerHTML = `
            <div class="alert alert-success mb-3">
                <i class="fas fa-check-circle me-2"></i>
                Nenhuma divergência crítica identificada.
            </div>
        `;
        return;
    }
    
    alertContainer.innerHTML = `
        <div class="alert alert-warning mb-3">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Atenção!</strong> ${highDivergence.length} item(s) com divergência significativa:
        </div>
        <div class="list-group mb-3">
            ${highDivergence.map(item => `
                <div class="list-group-item list-group-item-warning">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${item.code}</strong> - ${item.description}
                        </div>
                        <div class="text-danger">
                            Diferença: ${item.countedQuantity - item.systemQuantity > 0 ? '+' : ''}${item.countedQuantity - item.systemQuantity}
                        </div>
                    </div>
                    <small class="text-muted">
                        Sistema: ${item.systemQuantity} | Contado: ${item.countedQuantity}
                        ${item.unitValue ? ` | Impacto: R$ ${((item.countedQuantity - item.systemQuantity) * item.unitValue).toFixed(2)}` : ''}
                    </small>
                </div>
            `).join('')}
        </div>
    `;
}

// Adicionar no updateDashboard
const originalUpdateDashboardDivergence = window.updateDashboard;
window.updateDashboard = function() {
    if (originalUpdateDashboardDivergence) originalUpdateDashboardDivergence();
    checkDivergenceAlerts();
    loadProductivityData();
};