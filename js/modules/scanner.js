// =============================================
// SCANNER MODULE - Híbrido (Quagga para lineares + Html5Qrcode para 2D)
// =============================================

let activeScanner = null;
let scannerType = null;
let scannerActive = false;
let lastCode = null;
let lastCodeTime = 0;

// Detectar se é dispositivo móvel
function isMobileDevice() {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || isSmallScreen;
}

function addScannerButton() {
    const existingBtn = document.getElementById('scannerBtn');
    if (existingBtn) existingBtn.remove();
    
    if (!isMobileDevice()) return;
    
    const itemCodeInput = document.getElementById('itemCode');
    if (!itemCodeInput) return;
    
    const btn = document.createElement('button');
    btn.id = 'scannerBtn';
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary ms-2';
    btn.innerHTML = '<i class="fas fa-camera"></i>';
    btn.title = 'Escanear código';
    btn.style.padding = '0.75rem 1rem';
    btn.onclick = startScanner;
    
    itemCodeInput.parentNode.insertBefore(btn, itemCodeInput.nextSibling);
}

function startScanner() {
    if (scannerActive) return;
    
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
                        <div id="scanner-container" style="width: 100%; height: 70vh; background: #000; position: relative;">
                            <div id="scanner-video" style="width: 100%; height: 100%;"></div>
                            <div id="scanner-guide" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 25%; border: 2px solid #00ff00; border-radius: 8px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        </div>
                        <div class="p-3 text-center bg-light">
                            <p class="mb-0 small">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                Posicione o código dentro da área verde
                            </p>
                            <small class="text-muted">EAN-13 | EAN-8 | UPC | Code-11 | Code39 | Code128 | ITF-14 | DUN-14 | QR Code</small>
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-outline-secondary btn-sm" id="toggleScannerBtn">
                            <i class="fas fa-sync-alt me-1"></i>Alternar Modo
                        </button>
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
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'scannerStatus';
    statusDiv.className = 'position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill';
    statusDiv.style.zIndex = 1060;
    statusDiv.style.fontSize = '12px';
    statusDiv.innerHTML = 'Modo: Código de Barras | Aguardando leitura...';
    document.getElementById('scannerModal').querySelector('.modal-body').appendChild(statusDiv);
    
    // Iniciar com Quagga (melhor para códigos lineares)
    startQuagga(statusDiv);
    
    // Botão para alternar entre modos
    document.getElementById('toggleScannerBtn').addEventListener('click', function() {
        if (scannerType === 'quagga') {
            stopScanner();
            startHtml5Qrcode(statusDiv);
        } else {
            stopScanner();
            startQuagga(statusDiv);
        }
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

function startQuagga(statusDiv) {
    if (typeof Quagga === 'undefined') {
        statusDiv.innerHTML = '❌ Biblioteca Quagga não carregada';
        return;
    }
    
    scannerType = 'quagga';
    scannerActive = true;
    statusDiv.innerHTML = '📊 Modo: Código de Barras | Aguardando leitura...';
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner-video'),
            constraints: {
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 },
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
                "code_39_reader",
                "code_93_reader",
                "codabar_reader",
                "code_11_reader",      // Code-11
                "itf_reader",          // ITF-14 / DUN-14
                "i2of5_reader"         // Interleaved 2 of 5
            ],
            debug: {
                drawBoundingBox: true,
                showFrequency: false,
                drawScanline: true,
                showPattern: false
            }
        },
        locate: true,
        numOfWorkers: navigator.hardwareConcurrency || 2
    }, function(err) {
        if (err) {
            console.error('Erro ao iniciar Quagga:', err);
            statusDiv.innerHTML = '❌ Erro ao iniciar scanner linear';
            return;
        }
        
        Quagga.start();
        console.log('✅ Quagga iniciado (códigos lineares)');
    });
    
    Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            const format = result.codeResult.format || 'Desconhecido';
            
            processDetectedCode(code, format, statusDiv);
        }
    });
}

function startHtml5Qrcode(statusDiv) {
    if (typeof Html5Qrcode === 'undefined') {
        statusDiv.innerHTML = '❌ Biblioteca HTML5 QR Code não carregada';
        return;
    }
    
    scannerType = 'html5';
    scannerActive = true;
    statusDiv.innerHTML = '🔲 Modo: QR Code / 2D | Aguardando leitura...';
    
    const html5QrCode = new Html5Qrcode("scanner-video");
    activeScanner = html5QrCode;
    
    const config = {
        fps: 30,
        qrbox: { width: 280, height: 140 },
        aspectRatio: 1.777,
        disableFlip: false,
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39
        ]
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            const format = detectCodeFormat(decodedText);
            processDetectedCode(decodedText, format, statusDiv);
            stopScanner();
        },
        (errorMessage) => {
            if (errorMessage.includes('No')) {
                statusDiv.innerHTML = '📷 Aproxime o código da câmera';
            } else if (errorMessage.includes('not found')) {
                statusDiv.innerHTML = '🔍 Centralize o código na área verde';
            }
        }
    ).catch((err) => {
        console.error("Erro ao iniciar Html5Qrcode:", err);
        statusDiv.innerHTML = '❌ Erro ao iniciar scanner 2D';
    });
}

function processDetectedCode(code, format, statusDiv) {
    const now = Date.now();
    
    if (lastCode === code && (now - lastCodeTime) < 2000) {
        return;
    }
    
    lastCode = code;
    lastCodeTime = now;
    
    console.log('📦 Código detectado:', code, 'Formato:', format);
    
    let codeType = format;
    if (format === 'code_11_reader') codeType = 'Code-11';
    else if (format === 'itf_reader' || format === 'i2of5_reader') codeType = 'ITF-14 / DUN-14';
    else if (format === 'ean_reader') codeType = 'EAN-13';
    else if (format === 'code_128_reader') codeType = 'Code-128';
    else if (format === 'code_39_reader') codeType = 'Code-39';
    else if (format === 'upc_reader') codeType = 'UPC-A';
    
    statusDiv.innerHTML = `✅ ${codeType}: ${code}`;
    statusDiv.classList.add('bg-success');
    
    const itemCodeInput = document.getElementById('itemCode');
    if (itemCodeInput) {
        itemCodeInput.value = code;
        itemCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    setTimeout(() => {
        stopScanner();
        const modal = bootstrap.Modal.getInstance(document.getElementById('scannerModal'));
        if (modal) modal.hide();
        showNotification(`✅ ${codeType}: ${code}`, 'success');
    }, 1000);
}

function detectCodeFormat(code) {
    if (/^\d{13}$/.test(code)) return 'EAN-13';
    if (/^\d{8}$/.test(code)) return 'EAN-8';
    if (/^\d{12}$/.test(code)) return 'UPC-A';
    if (/^\d{14}$/.test(code)) return 'ITF-14 / DUN-14';
    if (/^\d{6}$/.test(code)) return 'UPC-E';
    if (/^[A-Z0-9\*\-]+$/.test(code) && code.length > 5) return 'Code-39/128';
    return 'Código Linear';
}

function stopScanner() {
    if (scannerType === 'quagga' && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
        } catch(e) {}
    } else if (scannerType === 'html5' && activeScanner) {
        try {
            activeScanner.stop().catch(() => {});
        } catch(e) {}
    }
    scannerActive = false;
    activeScanner = null;
    scannerType = null;
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