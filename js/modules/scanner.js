// =============================================
// SCANNER MODULE - API Nativa do Navegador
// =============================================

let videoStream = null;
let isScanning = false;
let animationId = null;

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
    btn.onclick = openNativeScanner;
    
    inputElement.parentNode.insertBefore(btn, inputElement.nextSibling);
    console.log('✅ Botão câmera adicionado');
}

async function openNativeScanner() {
    if (isScanning) return;
    
    // Verificar se a API BarcodeDetector está disponível
    if ('BarcodeDetector' in window) {
        console.log('✅ BarcodeDetector disponível');
        startBarcodeDetector();
    } else {
        console.log('⚠️ BarcodeDetector não disponível, usando fallback');
        alert('Para melhor experiência, use o Chrome no Android ou Safari no iOS');
        startFallbackScanner();
    }
}

async function startBarcodeDetector() {
    const modalHtml = `
        <div class="modal fade" id="nativeScannerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6">
                            <i class="fas fa-camera me-2"></i>Escaneie o Código
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0 position-relative">
                        <video id="nativeVideo" autoplay playsinline style="width: 100%; height: 70vh; object-fit: cover; background: #000;"></video>
                        <canvas id="nativeCanvas" style="display: none;"></canvas>
                        <div id="nativeGuide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 10;"></div>
                        <div id="nativeStatus" class="position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill" style="z-index: 1060; font-size: 14px; white-space: nowrap;">
                            📷 Aproxime o código
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-danger btn-sm" id="nativeStopBtn">
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
    
    const existingModal = document.getElementById('nativeScannerModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('nativeScannerModal'));
    modal.show();
    
    const video = document.getElementById('nativeVideo');
    const canvas = document.getElementById('nativeCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('nativeStatus');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
        videoStream = stream;
        await video.play();
        
        isScanning = true;
        
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
        
        let lastCode = '';
        let lastTime = 0;
        
        async function scanFrame() {
            if (!isScanning || video.paused || video.ended) return;
            
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                try {
                    const barcodes = await barcodeDetector.detect(canvas);
                    
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        const now = Date.now();
                        
                        if (lastCode !== code || (now - lastTime) > 2000) {
                            lastCode = code;
                            lastTime = now;
                            
                            console.log('📦 Código detectado:', code);
                            statusDiv.innerHTML = `✅ ${code}`;
                            statusDiv.classList.add('bg-success');
                            
                            const input = document.getElementById('itemCode');
                            if (input) {
                                input.value = code;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            
                            setTimeout(() => {
                                stopScanner();
                                modal.hide();
                                showNotification(`✅ Código: ${code}`, 'success');
                            }, 800);
                        }
                    } else {
                        statusDiv.innerHTML = '🔍 Centralize o código';
                        statusDiv.classList.remove('bg-success');
                    }
                } catch (e) {
                    // Erro na detecção
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
        alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
    
    document.getElementById('nativeStopBtn').onclick = function() {
        stopScanner();
        modal.hide();
    };
    
    document.getElementById('nativeScannerModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function startFallbackScanner() {
    // Fallback para navegadores sem BarcodeDetector
    if (typeof Html5Qrcode === 'undefined') {
        alert('Scanner não disponível. Use Chrome ou Safari.');
        return;
    }
    
    const modalHtml = `
        <div class="modal fade" id="fallbackModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white py-2">
                        <h5 class="modal-title fs-6"><i class="fas fa-camera me-2"></i>Escanear</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="qrReader" style="width:100%; height:70vh; background:#000;"></div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-danger btn-sm" id="stopFallbackBtn">Parar</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('fallbackModal'));
    modal.show();
    
    const scanner = new Html5Qrcode("qrReader");
    scanner.start(
        { facingMode: "environment" },
        { fps: 20, qrbox: { width: 280, height: 140 } },
        (text) => {
            const input = document.getElementById('itemCode');
            if (input) {
                input.value = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            scanner.stop();
            modal.hide();
            showNotification(`✅ ${text}`, 'success');
        },
        () => {}
    );
    
    document.getElementById('stopFallbackBtn').onclick = function() {
        scanner.stop();
        modal.hide();
    };
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