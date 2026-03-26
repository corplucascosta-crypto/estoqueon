// =============================================
// SCANNER MODULE - Versão Final
// =============================================

let html5QrCodeGlobal = null;
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
    btn.title = 'Escanear código';
    btn.style.padding = '0.75rem 1rem';
    btn.onclick = startScanner;
    
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
    console.log('?? Botão scanner adicionado');
}

function startScanner() {
    if (scannerActive) return;
    
    if (typeof Html5Qrcode === 'undefined') {
        alert('Scanner não disponível. Tente novamente.');
        return;
    }
    
    lastCode = null;
    
    const modalHtml = 
        <div class="modal fade" id="scannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6">
                            <i class="fas fa-camera me-2"></i>Escanear Código
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="qr-reader" style="width: 100%; height: 70vh; background: #000;"></div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 small">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                Posicione o código dentro da área de leitura
                            </p>
                            <small class="text-muted">EAN-13 | EAN-8 | UPC | Code-128 | Code-39 | QR Code</small>
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
    ;
    
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
    statusDiv.innerHTML = 'Aguardando leitura...';
    document.getElementById('scannerModal').querySelector('.modal-body').appendChild(statusDiv);
    
    setTimeout(() => {
        html5QrCodeGlobal = new Html5Qrcode("qr-reader");
        scannerActive = true;
        
        const config = {
            fps: 30,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.777,
            disableFlip: false,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };
        
        html5QrCodeGlobal.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                const now = Date.now();
                
                if (lastCode === decodedText && (now - lastCodeTime) < 2000) {
                    return;
                }
                
                lastCode = decodedText;
                lastCodeTime = now;
                
                console.log('?? Código detectado:', decodedText);
                
                let codeType = 'Código';
                if (/^\d{13}$/.test(decodedText)) codeType = 'EAN-13';
                else if (/^\d{8}$/.test(decodedText)) codeType = 'EAN-8';
                else if (/^\d{12}$/.test(decodedText)) codeType = 'UPC-A';
                
                statusDiv.innerHTML = ? : ;
                statusDiv.classList.add('bg-success');
                
                const itemCodeInput = document.getElementById('itemCode');
                if (itemCodeInput) {
                    itemCodeInput.value = decodedText;
                    itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(() => {
                    stopScanner();
                    modal.hide();
                    showNotification(? : , 'success');
                }, 1000);
            },
            (errorMessage) => {
                if (errorMessage.includes('No')) {
                    statusDiv.innerHTML = '?? Aproxime o código da câmera';
                } else if (errorMessage.includes('not found')) {
                    statusDiv.innerHTML = '?? Centralize o código na área verde';
                }
            }
        ).catch((err) => {
            console.error("Erro ao iniciar scanner:", err);
            alert("Não foi possível acessar a câmera.\n\nVerifique as permissões.");
            modal.hide();
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
    if (html5QrCodeGlobal && html5QrCodeGlobal.isScanning) {
        html5QrCodeGlobal.stop().catch(err => console.error("Erro ao parar:", err));
    }
    scannerActive = false;
}

function showNotification(message, type) {
    console.log(message);
    const alertDiv = document.createElement('div');
    alertDiv.className = lert alert- position-fixed top-0 start-50 translate-middle-x mt-3 shadow;
    alertDiv.style.zIndex = 9999;
    alertDiv.style.minWidth = '280px';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.fontSize = '0.9rem';
    alertDiv.innerHTML = <i class="fas fa- me-2"></i>;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 500);
    window.addEventListener('resize', function() {
        setTimeout(addScannerButton, 100);
    });
});
