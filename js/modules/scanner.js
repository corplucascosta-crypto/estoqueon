// =============================================
// SCANNER MODULE - Versão Simplificada
// =============================================

let scanner = null;
let isActive = false;
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
    btn.onclick = openScanner;
    
    inputElement.parentNode.insertBefore(btn, inputElement.nextSibling);
    console.log('✅ Botão câmera adicionado');
}

function openScanner() {
    if (isActive) return;
    
    if (typeof Html5Qrcode === 'undefined') {
        alert('Biblioteca do scanner não carregada. Verifique sua conexão.');
        return;
    }
    
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'qrModal';
    modalDiv.setAttribute('data-bs-backdrop', 'static');
    modalDiv.innerHTML = `
        <div class="modal-dialog modal-fullscreen">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white py-2">
                    <h5 class="modal-title fs-6"><i class="fas fa-camera me-2"></i>Escanear Código</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div id="qrReader" style="width:100%; height:70vh; background:#000;"></div>
                    <div class="p-3 text-center bg-light">
                        <p class="mb-0 small">Posicione o código na área de leitura</p>
                        <small class="text-muted">EAN-13 | EAN-8 | UPC | Code128 | QR Code</small>
                    </div>
                </div>
                <div class="modal-footer py-2">
                    <button type="button" class="btn btn-danger btn-sm" id="stopBtn">Parar</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('qrModal');
    if (existingModal) existingModal.remove();
    document.body.appendChild(modalDiv);
    
    const modal = new bootstrap.Modal(document.getElementById('qrModal'));
    modal.show();
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'scanStatus';
    statusDiv.className = 'position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill';
    statusDiv.style.zIndex = 1060;
    statusDiv.style.fontSize = '12px';
    statusDiv.innerHTML = 'Aguardando leitura...';
    document.getElementById('qrModal').querySelector('.modal-body').appendChild(statusDiv);
    
    setTimeout(() => {
        scanner = new Html5Qrcode("qrReader");
        isActive = true;
        
        scanner.start(
            { facingMode: "environment" },
            {
                fps: 20,
                qrbox: { width: 280, height: 140 },
                aspectRatio: 1.777
            },
            (text) => {
                const now = Date.now();
                if (lastCode === text && (now - lastTime) < 2000) return;
                
                lastCode = text;
                lastTime = now;
                
                statusDiv.innerHTML = `✅ ${text}`;
                statusDiv.classList.add('bg-success');
                
                const input = document.getElementById('itemCode');
                if (input) {
                    input.value = text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(() => {
                    stopScanner();
                    modal.hide();
                    showMessage(`Código: ${text}`, 'success');
                }, 800);
            },
            (err) => {
                if (err && err.indexOf('No') >= 0) {
                    statusDiv.innerHTML = '📷 Aproxime o código';
                } else {
                    statusDiv.innerHTML = '🔍 Centralize na área verde';
                }
                statusDiv.classList.remove('bg-success');
            }
        ).catch((err) => {
            console.error('Erro:', err);
            statusDiv.innerHTML = '❌ Erro na câmera';
        });
    }, 500);
    
    document.getElementById('stopBtn').onclick = function() {
        stopScanner();
        modal.hide();
    };
    
    document.getElementById('qrModal').addEventListener('hidden.bs.modal', function() {
        stopScanner();
        this.remove();
    });
}

function stopScanner() {
    if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
    }
    isActive = false;
    scanner = null;
}

function showMessage(msg, type) {
    console.log(msg);
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
    alert.style.zIndex = 9999;
    alert.style.minWidth = '280px';
    alert.style.textAlign = 'center';
    alert.innerHTML = `<i class="fas fa-check-circle me-2"></i>${msg}`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScannerButton, 500);
});