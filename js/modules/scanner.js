// =============================================
// SCANNER MODULE - Html5Qrcode (Lê QR Code e Código de Barras)
// =============================================

let html5QrCode = null;
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
    btn.title = 'Escanear código';
    btn.style.padding = '0.75rem 1rem';
    btn.onclick = startScanner;
    
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
    console.log('✅ Botão scanner adicionado');
}

function startScanner() {
    if (scannerActive) return;
    
    if (typeof Html5Qrcode === 'undefined') {
        alert('Scanner não disponível. Tente novamente.');
        return;
    }
    
    const modalHtml = `
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
                                Posicione o QR Code ou código de barras
                            </p>
                            <small class="text-muted">QR Code | EAN | UPC | Code128 | Code39</small>
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
    
    setTimeout(() => {
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerActive = true;
        
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 15,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0,
                disableFlip: false
            },
            (decodedText) => {
                // Código detectado automaticamente
                console.log('📦 Código detectado:', decodedText);
                
                const itemCodeInput = document.getElementById('itemCode');
                if (itemCodeInput) {
                    itemCodeInput.value = decodedText;
                    itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Fecha automaticamente após leitura
                stopScanner();
                modal.hide();
                showNotification(`✅ Código: ${decodedText}`, 'success');
            },
            (errorMessage) => {
                // Erros de leitura - ignorar
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
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Erro ao parar:", err));
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
});