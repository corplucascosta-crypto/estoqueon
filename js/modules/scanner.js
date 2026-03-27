// =============================================
// SCANNER MODULE - Otimizado para códigos pequenos
// =============================================

let html5QrCode = null;
let isScanning = false;
let lastCode = '';
let lastTime = 0;

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function addScannerButton() {
    const existingBtn = document.getElementById('cameraBtn');
    if (existingBtn) existingBtn.remove();
    
    if (!isMobile()) return;
    
    const inputElement = document.getElementById('itemCode');
    if (!inputElement) return;
    
    const btn = document.createElement('button');
    btn.id = 'cameraBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary ms-2';
    btn.innerHTML = '<i class="fas fa-camera"></i>';
    btn.title = 'Escanear código';
    btn.style.padding = '0.75rem 1rem';
    btn.style.fontSize = '1.2rem';
    btn.onclick = startScanner;
    
    inputElement.parentNode.insertBefore(btn, inputElement.nextSibling);
}

function startScanner() {
    if (isScanning) return;
    
    if (typeof Html5Qrcode === 'undefined') {
        const checkInterval = setInterval(() => {
            if (typeof Html5Qrcode !== 'undefined') {
                clearInterval(checkInterval);
                openScanner();
            }
        }, 200);
        setTimeout(() => {
            clearInterval(checkInterval);
            if (typeof Html5Qrcode === 'undefined') {
                alert('Aguarde alguns segundos e tente novamente.');
            }
        }, 5000);
        return;
    }
    
    openScanner();
}

function openScanner() {
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
                    <div class="modal-body p-0 position-relative">
                        <div id="qr-reader" style="width: 100%; height: 70vh; background: #000;"></div>
                        <div id="scanner-guide"></div>
                        <div id="scanner-status">📷 Aproxime o código</div>
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
    
    const statusDiv = document.getElementById('scanner-status');
    
    setTimeout(() => {
        html5QrCode = new Html5Qrcode("qr-reader");
        isScanning = true;
        
        // Configuração otimizada para ler códigos pequenos
        const config = {
            fps: 30,
            qrbox: { width: 320, height: 180 },
            aspectRatio: 1.777,
            disableFlip: false,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.CODABAR,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };
        
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                const now = Date.now();
                if (lastCode === decodedText && (now - lastTime) < 2000) return;
                
                lastCode = decodedText;
                lastTime = now;
                
                console.log('📦 Código detectado:', decodedText);
                
                let format = 'Código';
                if (/^\d{13}$/.test(decodedText)) format = 'EAN-13';
                else if (/^\d{8}$/.test(decodedText)) format = 'EAN-8';
                else if (/^\d{12}$/.test(decodedText)) format = 'UPC-A';
                else if (/^\d{14}$/.test(decodedText)) format = 'DUN-14/ITF-14';
                
                statusDiv.innerHTML = `✅ ${format}: ${decodedText}`;
                statusDiv.classList.add('bg-success');
                
                const input = document.getElementById('itemCode');
                if (input) {
                    input.value = decodedText;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(() => {
                    stopScanner();
                    modal.hide();
                    showNotification(`✅ ${decodedText}`, 'success');
                }, 800);
            },
            (errorMessage) => {
                if (errorMessage && errorMessage.includes('No')) {
                    statusDiv.innerHTML = '📷 Aproxime o código';
                } else if (errorMessage && errorMessage.includes('not found')) {
                    statusDiv.innerHTML = '🔍 Centralize na área verde';
                } else if (errorMessage && errorMessage.includes('format')) {
                    statusDiv.innerHTML = '📦 Aguardando leitura...';
                }
                statusDiv.classList.remove('bg-success');
            }
        ).catch((err) => {
            console.error('Erro:', err);
            statusDiv.innerHTML = '❌ Erro na câmera';
            setTimeout(() => {
                alert('Não foi possível acessar a câmera.\nVerifique as permissões.');
                modal.hide();
            }, 1000);
        });
    }, 500);
    
    document.getElementById('stopScannerBtn').onclick = function() {
        stopScanner();
        modal.hide();
    };
    
    document.getElementById('scannerModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
    }
    isScanning = false;
    html5QrCode = null;
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