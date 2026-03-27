// =============================================
// SCANNER MODULE - ZXing (Tecnologia Google Lens)
// =============================================

let scanner = null;
let isScanning = false;

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
    btn.onclick = startZXingScanner;
    
    inputGroup.appendChild(btn);
    console.log('✅ Botão scanner adicionado');
}

function startZXingScanner() {
    if (isScanning) return;
    
    // Verificar se a biblioteca está carregada
    if (typeof ZXing === 'undefined') {
        console.log('Carregando ZXing...');
        loadZXingLibrary();
        return;
    }
    
    openScannerModal();
}

function loadZXingLibrary() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@0.19.1/index.min.js';
    script.onload = function() {
        console.log('✅ ZXing carregado');
        openScannerModal();
    };
    script.onerror = function() {
        console.error('❌ Erro ao carregar ZXing');
        alert('Erro ao carregar scanner. Tente novamente.');
    };
    document.head.appendChild(script);
}

function openScannerModal() {
    const modalHtml = `
        <div class="modal fade" id="zxingModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6">
                            <i class="fas fa-camera me-2"></i>Escanear Código
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0 position-relative">
                        <video id="zxing-video" autoplay playsinline style="width: 100%; height: 70vh; object-fit: cover; background: #000;"></video>
                        <canvas id="zxing-canvas" style="display: none;"></canvas>
                        <div id="zxing-guide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        <div id="zxing-status" class="position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill" style="z-index: 1060; font-size: 12px;">
                            Aguardando leitura...
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-danger btn-sm" id="zxing-stop-btn">
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
    
    const existingModal = document.getElementById('zxingModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('zxingModal'));
    modal.show();
    
    const video = document.getElementById('zxing-video');
    const statusDiv = document.getElementById('zxing-status');
    
    // Solicitar acesso à câmera
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    }).then(stream => {
        video.srcObject = stream;
        video.play();
        
        // Iniciar scanner
        startVideoScanning(video, statusDiv, modal);
        
    }).catch(err => {
        console.error('Erro ao acessar câmera:', err);
        statusDiv.innerHTML = '❌ Erro ao acessar câmera';
        statusDiv.classList.add('bg-danger');
    });
    
    document.getElementById('zxing-stop-btn').onclick = function() {
        stopScanning(video);
        modal.hide();
    };
    
    document.getElementById('zxingModal').addEventListener('hidden.bs.modal', function() {
        stopScanning(video);
        this.remove();
    });
}

function startVideoScanning(video, statusDiv, modal) {
    isScanning = true;
    
    // Criar canvas para capturar frames
    const canvas = document.getElementById('zxing-canvas');
    const context = canvas.getContext('2d');
    
    let lastCode = '';
    let lastTime = 0;
    
    function scanFrame() {
        if (!isScanning) return;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Usar o ZXing para decodificar
            try {
                const codeReader = new ZXing.BrowserMultiFormatReader();
                const hints = new Map();
                hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                    ZXing.BarcodeFormat.EAN_13,
                    ZXing.BarcodeFormat.EAN_8,
                    ZXing.BarcodeFormat.UPC_A,
                    ZXing.BarcodeFormat.UPC_E,
                    ZXing.BarcodeFormat.CODE_128,
                    ZXing.BarcodeFormat.CODE_39,
                    ZXing.BarcodeFormat.QR_CODE
                ]);
                
                codeReader.decodeFromImageElement(canvas, hints)
                    .then(result => {
                        const code = result.getText();
                        const now = Date.now();
                        
                        if (lastCode !== code || (now - lastTime) > 2000) {
                            lastCode = code;
                            lastTime = now;
                            
                            console.log('📦 Código detectado:', code);
                            statusDiv.innerHTML = `✅ Código: ${code}`;
                            statusDiv.classList.add('bg-success');
                            
                            // Preencher campo
                            const itemCodeInput = document.getElementById('itemCode');
                            if (itemCodeInput) {
                                itemCodeInput.value = code;
                                itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            
                            // Fechar após 1 segundo
                            setTimeout(() => {
                                stopScanning(video);
                                modal.hide();
                                showNotification(`✅ Código escaneado: ${code}`, 'success');
                            }, 1000);
                        }
                    })
                    .catch(() => {});
            } catch(e) {
                // Erro ao decodificar
            }
        }
        
        requestAnimationFrame(scanFrame);
    }
    
    // Aguardar vídeo carregar
    video.addEventListener('loadeddata', () => {
        requestAnimationFrame(scanFrame);
    });
    
    // Timeout para evitar loop infinito
    setTimeout(() => {
        if (isScanning && statusDiv.innerHTML === 'Aguardando leitura...') {
            statusDiv.innerHTML = '📷 Aproxime o código da câmera';
        }
    }, 3000);
}

function stopScanning(video) {
    isScanning = false;
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
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
    window.addEventListener('resize', function() {
        setTimeout(addScannerButton, 100);
    });
});