// =============================================
// SCANNER MODULE - Quagga (especialista em códigos lineares)
// =============================================

let scannerActive = false;
let lastCode = null;
let lastCodeTime = 0;

function isMobileDevice() {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || isSmallScreen;
}

function addScannerButton() {
    const existingBtn = document.getElementById('scannerBtn');
    if (existingBtn) existingBtn.remove();
    
    if (!isMobileDevice()) return;
    
    const itemCodeInput = document.getElementById('itemCode');
    if (!itemCodeInput) return;
    
    const btn = document.createElement('button');
    btn.id = 'scannerBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary ms-2';
    btn.innerHTML = '<i class="fas fa-camera"></i>';
    btn.title = 'Escanear código de barras';
    btn.style.padding = '0.75rem 1rem';
    btn.onclick = startScanner;
    
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
}

function startScanner() {
    if (scannerActive) return;
    
    if (typeof Quagga === 'undefined') {
        alert('Scanner não disponível. Tente novamente.');
        return;
    }
    
    const modalHtml = `
        <div class="modal fade" id="scannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6">
                            <i class="fas fa-camera me-2"></i>Escanear Código de Barras
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="scanner-container" style="width: 100%; height: 75vh; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-guide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        </div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 small">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                Posicione o código dentro da área verde
                            </p>
                            <small class="text-muted">EAN-13 | EAN-8 | UPC | Code-11 | Code-39 | Code-93 | Code-128 | ITF-14 | DUN-14 | Codabar</small>
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
    
    const modal = new bootstrap.Modal(document.getElementById('scannerModal'));
    modal.show();
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'scannerStatus';
    statusDiv.className = 'position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill';
    statusDiv.style.zIndex = 1060;
    statusDiv.style.fontSize = '12px';
    statusDiv.style.whiteSpace = 'nowrap';
    statusDiv.innerHTML = '📷 Aguardando leitura...';
    document.getElementById('scannerModal').querySelector('.modal-body').appendChild(statusDiv);
    
    setTimeout(() => {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scanner-video'),
                constraints: {
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 },
                    facingMode: "environment",
                    aspectRatio: { min: 1, max: 2 }
                }
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "code_128_reader",
                    "code_39_reader",
                    "code_93_reader",
                    "codabar_reader",
                    "code_11_reader",
                    "itf_reader",
                    "i2of5_reader"
                ],
                debug: {
                    drawBoundingBox: true,
                    showFrequency: false,
                    drawScanline: true,
                    showPattern: false
                }
            },
            locate: true,
            numOfWorkers: navigator.hardwareConcurrency || 2
        }, function(err) {
            if (err) {
                console.error('Erro ao iniciar scanner:', err);
                statusDiv.innerHTML = '❌ Erro ao acessar câmera';
                return;
            }
            
            Quagga.start();
            scannerActive = true;
            console.log('✅ Scanner iniciado');
            statusDiv.innerHTML = '🔍 Aponte para o código de barras';
        });
        
        Quagga.onDetected(function(result) {
            if (result && result.codeResult && result.codeResult.code) {
                const code = result.codeResult.code;
                const format = result.codeResult.format || 'Desconhecido';
                const now = Date.now();
                
                if (lastCode === code && (now - lastCodeTime) < 2000) {
                    return;
                }
                
                lastCode = code;
                lastCodeTime = now;
                
                console.log('📦 Código detectado:', code, '| Formato:', format);
                
                let formatName = format;
                if (format === 'code_11_reader') formatName = 'Code-11';
                else if (format === 'itf_reader' || format === 'i2of5_reader') formatName = 'ITF-14/DUN-14';
                else if (format === 'ean_reader') formatName = 'EAN-13';
                else if (format === 'ean_8_reader') formatName = 'EAN-8';
                else if (format === 'upc_reader') formatName = 'UPC-A';
                else if (format === 'code_128_reader') formatName = 'Code-128';
                else if (format === 'code_39_reader') formatName = 'Code-39';
                else if (format === 'code_93_reader') formatName = 'Code-93';
                else if (format === 'codabar_reader') formatName = 'Codabar';
                
                statusDiv.innerHTML = `✅ ${formatName}: ${code}`;
                statusDiv.classList.add('bg-success');
                
                const itemCodeInput = document.getElementById('itemCode');
                if (itemCodeInput) {
                    itemCodeInput.value = code;
                    itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(() => {
                    stopScanner();
                    const modalEl = document.getElementById('scannerModal');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) modalInstance.hide();
                        modalEl.remove();
                    }
                    showNotification(`✅ ${formatName}: ${code}`, 'success');
                }, 800);
            }
        });
    }, 500);
    
    document.getElementById('stopScannerBtn').addEventListener('click', function() {
        stopScanner();
        const modalEl = document.getElementById('scannerModal');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            modalEl.remove();
        }
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
        } catch(e) {
            console.error('Erro ao parar scanner:', e);
        }
    }
    scannerActive = false;
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
    window.addEventListener('resize', function() {
        setTimeout(addScannerButton, 100);
    });
});