// =============================================
// SCANNER MODULE - Html5Qrcode Otimizado
// =============================================

let html5QrCode = null;
let isScanning = false;
let lastCode = '';
let lastTime = 0;

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function addScannerButton() {
    const existingBtn = document.getElementById('scannerBtn');
    if (existingBtn) existingBtn.remove();
    
    if (!isMobile()) return;
    
    const inputGroup = document.querySelector('#itemCode').parentNode;
    if (!inputGroup) return;
    
    const btn = document.createElement('button');
    btn.id = 'scannerBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary';
    btn.innerHTML = '<i class="fas fa-camera"></i>';
    btn.title = 'Escanear código de barras';
    btn.style.padding = '0.75rem 1rem';
    btn.style.marginLeft = '5px';
    btn.onclick = startScanner;
    
    inputGroup.appendChild(btn);
    console.log('✅ Botão scanner adicionado');
}

function startScanner() {
    if (isScanning) return;
    
    if (typeof Html5Qrcode === 'undefined') {
        console.log('Carregando Html5Qrcode...');
        loadHtml5Qrcode();
        return;
    }
    
    openScanner();
}

function loadHtml5Qrcode() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = function() {
        console.log('✅ Html5Qrcode carregado');
        openScanner();
    };
    script.onerror = function() {
        console.error('❌ Erro ao carregar Html5Qrcode');
        alert('Erro ao carregar scanner. Verifique sua conexão com a internet.');
    };
    document.head.appendChild(script);
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
                        <div id="scanner-guide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 10;"></div>
                        <div id="scanner-status" class="position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill" style="z-index: 1060; font-size: 12px;">
                            📷 Aproxime o código
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
    
    const statusDiv = document.getElementById('scanner-status');
    
    setTimeout(() => {
        html5QrCode = new Html5Qrcode("qr-reader");
        isScanning = true;
        
        const config = {
            fps: 30,
            qrbox: { width: 300, height: 150 },
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
        
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                const now = Date.now();
                if (lastCode === decodedText && (now - lastTime) < 2000) return;
                
                lastCode = decodedText;
                lastTime = now;
                
                console.log('📦 Código detectado:', decodedText);
                statusDiv.innerHTML = `✅ ${decodedText}`;
                statusDiv.classList.add('bg-success');
                
                const itemCodeInput = document.getElementById('itemCode');
                if (itemCodeInput) {
                    itemCodeInput.value = decodedText;
                    itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(() => {
                    stopScanner();
                    modal.hide();
                    showNotification(`✅ Código: ${decodedText}`, 'success');
                }, 800);
            },
            (errorMessage) => {
                if (errorMessage && errorMessage.includes('No')) {
                    statusDiv.innerHTML = '📷 Aproxime o código';
                } else if (errorMessage && errorMessage.includes('not found')) {
                    statusDiv.innerHTML = '🔍 Centralize na área verde';
                } else {
                    statusDiv.innerHTML = '📷 Posicione o código';
                }
                statusDiv.classList.remove('bg-success');
            }
        ).catch((err) => {
            console.error('Erro:', err);
            statusDiv.innerHTML = '❌ Erro na câmera';
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
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
    window.addEventListener('resize', function() {
        setTimeout(addScannerButton, 100);
    });
});