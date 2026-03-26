// =============================================
// SCANNER MODULE - Leitor de Código de Barras
// =============================================

let scannerActive = false;
let scannerStream = null;

// Iniciar scanner
async function startScanner() {
    // Verificar se já está ativo
    if (scannerActive) {
        showNotification('Scanner já está ativo', 'warning');
        return;
    }

    // Criar modal do scanner
    const scannerModalHtml = `
        <div class="modal fade" id="scannerModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-camera me-2"></i>Escanear Código de Barras
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="scanner-container" style="width: 100%; height: 400px; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 30%; border: 2px solid #00ff00; border-radius: 10px; pointer-events: none;"></div>
                        </div>
                        <p class="text-center mt-3 text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Posicione o código de barras dentro da área verde
                        </p>
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

    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', scannerModalHtml);

    // Configurar QuaggaJS
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner-video'),
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment",
                aspectRatio: { min: 1, max: 2 }
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
            ]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.error('Erro ao iniciar scanner:', err);
            showNotification('Erro ao acessar a câmera', 'error');
            return;
        }
        
        Quagga.start();
        scannerActive = true;
        showNotification('Scanner iniciado. Aponte para o código de barras.', 'success');
    });

    // Processar código detectado
    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        console.log('Código detectado:', code);
        
        // Parar scanner
        stopScanner();
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('scannerModal'));
        modal.hide();
        
        // Preencher campo de código
        const itemCodeInput = document.getElementById('itemCode');
        if (itemCodeInput) {
            itemCodeInput.value = code;
            // Disparar evento para buscar o item
            const event = new Event('input', { bubbles: true });
            itemCodeInput.dispatchEvent(event);
            showNotification(`Código escaneado: ${code}`, 'success');
        }
    });

    // Botão parar scanner
    document.getElementById('stopScannerBtn').addEventListener('click', function() {
        stopScanner();
        const modal = bootstrap.Modal.getInstance(document.getElementById('scannerModal'));
        modal.hide();
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
    if (scannerActive) {
        try {
            Quagga.stop();
            scannerActive = false;
            showNotification('Scanner parado', 'info');
        } catch (err) {
            console.error('Erro ao parar scanner:', err);
        }
    }
}

// Verificar suporte a câmera
function checkCameraSupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Adicionar botão scanner na interface
function addScannerButton() {
    const container = document.querySelector('#inventoryForm .mb-4:first-child .input-group');
    if (container && !document.getElementById('scannerButton')) {
        const scannerBtn = document.createElement('button');
        scannerBtn.id = 'scannerButton';
        scannerBtn.type = 'button';
        scannerBtn.className = 'btn btn-outline-primary';
        scannerBtn.innerHTML = '<i class="fas fa-camera"></i>';
        scannerBtn.title = 'Escanear código de barras';
        scannerBtn.style.marginLeft = '5px';
        
        scannerBtn.addEventListener('click', function() {
            if (checkCameraSupport()) {
                startScanner();
            } else {
                showNotification('Seu dispositivo não suporta câmera', 'error');
            }
        });
        
        container.appendChild(scannerBtn);
    }
}

// Inicializar scanner quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 1000);
});