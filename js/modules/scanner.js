// =============================================
// SCANNER MODULE - Quagga Otimizado para Mobile
// =============================================

let scannerActive = false;

function addScannerButton() {
    const itemCodeInput = document.getElementById('itemCode');
    if (!itemCodeInput) return;
    if (document.getElementById('scannerBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'scannerBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary ms-2';
    btn.innerHTML = '<i class="fas fa-camera"></i>';
    btn.title = 'Escanear código de barras';
    btn.style.padding = '0.75rem 1rem';
    btn.onclick = startScanner;
    
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
    console.log('✅ Botão scanner adicionado');
}

function startScanner() {
    if (scannerActive) return;
    if (typeof Quagga === 'undefined') {
        alert('Scanner não disponível. Tente novamente.');
        return;
    }
    
    const modalHtml = `
        <div class="modal fade" id="scannerModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6">
                            <i class="fas fa-camera me-2"></i>Escanear Código de Barras
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="scanner-container" style="width: 100%; height: 70vh; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-guide"></div>
                        </div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 small">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                Posicione o código dentro da área verde
                            </p>
                            <small class="text-muted">EAN-13, EAN-8, UPC, Code128, Code39</small>
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-danger btn-sm" id="stopScannerBtn">
                            <i class="fas fa-stop me-1"></i>Parar
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('scannerModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('scannerModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
    
    // Aguardar o modal abrir completamente
    setTimeout(() => {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scanner-video'),
                constraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "code_128_reader",
                    "code_39_reader"
                ]
            },
            locate: true,
            numOfWorkers: navigator.hardwareConcurrency || 2
        }, function(err) {
            if (err) {
                console.error('Erro ao iniciar scanner:', err);
                alert('Erro ao acessar a câmera');
                modal.hide();
                return;
            }
            
            Quagga.start();
            scannerActive = true;
            console.log('✅ Scanner iniciado');
        });
        
        Quagga.onDetected(function(result) {
            if (result && result.codeResult && result.codeResult.code) {
                const code = result.codeResult.code;
                console.log('📦 Código detectado:', code);
                
                const itemCodeInput = document.getElementById('itemCode');
                if (itemCodeInput) {
                    itemCodeInput.value = code;
                    itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                stopScanner();
                modal.hide();
                showNotification(`✅ Código: ${code}`, 'success');
            }
        });
    }, 500);
    
    document.getElementById('stopScannerBtn').addEventListener('click', function() {
        stopScanner();
        modal.hide();
    });
    
    document.getElementById('scannerModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function stopScanner() {
    if (scannerActive && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            scannerActive = false;
            console.log('✅ Scanner parado');
        } catch(e) {
            console.error('Erro ao parar scanner:', e);
        }
    }
}

function showNotification(message, type) {
    console.log(message);
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
    alertDiv.style.zIndex = 9999;
    alertDiv.style.minWidth = '280px';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.fontSize = '0.9rem';
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>${message}`;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 500);
});