// =============================================
// SCANNER MODULE - Compatível com iOS e Android
// =============================================

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
    btn.onclick = startScanner;
    
    inputElement.parentNode.insertBefore(btn, inputElement.nextSibling);
    console.log('✅ Botão câmera adicionado');
}

function startScanner() {
    if (isIOS()) {
        startIOSScanner();
    } else {
        startAndroidScanner();
    }
}

function startIOSScanner() {
    // Criar input para câmera no iOS
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async function(event) {
        const file = event.target.files[0];
        if (file) {
            // Mostrar modal de processamento
            const modalHtml = `
                <div class="modal fade" id="processingModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-sm">
                        <div class="modal-content">
                            <div class="modal-body text-center py-4">
                                <div class="spinner-border text-primary mb-2" role="status"></div>
                                <p class="mb-0">Processando imagem...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const processingModal = new bootstrap.Modal(document.getElementById('processingModal'));
            processingModal.show();
            
            try {
                const imageUrl = URL.createObjectURL(file);
                const img = new Image();
                
                img.onload = async function() {
                    // Criar canvas para processar imagem
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Tentar ler código de barras com BarcodeDetector
                    if ('BarcodeDetector' in window) {
                        const barcodeDetector = new BarcodeDetector({
                            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
                        });
                        
                        const barcodes = await barcodeDetector.detect(canvas);
                        if (barcodes.length > 0) {
                            const code = barcodes[0].rawValue;
                            const input = document.getElementById('itemCode');
                            if (input) {
                                input.value = code;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            processingModal.hide();
                            document.getElementById('processingModal')?.remove();
                            showNotification('✅ Código: ' + code, 'success');
                        } else {
                            processingModal.hide();
                            document.getElementById('processingModal')?.remove();
                            alert('Nenhum código identificado na imagem.\n\nTire uma foto mais nítida e centralizada.');
                        }
                    } else {
                        processingModal.hide();
                        document.getElementById('processingModal')?.remove();
                        alert('Para ler códigos no iOS, use um app como "QR Code Reader" e cole o código manualmente.');
                    }
                    
                    URL.revokeObjectURL(imageUrl);
                };
                
                img.src = imageUrl;
                
            } catch (error) {
                console.error('Erro:', error);
                processingModal.hide();
                document.getElementById('processingModal')?.remove();
                alert('Erro ao processar imagem.');
            }
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.remove();
}

function startAndroidScanner() {
    if (!('BarcodeDetector' in window)) {
        alert('Seu navegador não suporta leitura de código de barras.\nUse Chrome no Android.');
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
                    <div class="modal-body p-0 position-relative">
                        <video id="scannerVideo" autoplay playsinline style="width: 100%; height: 70vh; object-fit: cover; background: #000;"></video>
                        <div id="scannerGuide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 10;"></div>
                        <div id="scannerStatus" class="position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill" style="z-index: 1060; font-size: 14px;">
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
    
    let videoStream = null;
    let isScanning = true;
    
    const video = document.getElementById('scannerVideo');
    const statusDiv = document.getElementById('scannerStatus');
    
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    }).then(async function(stream) {
        video.srcObject = stream;
        videoStream = stream;
        await video.play();
        
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let lastCode = '';
        let lastTime = 0;
        
        function scanFrame() {
            if (!isScanning || video.paused || video.ended) {
                if (isScanning) requestAnimationFrame(scanFrame);
                return;
            }
            
            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                barcodeDetector.detect(canvas).then(barcodes => {
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        const now = Date.now();
                        
                        if (lastCode !== code || (now - lastTime) > 2000) {
                            lastCode = code;
                            lastTime = now;
                            
                            let format = 'Código';
                            if (/^\d{13}$/.test(code)) format = 'EAN-13';
                            else if (/^\d{8}$/.test(code)) format = 'EAN-8';
                            else if (/^\d{12}$/.test(code)) format = 'UPC-A';
                            
                            statusDiv.innerHTML = '✅ ' + format + ': ' + code;
                            statusDiv.classList.add('bg-success');
                            
                            const input = document.getElementById('itemCode');
                            if (input) {
                                input.value = code;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            
                            setTimeout(() => {
                                isScanning = false;
                                if (videoStream) {
                                    videoStream.getTracks().forEach(track => track.stop());
                                }
                                modal.hide();
                                showNotification('✅ ' + code, 'success');
                            }, 800);
                        }
                    } else {
                        statusDiv.innerHTML = '🔍 Centralize o código';
                        statusDiv.classList.remove('bg-success');
                    }
                }).catch(() => {});
            }
            
            if (isScanning) {
                requestAnimationFrame(scanFrame);
            }
        }
        
        scanFrame();
        
    }).catch(function(err) {
        console.error('Erro:', err);
        statusDiv.innerHTML = '❌ Erro na câmera';
        setTimeout(() => modal.hide(), 1000);
    });
    
    document.getElementById('stopScannerBtn').onclick = function() {
        isScanning = false;
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        modal.hide();
    };
    
    document.getElementById('scannerModal').addEventListener('hidden.bs.modal', function() {
        isScanning = false;
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        this.remove();
    });
}

function showNotification(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-' + (type === 'success' ? 'success' : 'info') + ' position-fixed top-0 start-50 translate-middle-x mt-3 shadow';
    alertDiv.style.zIndex = 9999;
    alertDiv.style.minWidth = '280px';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.fontSize = '0.9rem';
    alertDiv.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'info-circle') + ' me-2"></i>' + message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 500);
});