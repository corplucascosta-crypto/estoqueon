// =============================================
// SCANNER MODULE - HTML5 QR Code
// =============================================

let html5QrCode = null;

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
}

function startScanner() {
    const modalHtml = `
        <div class="modal fade" id="qrScannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-camera me-2"></i>Escanear Código</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="qr-reader" style="width: 100%; min-height: 400px;"></div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 text-muted">Posicione o código dentro da área de leitura</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" id="stopScannerBtn"><i class="fas fa-stop me-1"></i>Parar</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('qrScannerModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
    modal.show();
    
    if (typeof Html5Qrcode === 'undefined') {
        alert('Biblioteca do scanner não carregada. Tente novamente.');
        return;
    }
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
            const itemCodeInput = document.getElementById('itemCode');
            if (itemCodeInput) {
                itemCodeInput.value = decodedText;
                itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            stopScanner();
            modal.hide();
            showNotification(`✅ Código escaneado: ${decodedText}`, 'success');
        },
        (errorMessage) => {}
    ).catch((err) => {
        console.error("Erro ao iniciar scanner:", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
        modal.hide();
    });
    
    document.getElementById('stopScannerBtn').addEventListener('click', function() {
        stopScanner();
        modal.hide();
    });
    
    document.getElementById('qrScannerModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Erro ao parar:", err));
    }
}

function showNotification(message, type) {
    console.log(`[${type}] ${message}`);
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 1000);
});