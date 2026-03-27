// =============================================
// PRODUCTIVITY MODULE - Módulo isolado
// =============================================

let productivityChart = null;

async function loadProductivityData() {
    console.log('📈 Carregando gráfico de produtividade...');
    
    if (!currentUser) return;
    
    try {
        const { data: items, error } = await supabaseClient
            .from('inventory_items')
            .select('user_id, system_users(full_name), counted_quantity, created_at');
        
        if (error) throw error;
        
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
        const chartContainer = document.getElementById('productivityChart');
        if (chartContainer) {
            chartContainer.parentElement.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados de produtividade</div>';
        }
    }
}

function renderProductivityChart(users, totals, counts) {
    const canvas = document.getElementById('productivityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (productivityChart) productivityChart.destroy();
    
    productivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: users,
            datasets: [
                {
                    label: 'Unidades Contadas',
                    data: totals,
                    backgroundColor: 'rgba(100, 116, 139, 0.8)',
                    borderColor: '#64748b',
                    borderWidth: 1,
                    yAxisID: 'y',
                    borderRadius: 8,
                    barPercentage: 0.6
                },
                {
                    label: 'Número de Contagens',
                    data: counts,
                    backgroundColor: 'rgba(134, 239, 172, 0.8)',
                    borderColor: '#86efac',
                    borderWidth: 1,
                    yAxisID: 'y1',
                    borderRadius: 8,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 } } },
                tooltip: { mode: 'index', intersect: false }
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
        if (rankingUnits.length === 0) {
            rankingContainerUnits.innerHTML = '<p class="text-muted text-center py-4">Nenhum dado disponível</p>';
        } else {
            rankingContainerUnits.innerHTML = rankingUnits.map((item, idx) => `
                <div class="d-flex justify-content-between align-items-center p-3 border-bottom hover-bg-light">
                    <div>
                        <span class="badge ${idx === 0 ? 'bg-warning' : idx === 1 ? 'bg-secondary' : idx === 2 ? 'bg-danger' : 'bg-light text-dark'} me-2 px-3 py-2">
                            ${idx + 1}º
                        </span>
                        <strong class="ms-1">${item.user}</strong>
                    </div>
                    <div class="text-success fw-bold fs-5">${item.total} <small class="text-muted fs-6">unidades</small></div>
                </div>
            `).join('');
        }
    }
    
    // Ranking por contagens
    const rankingCounts = users
        .map((user, i) => ({ user, count: counts[i] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    const rankingContainerCounts = document.getElementById('rankingByCounts');
    if (rankingContainerCounts) {
        if (rankingCounts.length === 0) {
            rankingContainerCounts.innerHTML = '<p class="text-muted text-center py-4">Nenhum dado disponível</p>';
        } else {
            rankingContainerCounts.innerHTML = rankingCounts.map((item, idx) => `
                <div class="d-flex justify-content-between align-items-center p-3 border-bottom hover-bg-light">
                    <div>
                        <span class="badge ${idx === 0 ? 'bg-warning' : idx === 1 ? 'bg-secondary' : idx === 2 ? 'bg-danger' : 'bg-light text-dark'} me-2 px-3 py-2">
                            ${idx + 1}º
                        </span>
                        <strong class="ms-1">${item.user}</strong>
                    </div>
                    <div class="text-info fw-bold fs-5">${item.count} <small class="text-muted fs-6">contagens</small></div>
                </div>
            `).join('');
        }
    }
}

// Exportar para uso global
window.loadProductivityData = loadProductivityData;

console.log('✅ productivity.js carregado - módulo isolado');