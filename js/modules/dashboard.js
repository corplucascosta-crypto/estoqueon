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