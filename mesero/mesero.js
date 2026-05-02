// =============================================
// TREZE LABS // MÓDULO MESERO
// Cliente: Fiore de Enero
// v1.0 — Abril 2026
// =============================================

(function() {
    'use strict';

    // Domain lock
    var allowed = ["fiore-de-enero.vercel.app","localhost","127.0.0.1"];
    if(allowed.indexOf(window.location.hostname) === -1 && window.location.hostname !== "") {
        document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:monospace;text-align:center;padding:20px"><h1 style="color:#ef4444">ACCESO DENEGADO</h1></div>';
        throw new Error("Dominio no autorizado");
    }

    var WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyDWCCn2P3v4-Co3OtJWbXQSHR244n96x7x1vqe4mE_L3tMns_E5-aT4CcyyHAPc8L2/exec";

    // State
    var meseroActual = null;
    var mesaCount = 15;
    var productos = [];
    var meseros = [];
    var mesasData = {};
    var comandaActual = [];
    var extrasActual = [];
    var mesaAbierta = null;
    var cmdPersonas = 1;
    var pollTimer = null;
    var notaItemIdx = -1;

    var CAT_SHORT = {
        '🍕 La Vera Pizza Napoletana': '🍕 Pizza',
        '🍝 Pasta Fatta In Casa': '🍝 Pasta',
        '🥗 Antipasti': '🥗 Entrantes',
        '☕ Bebidas Calientes': '☕ Café',
        '❄️ Frappes': '❄️ Frappes',
        '🧊 Bebidas Frías': '🧊 Bebidas',
        '🍨 Dolci de Véneto': '🍨 Postres'
    };

    // Make cmdPersonas accessible to inline onchange
    window.cmdPersonas = 1;
    Object.defineProperty(window, 'cmdPersonas', {
        get: function() { return cmdPersonas; },
        set: function(v) { cmdPersonas = v; }
    });

    // ============================================================
    // INIT
    // ============================================================
    window.addEventListener('DOMContentLoaded', function() {
        loadData();
    });

    async function loadData() {
        try {
            var res = await fetch(WEBAPP_URL + '?action=meseroInit&t=' + Date.now());
            var data = await res.json();
            productos = data.productos || [];
            meseros = data.meseros || [];
            mesaCount = parseInt(data.mesaCount) || 15;

            // Build mesas lookup
            mesasData = {};
            (data.mesas || []).forEach(function(m) {
                mesasData[String(m.mesaNum)] = m;
            });

            document.getElementById('loader').classList.add('hidden');

            // Check stored session
            var saved = sessionStorage.getItem('fiore_mesero');
            if(saved) {
                var m = meseros.find(function(x) { return x.codigo === saved && x.activo === 'SI'; });
                if(m) {
                    meseroActual = m;
                    showApp();
                    return;
                }
            }
            document.getElementById('login-screen').classList.remove('hidden');
        } catch(e) {
            console.error(e);
            document.getElementById('loader').innerHTML = '<p style="color:var(--danger);font-family:var(--font-ui);padding:20px;text-align:center">Error de conexión. Recarga la página.</p>';
        }
    }

    // ============================================================
    // LOGIN
    // ============================================================
    window.loginMesero = async function() {
        var btn = document.querySelector('.login-btn');
        btn.textContent = 'Verificando...';
        btn.style.opacity = '0.7';
        
        var code = document.getElementById('mesero-code').value.trim();
        var m = meseros.find(function(x) { 
            return String(x.codigo).replace(/^0+/, '') === code.replace(/^0+/, '') && x.activo === 'SI'; 
        });

        // Double-check: Si no se encuentra, podría haberse agregado hace 1 segundo y no estar en caché local
        if(!m) {
            try {
                var res = await fetch(WEBAPP_URL + '?action=meseroInit&t=' + Date.now());
                var data = await res.json();
                meseros = data.meseros || [];
                m = meseros.find(function(x) { 
                    return String(x.codigo).replace(/^0+/, '') === code.replace(/^0+/, '') && x.activo === 'SI'; 
                });
            } catch(e) {}
        }

        btn.textContent = 'Entrar';
        btn.style.opacity = '1';

        if(m) {
            meseroActual = m;
            sessionStorage.setItem('fiore_mesero', code);
            showApp();
        } else {
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('mesero-code').value = '';
            setTimeout(function() { document.getElementById('login-error').style.display = 'none'; }, 2000);
        }
    };

    window.cerrarSesion = function() {
        sessionStorage.removeItem('fiore_mesero');
        meseroActual = null;
        if(pollTimer) clearInterval(pollTimer);
        document.getElementById('app-header').style.display = 'none';
        document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
        document.getElementById('login-screen').classList.remove('hidden');
    };

    function showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-header').style.display = '';
        document.getElementById('header-name').textContent = meseroActual.nombre;
        document.getElementById('header-avatar').textContent = meseroActual.codigo;
        showView('view-mesas');
        renderMesaGrid();
        startPolling();
    }

    // ============================================================
    // VIEWS
    // ============================================================
    function showView(id) {
        document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
        var el = document.getElementById(id);
        if(el) el.classList.add('active');
    }

    // ============================================================
    // MESA GRID
    // ============================================================
    function renderMesaGrid() {
        var grid = document.getElementById('mesa-grid-mesero');
        if(!grid) return;
        var html = '';
        for(var i = 1; i <= mesaCount; i++) {
            var key = String(i);
            var mesa = mesasData[key];
            var cls = 'mesa-card libre';
            var statusText = 'Libre';
            var bodyHtml = '';

            if(mesa && mesa.estado === 'abierta') {
                var items = [];
                try { items = JSON.parse(mesa.items); } catch(e) {}
                var extras = [];
                try { extras = JSON.parse(mesa.extras); } catch(e) {}
                var total = items.reduce(function(s, it) { return s + (it.p * it.q); }, 0);
                total += extras.reduce(function(s, ex) { return s + (parseFloat(ex.monto) || 0); }, 0);
                var itemCount = items.reduce(function(s, it) { return s + it.q; }, 0);

                if(mesa.mesero === meseroActual.codigo) {
                    cls = 'mesa-card mia';
                    statusText = 'Mi mesa';
                } else {
                    cls = 'mesa-card otro';
                    var mesNombre = meseros.find(function(m) { return m.codigo === mesa.mesero; });
                    statusText = mesNombre ? mesNombre.nombre : 'Ocupada';
                }
                if(mesa.pideCuenta) {
                    cls = 'mesa-card cuenta';
                    statusText = 'Pide cuenta';
                }
                bodyHtml = '<div class="mesa-card-body">' +
                    '<div class="mesa-card-detail"><i class="ri-group-line"></i> ' + (mesa.personas || 1) + ' personas</div>' +
                    '<div class="mesa-card-detail"><i class="ri-restaurant-line"></i> ' + itemCount + ' productos</div>' +
                    '<div class="mesa-card-total">$' + total.toFixed(0) + '</div>' +
                '</div>';
            }

            html += '<div class="' + cls + '" onclick="abrirMesa(' + i + ')">' +
                '<div class="mesa-card-top">' +
                    '<div class="mesa-card-num">' + i + '</div>' +
                    '<div class="mesa-card-state">' + statusText + '</div>' +
                '</div>' +
                bodyHtml +
            '</div>';
        }
        grid.innerHTML = html;
    }

    // ============================================================
    // ABRIR MESA / COMANDA
    // ============================================================
    window.abrirMesa = function(num) {
        var key = String(num);
        var mesa = mesasData[key];

        // Eliminamos el bloqueo para que cualquier mesero pueda ver y editar cualquier mesa
        // (Esto agiliza la operación cuando se cubren turnos o se apoyan entre sí)
        mesaAbierta = num;
        var titleText = 'Mesa ' + num;
        var el1 = document.getElementById('comanda-title');
        var el2 = document.getElementById('comanda-title-desktop');
        if(el1) el1.textContent = titleText;
        if(el2) el2.textContent = titleText;

        // Load existing data
        if(mesa && mesa.estado === 'abierta') {
            try { comandaActual = JSON.parse(mesa.items); } catch(e) { comandaActual = []; }
            // CRITICAL: Ensure items loaded from server preserve their enviado state
            comandaActual.forEach(function(item) {
                if(item.enviado === undefined) item.enviado = true; // Items from server were already sent
            });
            try { extrasActual = JSON.parse(mesa.extras); } catch(e) { extrasActual = []; }
            cmdPersonas = mesa.personas || 1;
        } else {
            comandaActual = [];
            extrasActual = [];
            cmdPersonas = 1;
        }
        document.getElementById('cmd-personas-val').textContent = cmdPersonas;

        renderCategories();
        renderCmdItems();
        showView('view-comanda');
    };

    window.volverAMesas = function() {
        mesaAbierta = null;
        showView('view-mesas');
        renderMesaGrid();
    };

    window.updatePersonas = function(delta) {
        cmdPersonas += delta;
        if(cmdPersonas < 1) cmdPersonas = 1;
        if(cmdPersonas > 50) cmdPersonas = 50;
        document.getElementById('cmd-personas-val').textContent = cmdPersonas;
    };

    // ============================================================
    // CATEGORIES & PRODUCTS
    // ============================================================
    function renderCategories() {
        var container = document.getElementById('cmd-categories');
        if(!container) return;

        var available = productos.filter(function(p) { return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0; });
        var groups = {};
        var catOrder = [];
        available.forEach(function(p) {
            var cat = p.categoria || 'Otros';
            if(!groups[cat]) { groups[cat] = []; catOrder.push(cat); }
            groups[cat].push(p);
        });

        var html = '<button class="cat-pill active" onclick="filterProducts(\'TODOS\', this)">Todos</button>';
        catOrder.forEach(function(cat) {
            html += '<button class="cat-pill" onclick="filterProducts(\'' + cat.replace(/'/g, "\\'") + '\', this)">' + (CAT_SHORT[cat] || cat) + '</button>';
        });
        container.innerHTML = html;

        renderProductCards(available);
    }

    window.filterProducts = function(cat, btn) {
        document.querySelectorAll('.cat-pill').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');

        var available = productos.filter(function(p) { return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0; });
        if(cat !== 'TODOS') available = available.filter(function(p) { return p.categoria === cat; });
        renderProductCards(available);
    };

    function renderProductCards(items) {
        var grid = document.getElementById('cmd-products');
        if(!grid) return;
        grid.innerHTML = items.map(function(p) {
            return '<div class="prod-card" onclick="addToComanda(\'' + p.id + '\')">' +
                '<div class="pname">' + p.nombre + '</div>' +
                '<div class="pprice">$' + parseFloat(p.precio).toFixed(0) + '</div>' +
            '</div>';
        }).join('');
    }

    // ============================================================
    // COMANDA ITEMS
    // ============================================================
    window.addToComanda = function(id) {
        var prod = productos.find(function(p) { return p.id === id; });
        if(!prod) return;

        var existing = comandaActual.find(function(c) { return c.id === id && !c.enviado; });
        if(existing) {
            existing.q++;
        } else {
            comandaActual.push({
                id: id,
                n: prod.nombre,
                p: parseFloat(prod.precio),
                q: 1,
                nota: '',
                enviado: false
            });
        }
        renderCmdItems();
    };

    window.cmdSub = function(idx) {
        if(comandaActual[idx].q > 1) comandaActual[idx].q--;
        else comandaActual.splice(idx, 1);
        renderCmdItems();
    };

    window.cmdAdd = function(idx) {
        comandaActual[idx].q++;
        renderCmdItems();
    };

    window.cmdDel = function(idx) {
        var itemName = comandaActual[idx] ? comandaActual[idx].n : 'este producto';
        mostrarConfirmacion(
            '¿Eliminar producto?',
            'Se eliminará "' + itemName + '" de la comanda.',
            function() { comandaActual.splice(idx, 1); renderCmdItems(); }
        );
    };

    window.cmdDelExtra = function(idx) {
        var exName = extrasActual[idx] ? extrasActual[idx].concepto : 'este cargo';
        mostrarConfirmacion(
            '¿Eliminar cargo extra?',
            'Se eliminará "' + exName + '" de la comanda.',
            function() { extrasActual.splice(idx, 1); renderCmdItems(); }
        );
    };

    // Notes
    window.abrirNotaModal = function(idx) {
        notaItemIdx = idx;
        document.getElementById('nota-item-name').textContent = comandaActual[idx].n;
        document.getElementById('nota-input').value = comandaActual[idx].nota || '';
        document.getElementById('modal-nota').classList.add('show');
        setTimeout(function() { document.getElementById('nota-input').focus(); }, 200);
    };

    window.insertNotePreset = function(text) {
        var input = document.getElementById('nota-input');
        input.value = input.value ? input.value + ', ' + text : text;
    };

    window.guardarNota = function() {
        if(notaItemIdx >= 0 && notaItemIdx < comandaActual.length) {
            comandaActual[notaItemIdx].nota = document.getElementById('nota-input').value.trim();
        }
        cerrarNotaModal();
        renderCmdItems();
    };

    window.cerrarNotaModal = function() {
        document.getElementById('modal-nota').classList.remove('show');
        notaItemIdx = -1;
    };

    // Extras
    window.abrirExtraModal = function() {
        document.getElementById('extra-concepto').value = '';
        document.getElementById('extra-monto').value = '';
        document.getElementById('modal-extra').classList.add('show');
        setTimeout(function() { document.getElementById('extra-concepto').focus(); }, 200);
    };

    window.cerrarExtraModal = function() {
        document.getElementById('modal-extra').classList.remove('show');
    };

    window.agregarExtra = function() {
        var concepto = document.getElementById('extra-concepto').value.trim();
        var monto = parseFloat(document.getElementById('extra-monto').value) || 0;
        if(!concepto || monto <= 0) {
            showToast('Completa concepto y monto');
            return;
        }
        extrasActual.push({ concepto: concepto, monto: monto });
        cerrarExtraModal();
        renderCmdItems();
    };

    function renderCmdItems() {
        var container = document.getElementById('cmd-items');
        if(!container) return;

        if(comandaActual.length === 0 && extrasActual.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-dim);font-size:13px;padding:20px 0;">Toca un producto para agregar</p>';
        } else {
            var html = '';
            for(var i=0; i<comandaActual.length; i++) {
                var item = comandaActual[i];
                var notaHtml = item.nota ? '<div class="cmd-nota">Nota: ' + item.nota + '</div>' : '';
                
                var opacityStyle = item.enviado ? 'opacity: 0.6; pointer-events: none;' : '';
                var lockIcon = item.enviado ? '<i class="ri-lock-2-line" style="color:var(--warning); margin-left:6px;"></i>' : '';
                var controlsHtml = item.enviado ? 
                    '<span style="font-size:12px; color:var(--warning); font-weight: 500;">🔒 En Preparación</span>' :
                    '<button class="cmd-btn note" onclick="abrirNotaModal(' + i + ')" style="pointer-events: auto;"><i class="ri-pencil-line"></i></button>' +
                    '<div style="flex:1"></div>' +
                    '<div class="cmd-stepper" style="pointer-events: auto;">' +
                        '<button class="cmd-step-btn" onclick="cmdSub(' + i + ')"><i class="ri-subtract-line"></i></button>' +
                        '<div class="cmd-qty">' + item.q + '</div>' +
                        '<button class="cmd-step-btn" onclick="cmdAdd(' + i + ')"><i class="ri-add-line"></i></button>' +
                    '</div>' +
                    '<button class="cmd-btn del" style="margin-left:8px; pointer-events: auto;" onclick="cmdDel(' + i + ')"><i class="ri-delete-bin-line"></i></button>';

                html += '<div class="cmd-item" style="' + opacityStyle + '">' +
                    '<div class="cmd-item-top">' +
                        '<div class="cmd-item-name">' + item.n + lockIcon + '</div>' +
                        '<div class="cmd-item-price">$' + (item.p * item.q).toFixed(2) + '</div>' +
                    '</div>' +
                    '<div class="cmd-item-controls">' + controlsHtml + '</div>' + notaHtml +
                '</div>';
            }

            if(extrasActual.length > 0) {
                html += '<div class="comanda-section-title" style="margin-top:8px">Cargos extra</div>';
                html += extrasActual.map(function(ex, idx) {
                    return '<div class="cmd-extra">' +
                        '<span class="cmd-extra-name">⚡ ' + ex.concepto + '</span>' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<span class="cmd-extra-price">+$' + parseFloat(ex.monto).toFixed(2) + '</span>' +
                            '<button class="cmd-btn del" onclick="cmdDelExtra(' + idx + ')">×</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
            container.innerHTML = html;
        }

        // Update total
        var subtotal = comandaActual.reduce(function(s, i) { return s + (i.p * i.q); }, 0);
        var extrasTotal = extrasActual.reduce(function(s, e) { return s + (parseFloat(e.monto) || 0); }, 0);
        var total = subtotal + extrasTotal;
        document.getElementById('cmd-total').textContent = '$' + total.toFixed(2);
    }

    // ============================================================
    // GUARDAR COMANDA
    // ============================================================
    var guardando = false;

    window.guardarComanda = async function() {
        if(comandaActual.length === 0 && extrasActual.length === 0) {
            showToast('Agrega productos a la comanda');
            return;
        }
        if(guardando) return; // Prevent double-tap
        guardando = true;

        // Show loading state on button
        var saveBtn = document.querySelector('.cmd-save');
        var saveBtnText = '';
        if(saveBtn) { saveBtnText = saveBtn.innerHTML; saveBtn.innerHTML = '<i class="ri-loader-4-line"></i> Enviando...'; saveBtn.style.opacity = '0.6'; saveBtn.disabled = true; }

        var subtotal = comandaActual.reduce(function(s, i) { return s + (i.p * i.q); }, 0);
        var extrasTotal = extrasActual.reduce(function(s, e) { return s + (parseFloat(e.monto) || 0); }, 0);
        var total = subtotal + extrasTotal;

        // KDS DELTA EXTRACTION — collect but do NOT mark enviado yet
        var nuevosItems = [];
        comandaActual.forEach(function(i) { 
            if(!i.enviado) {
                nuevosItems.push(i);
            }
        });

        // BUG 3 FIX: Preserve existing mesa owner
        var existingMesa = mesasData[String(mesaAbierta)];
        var meseroCode = meseroActual.codigo;
        if(existingMesa && existingMesa.mesero && existingMesa.mesero !== meseroActual.codigo) {
            meseroCode = existingMesa.mesero; // Keep original owner
        }

        // BUG 1 FIX: Include pideCuenta flag
        var pideCuentaFlag = (existingMesa && existingMesa.pideCuenta) ? true : false;

        // Prepare items snapshot with enviado=true for the payload
        var itemsSnapshot = comandaActual.map(function(i) {
            return { id: i.id, n: i.n, p: i.p, q: i.q, nota: i.nota || '', enviado: true };
        });

        var mesaPayload = {
            mesaNum: mesaAbierta,
            mesero: meseroCode,
            personas: cmdPersonas,
            items: JSON.stringify(itemsSnapshot),
            extras: JSON.stringify(extrasActual),
            descuento: existingMesa ? existingMesa.descuento : 0,
            total: total,
            pideCuenta: pideCuentaFlag
        };

        // CONCURRENCY FIX: Determine isNew from server state, not local state.
        // A mesa is "new" if there's no server-confirmed open mesa for this number.
        var serverHasMesaOpen = !!(existingMesa && existingMesa.estado === 'abierta' && existingMesa.horaApertura);
        var isNewMesa = !serverHasMesaOpen;

        try {
            // STEP 1: Save mesa FIRST (validate mesa state on server)
            var res = await fetch(WEBAPP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'saveMesa', isNew: isNewMesa, mesa: mesaPayload })
            });
            if(!res.ok) throw new Error("Network error");
            var resData = await res.json();
            
            if(resData.status === 'error' && resData.reason === 'CLOSED') {
                // RACE CONDITION MITIGATION — do NOT send to cocina
                guardando = false;
                if(saveBtn) { saveBtn.innerHTML = saveBtnText; saveBtn.style.opacity = '1'; saveBtn.disabled = false; }
                alert("⛔ ERROR CRÍTICO: La mesa " + mesaAbierta + " fue cobrada en caja hace unos instantes. Tu orden NO fue guardada porque la mesa está cerrada.");
                volverAMesas();
                return;
            }

            // STEP 2: Mesa saved OK — NOW mark items as enviado locally
            comandaActual.forEach(function(i) { i.enviado = true; });

            // STEP 3: Send new items to cocina ONLY after mesa save succeeded
            if(nuevosItems.length > 0) {
                try {
                    await fetch(WEBAPP_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: 'sendToCocina', mesaNum: mesaAbierta, mesero: meseroActual.nombre, nuevosItems: nuevosItems })
                    });
                } catch(e) { console.error("Error enviando a cocina:", e); }
            }

        } catch(e) { 
            console.error(e);
            guardando = false;
            if(saveBtn) { saveBtn.innerHTML = saveBtnText; saveBtn.style.opacity = '1'; saveBtn.disabled = false; }
            alert("📶 ERROR DE CONEXIÓN: Tu orden no se guardó. Por favor acércate a una zona con mejor WiFi e intenta de nuevo.");
            return;
        }

        // Update local state
        mesasData[String(mesaAbierta)] = {
            mesaNum: mesaAbierta,
            estado: 'abierta',
            mesero: meseroCode,
            personas: cmdPersonas,
            items: JSON.stringify(comandaActual),
            extras: JSON.stringify(extrasActual),
            descuento: 0,
            total: total,
            pideCuenta: pideCuentaFlag,
            horaApertura: (existingMesa && existingMesa.horaApertura) || 'local'
        };

        // Restore button
        if(saveBtn) { saveBtn.innerHTML = saveBtnText; saveBtn.style.opacity = '1'; saveBtn.disabled = false; }
        guardando = false;
        showToast('Orden enviada ✓');
        renderCmdItems();
    };

    // ============================================================
    // CONFIRMAR PEDIR CUENTA
    // ============================================================
    window.confirmarPedirCuenta = function() {
        if(!mesaAbierta) return;
        if(comandaActual.length === 0) {
            showToast('No hay comanda para pedir cuenta');
            return;
        }
        var subtotal = comandaActual.reduce(function(s, i) { return s + (i.p * i.q); }, 0);
        var extrasTotal = extrasActual.reduce(function(s, e) { return s + (parseFloat(e.monto) || 0); }, 0);
        var total = subtotal + extrasTotal;
        mostrarConfirmacion(
            '¿Pedir cuenta para Mesa ' + mesaAbierta + '?',
            'Se notificará al administrador que el cliente solicita su cuenta por $' + total.toFixed(2) + '. La orden se enviará automáticamente.',
            function() { pedirCuenta(); }
        );
    };

    window.pedirCuenta = async function() {
        if(!mesaAbierta) return;

        // BUG 1 FIX: Set pideCuenta flag BEFORE saving so it persists to backend
        if(mesasData[String(mesaAbierta)]) {
            mesasData[String(mesaAbierta)].pideCuenta = true;
        }

        // Save comanda with pideCuenta flag included
        await window.guardarComanda();

        // Also log audit for traceability
        try {
            await fetch(WEBAPP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'logAudit',
                    usuario: meseroActual.nombre,
                    accion: 'PIDE_CUENTA',
                    detalles: 'Mesa ' + mesaAbierta
                })
            });
        } catch(e) {}

        showToast('Cuenta solicitada — Mesa ' + mesaAbierta + ' ✓');
        volverAMesas();
    };

    // ============================================================
    // POLLING
    // ============================================================
    function startPolling() {
        if(pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(syncMesas, 30000);
    }

    async function syncMesas() {
        try {
            var res = await fetch(WEBAPP_URL + '?action=syncMesas');
            var data = await res.json();

            // BUG 4 FIX: Preserve the mesa currently being edited
            var editingKey = mesaAbierta ? String(mesaAbierta) : null;
            var editingMesa = editingKey ? mesasData[editingKey] : null;

            mesasData = {};
            (data.mesas || []).forEach(function(m) {
                mesasData[String(m.mesaNum)] = m;
            });

            // Restore the mesa the mesero is currently editing
            if(editingKey && editingMesa) {
                mesasData[editingKey] = editingMesa;
            }

            // Only re-render grid if on mesas view
            if(document.getElementById('view-mesas').classList.contains('active')) {
                renderMesaGrid();
            }
        } catch(e) { console.error('Sync error:', e); }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    function showToast(msg) {
        var t = document.getElementById('toast-mesero');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function() { t.classList.remove('show'); }, 2500);
    }

    // ============================================================
    // CONFIRM MODAL
    // ============================================================
    var pendingConfirmAction = null;

    function mostrarConfirmacion(title, msg, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-msg').textContent = msg;
        pendingConfirmAction = onConfirm;
        document.getElementById('modal-confirm').classList.add('show');
    }

    window.cerrarConfirmModal = function() {
        document.getElementById('modal-confirm').classList.remove('show');
        pendingConfirmAction = null;
    };

    window.ejecutarConfirmacion = function() {
        if(pendingConfirmAction) pendingConfirmAction();
        cerrarConfirmModal();
    };

})();
