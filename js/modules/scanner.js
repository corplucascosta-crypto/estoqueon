// =============================================
// SCANNER MODULE - Leitor de Código de Barras
// =============================================

let scannerActive = false;

// Função para adicionar o botão de scanner
function addScannerButton() {
    console.log('🔍 Tentando adicionar botão scanner...');
    
    // Aguardar o DOM carregar
    setTimeout(() => {
        const inputGroup = document.querySelector('#itemCode');
        if (!inputGroup) {
            console.log('❌ Campo itemCode não encontrado');
            return;
        }
        
        // Verificar se o botão já existe
        if (document.getElementById('scannerButton')) {
            console.log('✅ Botão scanner já existe');
            return;
        }
        
        // Criar o botão
        const scannerBtn = document.createElement('button');
        scannerBtn.id = 'scannerButton';
        scannerBtn.type = 'button';
        scannerBtn.className = 'btn btn-outline-primary ms-2';
        scannerBtn.innerHTML = '<i class="fas fa-camera"></i>';
        scannerBtn.title = 'Escanear código de barras';
        scannerBtn.style.padding = '0.75rem 1rem';
        
        scannerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📷 Botão scanner clicado');
            if (checkCameraSupport()) {
                startScanner();
            } else {
                showNotification('Seu dispositivo não suporta câmera', 'error');
            }
        });
        
        // Inserir após o input
        inputGroup.insertAdjacentElement('afterend', scannerBtn);
        console.log('✅ Botão scanner adicionado com sucesso');
        
    }, 1000);
}

// Verificar suporte a câmera
function checkCameraSupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Iniciar scanner
function startScanner() {
    console.log('📷 Iniciando scanner...');
    
    // Verificar se Quagga está disponível
    if (typeof Quagga === 'undefined') {
        console.error('❌ Quagga não carregado');
        showNotification('Erro: Biblioteca do scanner não carregada', 'error');
        return;
    }
    
    // Criar modal do scanner
    const scannerModalHtml = `
        <div class="modal fade" id="scannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-camera me-2"></i>Escanear Código de Barras
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="scanner-container" style="width: 100%; height: 400px; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70%; height: 25%; border: 2px solid #00ff00; border-radius: 10px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        </div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                Posicione o código de barras dentro da área verde
                            </p>
                            <small class="text-muted">Formatos suportados: EAN, UPC, Code128, Code39</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" id="stopScannerBtn">
                            <i class="fas fa-stop me-1"></i>Parar Scanner
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('scannerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', scannerModalHtml);
    
    // Inicializar Quagga
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner-video'),
            constraints: {
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 },
                facingMode: "environment",
                aspectRatio: { ideal: 1.333 }
            }
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_93_reader",
                "upc_reader",
                "upc_e_reader",
                "codabar_reader"
            ],
            debug: {
                drawBoundingBox: true,
                showFrequency: false,
                drawScanline: true,
                showPattern: false
            }
        },
        locate: true
    }, function(err) {
        if (err) {
            console.error('❌ Erro ao iniciar scanner:', err);
            showNotification('Erro ao acessar a câmera', 'error');
            document.getElementById('scannerModal').remove();
            return;
        }
        
        Quagga.start();
        scannerActive = true;
        console.log('✅ Scanner iniciado com sucesso');
        showNotification('Scanner iniciado. Aponte para o código de barras.', 'success');
    });
    
    // Processar código detectado
    Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            console.log('📦 Código detectado:', code);
            
            // Parar scanner
            stopScanner();
            
            // Fechar modal
            const modalElement = document.getElementById('scannerModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                modalElement.remove();
            }
            
            // Preencher campo de código
            const itemCodeInput = document.getElementById('itemCode');
            if (itemCodeInput) {
                itemCodeInput.value = code;
                // Disparar evento para buscar o item
                const event = new Event('input', { bubbles: true });
                itemCodeInput.dispatchEvent(event);
                showNotification(`✅ Código escaneado: ${code}`, 'success');
            }
        }
    });
    
    // Botão parar scanner
    document.getElementById('stopScannerBtn').addEventListener('click', function() {
        stopScanner();
        const modalElement = document.getElementById('scannerModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            modalElement.remove();
        }
    });
    
    // Quando fechar modal, parar scanner
    document.getElementById('scannerModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('scannerModal'));
    modal.show();
}

// Parar scanner
function stopScanner() {
    if (scannerActive && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            scannerActive = false;
            console.log('✅ Scanner parado');
        } catch (err) {
            console.error('Erro ao parar scanner:', err);
        }
    }
}

// Função para mostrar notificação (caso não exista)
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Se a função global existir, usar ela
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando módulo scanner...');
    addScannerButton();
});

// Também tentar adicionar após mudança de tela
document.addEventListener('viewChanged', function() {
    setTimeout(addScannerButton, 500);
});