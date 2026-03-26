// =============================================
// SCANNER MODULE - Quagga (melhor para código de barras)
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
        <div class="modal fade" id="scannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-camera me-2"></i>Escanear Código de Barras</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="scanner-container" style="width: 100%; min-height: 400px; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-guide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 30%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        </div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 text-muted">Posicione o código de barras dentro da área verde</p>
                            <small class="text-muted">Formatos: EAN-13, EAN-8, UPC-A, Code128, Code39</small>
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
    
    const existingModal = document.getElementById('scannerModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('scannerModal'));
    modal.show();
    
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
                "ean_reader",
                "ean_8_reader",
                "upc_reader",
                "upc_e_reader",
                "code_128_reader",
                "code_39_reader"
            ]
        },
        locate: true,
        numOfWorkers: 4
    }, function(err) {
        if (err) {
            console.error('Erro ao iniciar scanner:', err);
            alert('Erro ao acessar a câmera');
            modal.hide();
            return;
        }
        
        Quagga.start();
        scannerActive = true;
        console.log('Scanner iniciado');
    });
    
    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        console.log('Código detectado:', code);
        
        const itemCodeInput = document.getElementById('itemCode');
        if (itemCodeInput) {
            itemCodeInput.value = code;
            itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        stopScanner();
        modal.hide();
        showNotification(`✅ Código: ${code}`, 'success');
    });
    
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
        } catch(e) {}
    }
}

function showNotification(message, type) {
    console.log(message);
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
    alertDiv.style.zIndex = 9999;
    alertDiv.style.minWidth = '300px';
    alertDiv.style.textAlign = 'center';
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>${message}`;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 500);
});