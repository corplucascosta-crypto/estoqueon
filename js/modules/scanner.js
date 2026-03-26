// Scanner Module - Versão Limpa
(function() {
    let scanner = null;
    let scanning = false;
    let lastCode = null;
    let lastTime = 0;

    function isMobile() {
        let ua = navigator.userAgent;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth <= 768;
    }

    function addButton() {
        let btn = document.getElementById('scanBtn');
        if (btn) btn.remove();
        if (!isMobile()) return;
        
        let input = document.getElementById('itemCode');
        if (!input) return;
        
        btn = document.createElement('button');
        btn.id = 'scanBtn';
        btn.type = 'button';
        btn.className = 'btn btn-outline-primary ms-2';
        btn.innerHTML = '<i class=\"fas fa-camera\"></i>';
        btn.onclick = startScan;
        input.parentNode.insertBefore(btn, input.nextSibling);
    }

    function startScan() {
        if (scanning) return;
        if (typeof Html5Qrcode === 'undefined') {
            alert('Scanner nao disponivel');
            return;
        }
        
        let modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'scanModal';
        modalDiv.setAttribute('tabindex', '-1');
        modalDiv.setAttribute('data-bs-backdrop', 'static');
        modalDiv.innerHTML = '<div class=\"modal-dialog modal-fullscreen\"><div class=\"modal-content\"><div class=\"modal-header bg-primary text-white py-2\"><h5 class=\"modal-title fs-6\"><i class=\"fas fa-camera me-2\"></i>Escanear Codigo</h5><button type=\"button\" class=\"btn-close btn-close-white\" data-bs-dismiss=\"modal\"></button></div><div class=\"modal-body p-0\"><div id=\"qrReader\" style=\"width:100%;height:70vh;background:#000;\"></div><div class=\"p-3 text-center bg-light\"><p class=\"mb-0 small\">Posicione o codigo na area de leitura</p><small>EAN-13 | EAN-8 | UPC | Code-128 | Code-39 | QR Code</small></div></div><div class=\"modal-footer py-2\"><button type=\"button\" class=\"btn btn-danger btn-sm\" id=\"stopScanBtn\">Parar</button><button type=\"button\" class=\"btn btn-secondary btn-sm\" data-bs-dismiss=\"modal\">Fechar</button></div></div></div>';
        
        let existing = document.getElementById('scanModal');
        if (existing) existing.remove();
        document.body.appendChild(modalDiv);
        
        let modal = new bootstrap.Modal(document.getElementById('scanModal'));
        modal.show();
        
        let status = document.createElement('div');
        status.id = 'scanStatus';
        status.className = 'position-absolute bottom-0 start-50 translate-middle-x mb-3 px-3 py-1 bg-dark text-white rounded-pill';
        status.style.zIndex = 1060;
        status.innerHTML = 'Aguardando leitura...';
        document.getElementById('scanModal').querySelector('.modal-body').appendChild(status);
        
        setTimeout(function() {
            scanner = new Html5Qrcode('qrReader');
            scanning = true;
            
            scanner.start({ facingMode: 'environment' }, {
                fps: 30,
                qrbox: { width: 280, height: 140 }
            }, function(text) {
                let now = Date.now();
                if (lastCode === text && now - lastTime < 2000) return;
                lastCode = text;
                lastTime = now;
                
                status.innerHTML = 'Codigo: ' + text;
                status.classList.add('bg-success');
                
                let input = document.getElementById('itemCode');
                if (input) {
                    input.value = text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                setTimeout(function() {
                    stopScan();
                    modal.hide();
                }, 800);
            }, function(err) {
                if (err && err.indexOf('No') >= 0) status.innerHTML = 'Aproxime o codigo';
                else status.innerHTML = 'Centralize na area verde';
            }).catch(function(err) {
                alert('Erro ao acessar camera');
                modal.hide();
            });
        }, 500);
        
        document.getElementById('stopScanBtn').onclick = function() {
            stopScan();
            modal.hide();
        };
        
        document.getElementById('scanModal').addEventListener('hidden.bs.modal', function() {
            stopScan();
            this.remove();
        });
    }

    function stopScan() {
        if (scanner && scanner.isScanning) {
            scanner.stop().catch(function() {});
        }
        scanning = false;
        scanner = null;
    }

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(addButton, 500);
        window.addEventListener('resize', function() {
            setTimeout(addButton, 100);
        });
    });
})();
