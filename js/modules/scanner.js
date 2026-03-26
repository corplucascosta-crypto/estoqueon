// Scanner Module - Versão Corrigida
(function() {
    let html5QrCodeInstance = null;
    let isScannerActive = false;
    let lastDetectedCode = null;
    let lastDetectionTime = 0;

    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    function addCameraButton() {
        const existingBtn = document.getElementById('cameraScannerBtn');
        if (existingBtn) existingBtn.remove();
        
        if (!isMobile()) return;
        
        const codeInput = document.getElementById('itemCode');
        if (!codeInput) return;
        
        const btn = document.createElement('button');
        btn.id = 'cameraScannerBtn';
        btn.type = 'button';
        btn.className = 'btn btn-outline-primary ms-2';
        btn.innerHTML = '<i class="fas fa-camera"></i>';
        btn.title = 'Escanear código';
        btn.style.padding = '0.75rem 1rem';
        btn.onclick = startCameraScanner;
        
        codeInput.parentNode.insertBefore(btn, codeInput.nextSibling);
        console.log('Botão da câmera adicionado');
    }

    function startCameraScanner() {
        if (isScannerActive) return;
        
        if (typeof Html5Qrcode === 'undefined') {
            alert('Biblioteca do scanner não carregada');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="cameraModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white py-2">
                            <h5 class="modal-title fs-6"><i class="fas fa-camera me-2"></i>Escanear Código</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <div id="qr-reader-area" style="width: 100%; height: 70vh; background: #000;"></div>
                            <div class="p-3 text-center bg-light">
                                <p class="mb-0 small">Posicione o código dentro da área de leitura</p>
                                <small class="text-muted">EAN-13 | EAN-8 | UPC | Code-128 | Code-39 | QR Code</small>
                            </div>
                        </div>
                        <div class="modal-footer py-2">
                            <button type="button" class="btn btn-danger btn-sm" id="stopCameraBtn"><i class="fas fa-stop me-1"></i>Parar</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('cameraModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
        modal.show();
        
        const statusDiv = document.createElement('div');
        statusDiv.id = 'scannerStatusMsg';
        statusDiv.className = 'position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill';
        statusDiv.style.zIndex = 1060;
        statusDiv.style.fontSize = '12px';
        statusDiv.innerHTML = 'Aguardando leitura...';
        document.getElementById('cameraModal').querySelector('.modal-body').appendChild(statusDiv);
        
        setTimeout(() => {
            html5QrCodeInstance = new Html5Qrcode("qr-reader-area");
            isScannerActive = true;
            
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
            
            html5QrCodeInstance.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    const now = Date.now();
                    if (lastDetectedCode === decodedText && (now - lastDetectionTime) < 2000) return;
                    
                    lastDetectedCode = decodedText;
                    lastDetectionTime = now;
                    
                    statusDiv.innerHTML = `✅ Código: ${decodedText}`;
                    statusDiv.classList.add('bg-success');
                    
                    const codeInput = document.getElementById('itemCode');
                    if (codeInput) {
                        codeInput.value = decodedText;
                        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    
                    setTimeout(() => {
                        stopCameraScanner();
                        modal.hide();
                    }, 800);
                },
                (errorMsg) => {
                    if (errorMsg.includes('No')) statusDiv.innerHTML = '📷 Aproxime o código';
                    else if (errorMsg.includes('not found')) statusDiv.innerHTML = '🔍 Centralize na área verde';
                }
            ).catch((err) => {
                console.error("Erro:", err);
                alert("Não foi possível acessar a câmera");
                modal.hide();
            });
        }, 500);
        
        document.getElementById('stopCameraBtn').addEventListener('click', function() {
            stopCameraScanner();
            modal.hide();
        });
        
        document.getElementById('cameraModal').addEventListener('hidden.bs.modal', function() {
            stopCameraScanner();
            this.remove();
        });
    }

    function stopCameraScanner() {
        if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
            html5QrCodeInstance.stop().catch(() => {});
        }
        isScannerActive = false;
        html5QrCodeInstance = null;
    }

    function showMsg(message, type) {
        console.log(message);
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
        alertDiv.style.zIndex = 9999;
        alertDiv.style.minWidth = '280px';
        alertDiv.style.textAlign = 'center';
        alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>${message}`;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    window.startCameraScanner = startCameraScanner;
    window.showScannerMessage = showMsg;
    
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(addCameraButton, 500);
        window.addEventListener('resize', function() {
            setTimeout(addCameraButton, 100);
        });
    });
})();