// =============================================
// SCANNER MODULE - Versão Simplificada
// =============================================

console.log('🚀 Módulo scanner carregado!');

// Função para adicionar o botão
function addScannerButton() {
    console.log('🔍 Tentando adicionar botão...');
    
    // Encontrar o input de código
    const itemCodeInput = document.getElementById('itemCode');
    if (!itemCodeInput) {
        console.log('❌ Input itemCode não encontrado');
        return false;
    }
    
    // Verificar se botão já existe
    if (document.getElementById('scannerBtn')) {
        console.log('✅ Botão já existe');
        return true;
    }
    
    // Criar botão
    const btn = document.createElement('button');
    btn.id = 'scannerBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary';
    btn.innerHTML = '📷';
    btn.title = 'Escanear código';
    btn.style.marginLeft = '10px';
    btn.style.padding = '8px 15px';
    btn.style.fontSize = '18px';
    
    // Adicionar evento de clique
    btn.onclick = function() {
        alert('Scanner em desenvolvimento!\n\nDigite o código manualmente por enquanto.');
    };
    
    // Inserir depois do input
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
    console.log('✅ Botão adicionado!');
    return true;
}

// Tentar adicionar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('📷 DOM carregado, adicionando botão...');
    setTimeout(addScannerButton, 1000);
});

// Tentar novamente após 2 segundos
setTimeout(function() {
    if (!document.getElementById('scannerBtn')) {
        console.log('🔄 Tentando adicionar botão novamente...');
        addScannerButton();
    }
}, 2000);