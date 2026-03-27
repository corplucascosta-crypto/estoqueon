// =============================================
// SCANNER MODULE - ZXing (Tecnologia Google Lens)
// =============================================

let videoStream = null;
let isScanning = false;
let animationId = null;
let codeReader = null;

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
    btn.onclick = startZXingScanner;
    
    inputElement.parentNode.insertBefore(btn, inputElement.nextSibling);
    console.log('✅ Botão câmera adicionado');
}

async function startZXingScanner() {
    if (isScanning) return;
    
    // Aguardar ZXing carregar
    if (typeof ZXing === 'undefined') {
        console.log('Aguardando ZXing carregar...');
        const checkInterval = setInterval(() => {
            if (typeof ZXing !== 'undefined') {
                clearInterval(checkInterval);
                openScannerModal();
            }
        }, 500);
        setTimeout(() => {
            clearInterval(checkInterval);
            if (typeof ZXing === 'undefined') {
                alert('Carregando scanner... Tente novamente em alguns segundos.');
            }
        }, 5000);
        return;
    }
    
    openScannerModal();
}

async function openScannerModal() {
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
                        <video id="zxingVideo" autoplay playsinline style="width: 100%; height: 70vh; object-fit: cover; background: #000;"></video>
                        <div id="zxingGuide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 10;"></div>
                        <div id="zxingStatus" class="position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill" style="z-index: 1060; font-size: 14px;">
                            📷 Aproxime o código
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-danger btn-sm" id="zxingStopBtn">
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
    
    const video = document.getElementById('zxingVideo');
    const statusDiv = document.getElementById('zxingStatus');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
        videoStream = stream;
        await video.play();
        
        isScanning = true;
        
        // Configurar ZXing
        const hints = new Map();
        const formats = [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.CODE_93,
            ZXing.BarcodeFormat.QR_CODE,
            ZXing.BarcodeFormat.DATA_MATRIX,
            ZXing.BarcodeFormat.ITF,
            ZXing.BarcodeFormat.CODABAR
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        
        codeReader = new ZXing.MultiFormatReader();
        codeReader.setHints(hints);
        
        let lastCode = '';
        let lastTime = 0;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        async function scanFrame() {
            if (!isScanning || video.paused || video.ended) return;
            
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
                    const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
                    
                    const result = codeReader.decodeWithState(binaryBitmap);
                    
                    if (result && result.getText()) {
                        const code = result.getText();
                        const now = Date.now();
                        
                        if (lastCode !== code || (now - lastTime) > 2000) {
                            lastCode = code;
                            lastTime = now;
                            
                            console.log('📦 Código detectado:', code);
                            
                            let format = 'Código';
                            if (code.match(/^\d{13}$/)) format = 'EAN-13';
                            else if (code.match(/^\d{8}$/)) format = 'EAN-8';
                            else if (code.match(/^\d{12}$/)) format = 'UPC-A';
                            else if (code.match(/^\d{14}$/)) format = 'ITF-14';
                            
                            statusDiv.innerHTML = `✅ ${format}: ${code}`;
                            statusDiv.classList.add('bg-success');
                            
                            const input = document.getElementById('itemCode');
                            if (input) {
                                input.value = code;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            
                            setTimeout(() => {
                                stopScanner();
                                modal.hide();
                                showNotification(`✅ ${code}`, 'success');
                            }, 800);
                        }
                    } else {
                        statusDiv.innerHTML = '🔍 Centralize o código';
                        statusDiv.classList.remove('bg-success');
                    }
                } catch (e) {
                    // Nenhum código detectado
                    if (statusDiv.innerHTML !== '📷 Aproxime o código') {
                        statusDiv.innerHTML = '📷 Aproxime o código';
                        statusDiv.classList.remove('bg-success');
                    }
                }
            }
            
            if (isScanning) {
                requestAnimationFrame(scanFrame);
            }
        }
        
        scanFrame();
        
    } catch (err) {
        console.error('Erro ao acessar câmera:', err);
        statusDiv.innerHTML = '❌ Erro na câmera';
        setTimeout(() => {
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
            modal.hide();
        }, 500);
    }
    
    document.getElementById('zxingStopBtn').onclick = function() {
        stopScanner();
        modal.hide();
    };
    
    document.getElementById('zxingModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function stopScanner() {
    isScanning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    codeReader = null;
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