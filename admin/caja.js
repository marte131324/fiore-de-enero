// =============================================
// TREZE LABS // MÓDULO CAJA POS + MESAS + DASHBOARD
// Cliente: Fiore de Enero
// v3.0 — Abril 2026
// =============================================

(function() {
    'use strict';

    // ---- State ----
    let ticketActual = [];
    let extrasTicket = [];
    let descuentoActual = 0;
    let metodoPagoActual = 'EFECTIVO';
    let propinaActual = 0;
    let traficoCount = 0;
    let ventasCache = [];
    let cajaReady = false;
    let lastTicketData = null;
    let posProducts = {};
    let mesaActual = null;
    let personasMesa = 1;
    let mesasActivas = {};
    let meserosData = [];
    let mesaCount = 15;
    let pollTimer = null;

    // PIN Gerencial: 1313
    const PIN_GERENCIAL_HASH = '1cfafff6d51a03662b85b93dc3417f51687034ba9a46682f5328257eff7133ed';

    const CAT_SHORT = {
        '🍕 La Vera Pizza Napoletana': '🍕 Pizza',
        '🍝 Pasta Fatta In Casa': '🍝 Pasta',
        '🥗 Antipasti': '🥗 Entrantes',
        '☕ Bebidas Calientes': '☕ Café',
        '❄️ Frappes': '❄️ Frappes',
        '🧊 Bebidas Frías': '🧊 Bebidas',
        '🍨 Dolci de Véneto': '🍨 Postres'
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================

    window.initCajaModule = function() {
        if(cajaReady) return;
        cajaReady = true;

        traficoCount = window._traficoHoy || 0;
        ventasCache = window._ventasHoy || [];

        // Load mesas from server data
        var serverMesas = window._mesasData || [];
        mesasActivas = {};
        serverMesas.forEach(function(m) {
            mesasActivas[String(m.mesaNum)] = m;
        });

        meserosData = window._meserosData || [];
        mesaCount = window._mesaCount || 15;

        initEventDelegation();
        renderPOSGrid();
        updateTraficoUI();
        renderDashboard();
        renderHistorial();
        renderMesasActivas();
        renderMeserosAdmin();
        startPolling();
    };

    function startPolling() {
        if(pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(async function() {
            try {
                var res = await fetch(WEBAPP_URL + '?action=syncMesas');
                var data = await res.json();
                mesasActivas = {};
                (data.mesas || []).forEach(function(m) {
                    mesasActivas[String(m.mesaNum)] = m;
                });
                renderMesasActivas();
            } catch(e) {}
        }, 30000);
    }

    function initEventDelegation() {
        var grid = document.getElementById('pos-grid');
        if(grid) {
            grid.addEventListener('click', function(e) {
                var card = e.target.closest('.pos-card');
                if(card && card.dataset.id) {
                    agregarAlTicket(card.dataset.id);
                    card.style.transform = 'scale(0.93)';
                    setTimeout(function() { card.style.transform = ''; }, 150);
                }
            });
        }

        var cats = document.getElementById('pos-categories');
        if(cats) {
            cats.addEventListener('click', function(e) {
                var pill = e.target.closest('.pos-cat-pill');
                if(!pill) return;
                cats.querySelectorAll('.pos-cat-pill').forEach(function(b) { b.classList.remove('active'); });
                pill.classList.add('active');
                var cat = pill.dataset.cat;
                var prods = (typeof catalogoData !== 'undefined' ? catalogoData : []).filter(function(p) {
                    return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0;
                });
                if(cat === 'TODOS') renderProductCards(prods);
                else renderProductCards(prods.filter(function(p) { return p.categoria === cat; }));
            });
        }

        var ticketCont = document.getElementById('ticket-items');
        if(ticketCont) {
            ticketCont.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-action]');
                if(!btn) return;
                var id = btn.dataset.id;
                var idx = btn.dataset.idx;
                if(btn.dataset.action === 'add') agregarAlTicket(id);
                else if(btn.dataset.action === 'sub') quitarDelTicket(id);
                else if(btn.dataset.action === 'del') eliminarDelTicket(id);
                else if(btn.dataset.action === 'note') abrirNotaItem(id);
                else if(btn.dataset.action === 'delextra') { extrasTicket.splice(parseInt(idx), 1); renderTicket(); }
            });
        }
    }

    // ============================================================
    // POS GRID
    // ============================================================

    function renderPOSGrid() {
        var catsContainer = document.getElementById('pos-categories');
        var gridContainer = document.getElementById('pos-grid');
        if(!catsContainer || !gridContainer || typeof catalogoData === 'undefined' || catalogoData.length === 0) return;

        var prods = catalogoData.filter(function(p) {
            return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0;
        });
        posProducts = {};
        prods.forEach(function(p) { posProducts[p.id] = p; });

        var groups = {}, catOrder = [];
        prods.forEach(function(p) {
            var cat = p.categoria || 'Otros';
            if(!groups[cat]) { groups[cat] = []; catOrder.push(cat); }
            groups[cat].push(p);
        });

        var pills = '<button class="pos-cat-pill active" data-cat="TODOS">Todos</button>';
        catOrder.forEach(function(cat) {
            pills += '<button class="pos-cat-pill" data-cat="' + cat + '">' + (CAT_SHORT[cat] || cat) + '</button>';
        });
        catsContainer.innerHTML = pills;
        renderProductCards(prods);
    }

    function renderProductCards(items) {
        var grid = document.getElementById('pos-grid');
        if(!grid) return;
        grid.innerHTML = items.map(function(p) {
            return '<div class="pos-card" data-id="' + p.id + '">' +
                '<div class="pos-card-name">' + p.nombre + '</div>' +
                '<div class="pos-card-price">$' + parseFloat(p.precio).toFixed(0) + '</div>' +
            '</div>';
        }).join('');
    }

    // ============================================================
    // TICKET MANAGEMENT
    // ============================================================

    function agregarAlTicket(id) {
        var product = posProducts[id];
        if(!product) return;
        var existing = ticketActual.find(function(t) { return t.id === id; });
        if(existing) { existing.qty++; }
        else { ticketActual.push({ id:id, nombre:product.nombre, precio:parseFloat(product.precio), qty:1, nota:'' }); }
        renderTicket();
        syncMesaLocal();
    }

    function quitarDelTicket(id) {
        var item = ticketActual.find(function(t) { return t.id === id; });
        if(item) { item.qty--; if(item.qty <= 0) ticketActual = ticketActual.filter(function(t) { return t.id !== id; }); }
        renderTicket();
        syncMesaLocal();
    }

    function eliminarDelTicket(id) {
        ticketActual = ticketActual.filter(function(t) { return t.id !== id; });
        renderTicket();
        syncMesaLocal();
    }

    function abrirNotaItem(id) {
        var item = ticketActual.find(function(t) { return t.id === id; });
        if(!item) return;
        var nota = prompt('Nota para "' + item.nombre + '":\n(Ej: Sin cebolla, Extra queso, Poco picante)', item.nota || '');
        if(nota !== null) { item.nota = nota.trim(); renderTicket(); syncMesaLocal(); }
    }

    // EXTRAS
    window.agregarExtraTicket = function() {
        var concepto = prompt('Concepto del cargo extra:', '');
        if(!concepto) return;
        var monto = parseFloat(prompt('Monto en pesos ($MXN):', '0'));
        if(!monto || monto <= 0) return;
        extrasTicket.push({ concepto: concepto.trim(), monto: monto });
        renderTicket();
        syncMesaLocal();
    };

    function renderTicket() {
        var container = document.getElementById('ticket-items');
        if(!container) return;

        if(ticketActual.length === 0 && extrasTicket.length === 0) {
            container.innerHTML = '<p class="ticket-empty"><i class="ri-shopping-bag-line" style="font-size:24px;display:block;margin-bottom:8px;"></i>Toca un producto para agregar</p>';
        } else {
            var html = ticketActual.map(function(item) {
                var notaHtml = item.nota ? '<div class="ticket-item-nota"><i class="ri-sticky-note-line"></i> ' + item.nota + '</div>' : '';
                return '<div class="ticket-item">' +
                    '<div class="ticket-item-info">' +
                        '<span class="ticket-item-name">' + item.nombre + '</span>' +
                        '<span class="ticket-item-price">$' + (item.precio * item.qty).toFixed(2) + '</span>' +
                        notaHtml +
                    '</div>' +
                    '<div class="ticket-item-controls">' +
                        '<button class="qty-sm note-btn" data-action="note" data-id="' + item.id + '" title="Nota"><i class="ri-edit-line"></i></button>' +
                        '<button class="qty-sm" data-action="sub" data-id="' + item.id + '">−</button>' +
                        '<span class="qty-num">' + item.qty + '</span>' +
                        '<button class="qty-sm" data-action="add" data-id="' + item.id + '">+</button>' +
                        '<button class="qty-sm del" data-action="del" data-id="' + item.id + '">×</button>' +
                    '</div>' +
                '</div>';
            }).join('');

            if(extrasTicket.length > 0) {
                html += '<div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;border-top:1px dashed var(--border);padding-top:8px;">Cargos extra</div>';
                html += extrasTicket.map(function(ex, idx) {
                    return '<div class="ticket-item" style="border-left:2px solid var(--success);">' +
                        '<div class="ticket-item-info">' +
                            '<span class="ticket-item-name" style="color:var(--success)">⚡ ' + ex.concepto + '</span>' +
                            '<span class="ticket-item-price">+$' + ex.monto.toFixed(2) + '</span>' +
                        '</div>' +
                        '<div class="ticket-item-controls">' +
                            '<button class="qty-sm del" data-action="delextra" data-idx="' + idx + '">×</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
            container.innerHTML = html;
        }

        // Totals
        var subtotal = ticketActual.reduce(function(s, i) { return s + (i.precio * i.qty); }, 0);
        var extrasTotal = extrasTicket.reduce(function(s, e) { return s + e.monto; }, 0);
        var descMonto = subtotal * (descuentoActual / 100);
        var totalSinPropina = subtotal + extrasTotal - descMonto;
        var propinaMonto = totalSinPropina * (propinaActual / 100);
        var total = totalSinPropina + propinaMonto;

        setText('ticket-subtotal', '$' + subtotal.toFixed(2));
        setText('ticket-extras-amount', extrasTicket.length > 0 ? '+$' + extrasTotal.toFixed(2) : '$0.00');
        setText('ticket-total', '$' + total.toFixed(2));
        setText('cobrar-total', total.toFixed(2));

        var discLine = document.getElementById('discount-line');
        if(discLine) {
            if(descuentoActual > 0) { discLine.style.display='flex'; setText('discount-pct', descuentoActual); setText('discount-amount', '-$' + descMonto.toFixed(2)); }
            else { discLine.style.display='none'; }
        }
        var propLine = document.getElementById('propina-line');
        if(propLine) {
            if(propinaActual > 0) { propLine.style.display='flex'; setText('propina-pct', propinaActual); setText('propina-amount', '+$' + propinaMonto.toFixed(2)); }
            else { propLine.style.display='none'; }
        }
        var extrasLine = document.getElementById('extras-line');
        if(extrasLine) { extrasLine.style.display = extrasTicket.length > 0 ? 'flex' : 'none'; }

        var btnCobrar = document.getElementById('btn-cobrar');
        if(btnCobrar) btnCobrar.disabled = (ticketActual.length === 0 && extrasTicket.length === 0);
    }

    window.setDescuento = function(pct, btn) {
        descuentoActual = pct;
        document.querySelectorAll('.disc-btn').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
        renderTicket();
    };
    window.setPropina = function(pct, btn) {
        propinaActual = pct;
        document.querySelectorAll('.propina-btn').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
        renderTicket();
    };
    window.setMetodoPago = function(metodo, btn) {
        metodoPagoActual = metodo;
        document.querySelectorAll('.pay-btn').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
    };

    // ============================================================
    // MESA SELECTOR (POS)
    // ============================================================

    window.abrirSelectorMesa = function() {
        var modal = document.getElementById('modal-mesa');
        if(modal) { renderMesaGrid(); modal.classList.add('show'); }
    };

    function renderMesaGrid() {
        var grid = document.getElementById('mesa-grid');
        if(!grid) return;
        var html = '';
        for(var i = 1; i <= mesaCount; i++) {
            var key = String(i);
            var mesa = mesasActivas[key];
            var activa = mesa && mesa.estado === 'abierta';
            var cls = activa ? 'mesa-btn ocupada' : 'mesa-btn';
            if(mesaActual == i) cls += ' selected';
            var meseroName = '';
            if(activa && mesa.mesero) {
                var m = meserosData.find(function(x) { return x.codigo === mesa.mesero; });
                meseroName = m ? m.nombre : mesa.mesero;
            }
            var info = activa ? '<span class="mesa-info">' + (mesa.personas||1) + 'p · ' + meseroName + '</span>' : '';
            html += '<button class="' + cls + '" onclick="seleccionarMesa(' + i + ')">' +
                '<span class="mesa-num">' + i + '</span>' + info + '</button>';
        }
        grid.innerHTML = html;
    }

    window.seleccionarMesa = function(num) {
        var key = String(num);
        mesaActual = num;

        if(mesasActivas[key] && mesasActivas[key].estado === 'abierta') {
            var mesa = mesasActivas[key];
            try { var items = JSON.parse(mesa.items); ticketActual = items.map(function(i) { return { id:i.id||('m'+Date.now()), nombre:i.n, precio:i.p, qty:i.q, nota:i.nota||'' }; }); } catch(e) { ticketActual = []; }
            try { extrasTicket = JSON.parse(mesa.extras); } catch(e) { extrasTicket = []; }
            personasMesa = mesa.personas || 1;
            descuentoActual = mesa.descuento || 0;
        } else {
            ticketActual = []; extrasTicket = []; personasMesa = 1;
            descuentoActual = 0; propinaActual = 0;
        }

        setText('mesa-actual-label', 'Mesa ' + num);
        var persInput = document.getElementById('personas-mesa');
        if(persInput) persInput.value = personasMesa;
        document.querySelectorAll('.disc-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        document.querySelectorAll('.propina-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        document.querySelectorAll('.pay-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        renderTicket();
        document.getElementById('modal-mesa').classList.remove('show');
    };

    window.updatePersonasMesa = function(val) { personasMesa = parseInt(val) || 1; syncMesaLocal(); };

    function syncMesaLocal() {
        if(!mesaActual) return;
        var key = String(mesaActual);
        var now = new Date();
        var timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        mesasActivas[key] = {
            mesaNum: mesaActual, estado:'abierta', mesero:'Admin', personas:personasMesa,
            horaApertura: (mesasActivas[key] && mesasActivas[key].horaApertura) || timeStr,
            items: JSON.stringify(ticketActual.map(function(i) { return {id:i.id,n:i.nombre,q:i.qty,p:i.precio,nota:i.nota||''}; })),
            extras: JSON.stringify(extrasTicket),
            descuento: descuentoActual, total: calcTotal()
        };
        renderMesasActivas();
    }

    function calcTotal() {
        var subtotal = ticketActual.reduce(function(s,i){ return s+(i.precio*i.qty); }, 0);
        var ext = extrasTicket.reduce(function(s,e){ return s+e.monto; }, 0);
        return subtotal + ext - (subtotal * descuentoActual / 100);
    }

    // ============================================================
    // COBRAR
    // ============================================================

    window.limpiarTicket = function() {
        ticketActual = []; extrasTicket = []; descuentoActual = 0; propinaActual = 0;
        metodoPagoActual = 'EFECTIVO'; mesaActual = null; personasMesa = 1;
        document.querySelectorAll('.disc-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        document.querySelectorAll('.propina-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        document.querySelectorAll('.pay-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        setText('mesa-actual-label', 'Sin mesa');
        var p = document.getElementById('personas-mesa'); if(p) p.value = 1;
        renderTicket();
    };

    window.cobrarTicket = async function() {
        if(ticketActual.length === 0 && extrasTicket.length === 0) return;

        var subtotal = ticketActual.reduce(function(s,i){ return s+(i.precio*i.qty); }, 0);
        var extrasTotal = extrasTicket.reduce(function(s,e){ return s+e.monto; }, 0);
        var descMonto = subtotal * (descuentoActual / 100);
        var totalSinPropina = subtotal + extrasTotal - descMonto;
        var propinaMonto = totalSinPropina * (propinaActual / 100);
        var total = totalSinPropina + propinaMonto;

        var now = new Date();
        var fecha = formatDate(now);
        var hora = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

        var venta = {
            id: 'V' + Date.now(), fecha: fecha, hora: hora,
            mesa: mesaActual || '', mesero: 'Admin', personas: personasMesa,
            items: JSON.stringify(ticketActual.map(function(i) { return {n:i.nombre,q:i.qty,p:i.precio,nota:i.nota||''}; })),
            subtotal: subtotal, descuento: descuentoActual, total: total,
            metodoPago: metodoPagoActual, propina: propinaActual, propinaMonto: propinaMonto,
            extras: JSON.stringify(extrasTicket)
        };

        lastTicketData = {
            id: venta.id, fecha:fecha, hora:hora, mesa:mesaActual, personas:personasMesa,
            items: ticketActual.map(function(i) { return {n:i.nombre,q:i.qty,p:i.precio,nota:i.nota||''}; }),
            extras: extrasTicket.slice(),
            subtotal:subtotal, descuento:descuentoActual, descMonto:descMonto,
            propina:propinaActual, propinaMonto:propinaMonto, extrasTotal:extrasTotal,
            total:total, metodoPago:metodoPagoActual
        };

        var overlay = document.getElementById('cobrar-success');
        if(overlay) { setText('cobrar-success-amount', '$' + total.toFixed(2)); overlay.classList.add('show'); setTimeout(function() { overlay.classList.remove('show'); }, 4000); }

        try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'saveVenta', venta:venta}) }); } catch(e) {}

        // Close mesa in GSheets
        if(mesaActual) {
            try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'closeMesa', mesaNum:mesaActual, usuario:'Admin'}) }); } catch(e) {}
            delete mesasActivas[String(mesaActual)];
        }

        ventasCache.push(venta);
        window.limpiarTicket();
        renderDashboard(); renderHistorial(); renderMesasActivas();
        showToast('Venta registrada: $' + total.toFixed(2));
    };

    // ============================================================
    // MESAS ACTIVAS VIEW
    // ============================================================

    function renderMesasActivas() {
        var container = document.getElementById('mesas-grid-view');
        if(!container) return;

        var keys = Object.keys(mesasActivas).filter(function(k) {
            var m = mesasActivas[k];
            if(!m || m.estado !== 'abierta') return false;
            var items = []; try { items = JSON.parse(m.items); } catch(e) {}
            return items.length > 0;
        }).sort(function(a,b) { return parseInt(a) - parseInt(b); });

        if(keys.length === 0) {
            container.innerHTML = '<div class="historial-empty"><i class="ri-restaurant-line"></i><p>No hay mesas activas</p></div>';
            return;
        }

        container.innerHTML = keys.map(function(num) {
            var mesa = mesasActivas[num];
            var items = []; try { items = JSON.parse(mesa.items); } catch(e) {}
            var extras = []; try { extras = JSON.parse(mesa.extras); } catch(e) {}
            var subtotal = items.reduce(function(s,i){ return s+(i.p*i.q); }, 0);
            var extrasT = extras.reduce(function(s,e){ return s+(parseFloat(e.monto)||0); }, 0);
            var desc = subtotal * ((mesa.descuento||0)/100);
            var total = subtotal + extrasT - desc;
            var meseroName = 'Admin';
            if(mesa.mesero && mesa.mesero !== 'Admin') {
                var m = meserosData.find(function(x) { return x.codigo === mesa.mesero; });
                meseroName = m ? m.nombre : mesa.mesero;
            }

            var itemsHtml = items.map(function(i) {
                var nota = i.nota ? '<div style="font-size:11px;color:var(--success);font-style:italic;margin-top:2px;">📝 ' + i.nota + '</div>' : '';
                return '<div class="historial-item-row"><span>' + i.n + ' × ' + i.q + '</span><span style="color:var(--accent)">$' + (i.q*i.p).toFixed(2) + '</span></div>' + nota;
            }).join('');

            if(extras.length > 0) {
                itemsHtml += extras.map(function(ex) {
                    return '<div class="historial-item-row"><span style="color:var(--success)">⚡ ' + ex.concepto + '</span><span style="color:var(--accent)">+$' + parseFloat(ex.monto).toFixed(2) + '</span></div>';
                }).join('');
            }

            // Formatear Fecha/Hora
            var timeStr = mesa.horaApertura || mesa.ultimaAct || '--:--';
            if (timeStr.indexOf('T') !== -1) {
                try {
                    var d = new Date(timeStr);
                    timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } catch(e) {
                    timeStr = timeStr.split('T')[1].substring(0, 5);
                }
            } else if (timeStr.indexOf('1899') !== -1) {
                var parts = timeStr.split('T');
                if(parts.length > 1) timeStr = parts[1].substring(0, 5);
            } else {
                if(timeStr.length > 15) {
                    var ds = new Date(timeStr);
                    if(!isNaN(ds)) timeStr = ds.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }

            // pideCuenta badge (BUG 6 FIX)
            var cuentaBadge = '';
            if(mesa.pideCuenta) {
                cuentaBadge = '<span class="mesa-status-badge" style="background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.4);animation:pulse-cuenta-admin 2s infinite;"><i class="ri-bill-line"></i> PIDE CUENTA</span>';
            }

            return '<div class="mesa-status-card"' + (mesa.pideCuenta ? ' style="border:1px solid rgba(167,139,250,0.4);box-shadow:0 0 20px rgba(167,139,250,0.15);"' : '') + '>' +
                '<div class="mesa-status-header">' +
                    '<div class="mesa-status-left">' +
                        '<div class="mesa-status-left-top">' +
                            '<span class="mesa-status-num">Mesa ' + num + '</span>' +
                            cuentaBadge +
                            '<span class="mesa-status-badge badge-green"><i class="ri-group-line"></i> ' + (mesa.personas||1) + 'p</span>' +
                            '<span class="mesa-status-badge badge-gold"><i class="ri-user-star-line"></i> ' + meseroName + '</span>' +
                        '</div>' +
                        '<span class="mesa-status-time"><i class="ri-time-line"></i> Abierta a las ' + timeStr + '</span>' +
                    '</div>' +
                    '<span class="mesa-status-total">$' + total.toFixed(2) + '</span>' +
                '</div>' +
                '<div class="mesa-status-items">' + itemsHtml + '</div>' +
                '<div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:12px;background:rgba(0,0,0,0.15);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between;">' +
                    '<span>Promedio por persona ('+ (mesa.personas||1) + ')</span>' +
                    '<strong style="color:var(--accent)">$' + (total / (mesa.personas||1)).toFixed(2) + '</strong>' +
                '</div>' +
                '<div class="mesa-status-actions">' +
                    '<button class="btn btn-secondary btn-sm" onclick="irAMesa(' + num + ')" style="flex:1;justify-content:center;height:42px;"><i class="ri-shopping-cart-line"></i> Pasar a Caja</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="modificarMesa(' + num + ')" style="flex:1;justify-content:center;height:42px;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.3);"><i class="ri-pencil-line"></i> Modificar Mesa</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    window.irAMesa = function(num) {
        var navItems = document.querySelectorAll('.nav-item');
        for(var i = 0; i < navItems.length; i++) {
            if(navItems[i].textContent.trim().indexOf('Caja POS') !== -1) {
                switchView('v-caja', navItems[i]);
                break;
            }
        }
        window.seleccionarMesa(num);
    };

    // ============================================================
    // GERENCIAL PIN + MESA EDITOR
    // ============================================================

    window.modificarMesa = function(num) {
        window._mesaAModificar = num;
        var modal = document.getElementById('modal-gerencial');
        if(modal) {
            document.getElementById('pin-gerencial-input').value = '';
            document.getElementById('pin-gerencial-error').style.display = 'none';
            modal.classList.add('show');
        }
    };

    window.verificarPinGerencial = async function() {
        var input = document.getElementById('pin-gerencial-input').value;
        var encoder = new TextEncoder();
        var data = encoder.encode(input);
        var hashBuffer = await crypto.subtle.digest('SHA-256', data);
        var hashed = Array.from(new Uint8Array(hashBuffer)).map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
        if(hashed === PIN_GERENCIAL_HASH) {
            document.getElementById('modal-gerencial').classList.remove('show');
            abrirEditorMesa(window._mesaAModificar);
        } else {
            document.getElementById('pin-gerencial-error').style.display = 'block';
            document.getElementById('pin-gerencial-input').value = '';
            setTimeout(function() { document.getElementById('pin-gerencial-error').style.display = 'none'; }, 2000);
        }
    };

    function abrirEditorMesa(num) {
        var mesa = mesasActivas[String(num)];
        if(!mesa) return;
        var modal = document.getElementById('modal-editar-mesa');
        if(!modal) return;
        document.getElementById('edit-mesa-title').textContent = 'Modificar Mesa ' + num;
        document.getElementById('edit-mesa-num').value = num;
        var items = []; try { items = JSON.parse(mesa.items); } catch(e) {}
        var extras = []; try { extras = JSON.parse(mesa.extras); } catch(e) {}
        var html = items.map(function(item, idx) {
            return '<div class="edit-item-row" data-idx="' + idx + '">' +
                '<span class="edit-item-name">' + item.n + (item.nota ? ' <em style="color:var(--success);font-size:11px">(' + item.nota + ')</em>' : '') + '</span>' +
                '<input type="number" class="edit-item-qty" value="' + item.q + '" min="0" style="width:60px" onchange="updateEditItem(' + num + ',' + idx + ',this.value)">' +
                '<span class="edit-item-price">$' + (item.q*item.p).toFixed(2) + '</span>' +
                '<button class="qty-sm del" onclick="removeEditItem(' + num + ',' + idx + ')">×</button>' +
            '</div>';
        }).join('');
        if(extras.length > 0) {
            html += '<div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;border-top:1px dashed var(--border);padding-top:8px;">Extras</div>';
            html += extras.map(function(ex, idx) {
                return '<div class="edit-item-row"><span class="edit-item-name" style="color:var(--success)">⚡ ' + ex.concepto + '</span><span class="edit-item-price">+$' + parseFloat(ex.monto).toFixed(2) + '</span><button class="qty-sm del" onclick="removeEditExtra(' + num + ',' + idx + ')">×</button></div>';
            }).join('');
        }
        document.getElementById('edit-mesa-items').innerHTML = html;
        var subtotal = items.reduce(function(s,i){ return s+(i.p*i.q); }, 0) + extras.reduce(function(s,e){ return s+(parseFloat(e.monto)||0); }, 0);
        document.getElementById('edit-mesa-subtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('edit-mesa-descuento').value = mesa.descuento || 0;
        modal.classList.add('show');
    }

    window.updateEditItem = function(mesaNum, idx, newQty) {
        var key = String(mesaNum);
        var items = []; try { items = JSON.parse(mesasActivas[key].items); } catch(e) {}
        var qty = parseInt(newQty) || 0;
        if(qty <= 0) items.splice(idx, 1); else items[idx].q = qty;
        mesasActivas[key].items = JSON.stringify(items);
        abrirEditorMesa(mesaNum);
    };
    window.removeEditItem = function(mesaNum, idx) {
        var key = String(mesaNum);
        var items = []; try { items = JSON.parse(mesasActivas[key].items); } catch(e) {}
        items.splice(idx, 1);
        mesasActivas[key].items = JSON.stringify(items);
        logAudit('MODIFICAR_MESA', 'Mesa ' + mesaNum + ': Item eliminado');
        abrirEditorMesa(mesaNum);
    };
    window.removeEditExtra = function(mesaNum, idx) {
        var key = String(mesaNum);
        var extras = []; try { extras = JSON.parse(mesasActivas[key].extras); } catch(e) {}
        extras.splice(idx, 1);
        mesasActivas[key].extras = JSON.stringify(extras);
        abrirEditorMesa(mesaNum);
    };

    window.guardarEdicionMesa = async function() {
        var num = document.getElementById('edit-mesa-num').value;
        var key = String(num);
        var desc = parseInt(document.getElementById('edit-mesa-descuento').value) || 0;
        mesasActivas[key].descuento = desc;
        var items = []; try { items = JSON.parse(mesasActivas[key].items); } catch(e) {}
        var extras = []; try { extras = JSON.parse(mesasActivas[key].extras); } catch(e) {}

        if(items.length === 0 && extras.length === 0) {
            delete mesasActivas[key];
            try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'cancelMesa', mesaNum:num, usuario:'Gerente', motivo:'Sin items'}) }); } catch(e) {}
        } else {
            var subtotal = items.reduce(function(s,i){ return s+(i.p*i.q); }, 0);
            var extT = extras.reduce(function(s,e){ return s+(parseFloat(e.monto)||0); }, 0);
            var total = subtotal + extT - (subtotal * desc / 100);
            mesasActivas[key].total = total;
            try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'saveMesa', mesa:{ mesaNum:num, mesero:mesasActivas[key].mesero||'Admin', personas:mesasActivas[key].personas||1, items:mesasActivas[key].items, extras:mesasActivas[key].extras, descuento:desc, total:total }}) }); } catch(e) {}
        }
        logAudit('MODIFICAR_MESA', 'Mesa ' + num + ' modificada por gerente. Desc: ' + desc + '%');
        renderMesasActivas();
        document.getElementById('modal-editar-mesa').classList.remove('show');
        if(mesaActual == num) { window.seleccionarMesa(parseInt(num)); }
        showToast('Mesa ' + num + ' modificada');
    };

    window.cancelarMesa = async function(num) {
        if(!confirm('¿Cancelar toda la cuenta de Mesa ' + num + '?')) return;
        delete mesasActivas[String(num)];
        try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'cancelMesa', mesaNum:num, usuario:'Gerente', motivo:'Cancelación gerencial'}) }); } catch(e) {}
        logAudit('CANCELAR_MESA', 'Mesa ' + num + ' cancelada por gerente');
        renderMesasActivas();
        if(mesaActual == num) window.limpiarTicket();
        document.getElementById('modal-editar-mesa').classList.remove('show');
        showToast('Mesa ' + num + ' cancelada');
    };

    // ============================================================
    // MESEROS MANAGEMENT (ADMIN)
    // ============================================================

    function renderMeserosAdmin() {
        var container = document.getElementById('meseros-list');
        if(!container) return;
        if(meserosData.length === 0) {
            container.innerHTML = '<p style="color:var(--text-dim);font-size:13px;text-align:center;padding:20px;">No hay meseros registrados. Agrega el primero.</p>';
            return;
        }
        container.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:8px;color:var(--text-dim);font-weight:500;">Código</th><th style="text-align:left;padding:8px;color:var(--text-dim);font-weight:500;">Nombre</th><th style="text-align:left;padding:8px;color:var(--text-dim);font-weight:500;">Estado</th><th style="padding:8px;"></th></tr></thead><tbody>' +
            meserosData.map(function(m) {
                var badge = m.activo === 'SI' ? '<span style="color:var(--success);font-weight:600;">ACTIVO</span>' : '<span style="color:var(--danger);font-weight:600;">INACTIVO</span>';
                return '<tr style="border-bottom:1px dashed rgba(255,255,255,0.05);"><td style="padding:10px 8px;font-weight:600;color:var(--accent);">' + m.codigo + '</td><td style="padding:10px 8px;">' + m.nombre + '</td><td style="padding:10px 8px;">' + badge + '</td><td style="padding:10px 8px;text-align:right;"><button class="btn btn-secondary btn-sm" onclick="editarMesero(\'' + m.codigo + '\')"><i class="ri-edit-line"></i></button> <button class="btn btn-danger btn-sm" onclick="eliminarMesero(\'' + m.codigo + '\')"><i class="ri-delete-bin-line"></i></button></td></tr>';
            }).join('') + '</tbody></table>';
    }

    window.agregarMesero = function() {
        var codigo = prompt('Código del mesero (2-4 dígitos):', '');
        if(!codigo) return;
        if(meserosData.find(function(m) { return m.codigo === codigo; })) { showToast('Código ya existe'); return; }
        var nombre = prompt('Nombre del mesero:', '');
        if(!nombre) return;
        var mesero = { codigo: codigo.trim(), nombre: nombre.trim(), activo: 'SI' };
        meserosData.push(mesero);
        renderMeserosAdmin();
        fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'saveMesero', mesero:mesero}) });
        showToast('Mesero ' + nombre + ' agregado');
    };

    window.editarMesero = function(codigo) {
        var m = meserosData.find(function(x) { return x.codigo === codigo; });
        if(!m) return;
        var nombre = prompt('Nombre:', m.nombre);
        if(nombre === null) return;
        var activo = confirm('¿Mesero activo?') ? 'SI' : 'NO';
        m.nombre = nombre.trim();
        m.activo = activo;
        renderMeserosAdmin();
        fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'saveMesero', mesero:m}) });
        showToast('Mesero actualizado');
    };

    window.eliminarMesero = function(codigo) {
        if(!confirm('¿Eliminar mesero ' + codigo + '?')) return;
        meserosData = meserosData.filter(function(m) { return m.codigo !== codigo; });
        renderMeserosAdmin();
        fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'deleteMesero', codigo:codigo}) });
        showToast('Mesero eliminado');
    };

    // ============================================================
    // MESA COUNT CONFIG
    // ============================================================
    window.updateMesaCount = function(val) {
        mesaCount = parseInt(val) || 15;
        window._mesaCount = mesaCount;
    };

    // ============================================================
    // TRAFFIC
    // ============================================================
    window.incrementarTrafico = function() { traficoCount++; updateTraficoUI(); saveTrafico(); };
    window.decrementarTrafico = function() { if(traficoCount > 0) traficoCount--; updateTraficoUI(); saveTrafico(); };

    function updateTraficoUI() {
        var el = document.getElementById('traffic-number');
        if(el) { el.textContent = traficoCount; el.style.transform='scale(1.1)'; setTimeout(function(){ el.style.transform='scale(1)'; }, 200); }
        var dateEl = document.getElementById('traffic-date');
        if(dateEl) {
            var now = new Date();
            var dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            dateEl.textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()];
        }
        setText('kpi-personas', traficoCount);
    }

    async function saveTrafico() {
        try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'updateTrafico', personas:traficoCount}) }); } catch(e) {}
    }

    // ============================================================
    // DASHBOARD
    // ============================================================
    function renderDashboard() {
        var totalVenta = ventasCache.reduce(function(s,v){ return s+(parseFloat(v.total)||0); }, 0);
        var numTickets = ventasCache.length;
        var promedio = numTickets > 0 ? totalVenta / numTickets : 0;
        setText('kpi-venta-total','$'+totalVenta.toFixed(2));
        setText('kpi-tickets', numTickets);
        setText('kpi-promedio','$'+promedio.toFixed(2));
        setText('kpi-personas', traficoCount);
        renderMetodosPago(); renderTopProductos(); renderFlopProductos(); renderHourlyChart(); renderConversionGauge();
    }

    function renderMetodosPago() {
        var el = document.getElementById('dash-metodos');
        if(!el) return;
        var metodos = {};
        ventasCache.forEach(function(v) { var m = v.metodoPago || 'EFECTIVO'; if(!metodos[m]) metodos[m] = {count:0,total:0}; metodos[m].count++; metodos[m].total += parseFloat(v.total)||0; });
        var keys = Object.keys(metodos);
        if(keys.length === 0) { el.innerHTML = '<p class="dash-empty">Sin ventas registradas</p>'; return; }
        var icons = { EFECTIVO:'ri-money-dollar-circle-line', TARJETA:'ri-bank-card-line', TRANSFERENCIA:'ri-smartphone-line' };
        el.innerHTML = keys.map(function(m) { return '<div class="metodo-row"><span><i class="'+( icons[m]||'ri-money-dollar-circle-line')+'"></i> '+m+'</span><span>'+metodos[m].count+' — <strong>$'+metodos[m].total.toFixed(2)+'</strong></span></div>'; }).join('');
    }

    function renderTopProductos() {
        var el = document.getElementById('dash-top-productos');
        if(!el) return;
        var prods = {};
        ventasCache.forEach(function(v) { try { var items = JSON.parse(v.items); items.forEach(function(i) { if(!prods[i.n]) prods[i.n] = {qty:0,rev:0}; prods[i.n].qty += i.q; prods[i.n].rev += i.q*i.p; }); } catch(e) {} });
        var sorted = Object.entries(prods).sort(function(a,b){ return b[1].qty - a[1].qty; }).slice(0,5);
        if(sorted.length === 0) { el.innerHTML = '<p class="dash-empty">Sin ventas registradas</p>'; return; }
        el.innerHTML = sorted.map(function(e,i) { return '<div class="top-product-row"><span class="top-rank">#'+(i+1)+'</span><span class="top-name">'+e[0]+'</span><span class="top-qty">'+e[1].qty+' uds — $'+e[1].rev.toFixed(2)+'</span></div>'; }).join('');
    }

    function renderFlopProductos() {
        var el = document.getElementById('dash-flop-productos');
        if(!el) return;
        var prods = {};
        ventasCache.forEach(function(v) { try { var items = JSON.parse(v.items); items.forEach(function(i) { if(!prods[i.n]) prods[i.n] = {qty:0,rev:0}; prods[i.n].qty += i.q; prods[i.n].rev += i.q*i.p; }); } catch(e) {} });
        var sorted = Object.entries(prods).sort(function(a,b){ return a[1].qty - b[1].qty; }).slice(0,5);
        if(sorted.length === 0) { el.innerHTML = '<p class="dash-empty">Sin ventas registradas</p>'; return; }
        el.innerHTML = sorted.map(function(e,i) { return '<div class="top-product-row" style="opacity:0.8"><span class="top-rank" style="color:var(--danger)">#'+(i+1)+'</span><span class="top-name">'+e[0]+'</span><span class="top-qty">'+e[1].qty+' uds — $'+e[1].rev.toFixed(2)+'</span></div>'; }).join('');
    }

    function renderHourlyChart() {
        var c = document.getElementById('chart-hourly');
        if(!c) return;
        if(ventasCache.length === 0) { c.innerHTML = '<p class="dash-empty">Sin datos</p>'; return; }
        var hd = {}, max = 0;
        ventasCache.forEach(function(v) { var h = (v.hora||'00:00').split(':')[0]; if(!hd[h]) hd[h]={count:0,total:0}; hd[h].count++; hd[h].total += parseFloat(v.total)||0; if(hd[h].total > max) max = hd[h].total; });
        var hours = Object.keys(hd).sort();
        c.innerHTML = '<div class="hour-bars">' + hours.map(function(h) { var pct = max > 0 ? (hd[h].total/max*100) : 0; return '<div class="hour-bar-row"><span class="hour-bar-label">'+h+':00</span><div class="hour-bar-track"><div class="hour-bar-fill" style="width:'+pct+'%"></div></div><span class="hour-bar-value">$'+hd[h].total.toFixed(0)+' ('+hd[h].count+')</span></div>'; }).join('') + '</div>';
    }

    function renderConversionGauge() {
        var c = document.getElementById('chart-conversion');
        if(!c) return;
        var tickets = ventasCache.length, personas = traficoCount;
        var pct = personas > 0 ? Math.min(100, Math.round((tickets/personas)*100)) : 0;
        var circ = 2*Math.PI*58, off = circ - (pct/100)*circ;
        c.innerHTML = '<div class="gauge-ring"><svg width="140" height="140" viewBox="0 0 140 140"><circle class="track" cx="70" cy="70" r="58"></circle><circle class="fill" cx="70" cy="70" r="58" stroke-dasharray="'+circ.toFixed(2)+'" stroke-dashoffset="'+off.toFixed(2)+'"></circle></svg><div class="gauge-percent">'+pct+'%</div></div><div class="gauge-label">Tasa de Conversión</div><div class="gauge-detail"><strong>'+tickets+'</strong> tickets de <strong>'+personas+'</strong> personas</div>';
    }

    window.filtrarDash = async function(periodo, btn) {
        document.querySelectorAll('.dash-filter').forEach(function(b){ b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
        if(periodo === 'hoy') { ventasCache = window._ventasHoy || []; renderDashboard(); return; }
        var now = new Date(), desde, hasta;
        if(periodo === 'ayer') { var a = new Date(now); a.setDate(a.getDate()-1); desde=hasta=formatDate(a); }
        else if(periodo === 'semana') { var i = new Date(now); i.setDate(i.getDate()-7); desde=formatDate(i); hasta=formatDate(now); }
        try { var res = await fetch(WEBAPP_URL+'?action=getVentasRango&desde='+desde+'&hasta='+hasta); var data = await res.json(); ventasCache = data.ventas || []; renderDashboard(); } catch(e) { showToast('Error cargando datos'); }
    };

    // ============================================================
    // HISTORIAL
    // ============================================================
    function renderHistorial() {
        var container = document.getElementById('historial-list');
        if(!container) return;
        if(ventasCache.length === 0) { container.innerHTML = '<div class="historial-empty"><i class="ri-file-list-3-line"></i><p>No hay ventas registradas hoy</p></div>'; setText('historial-count','0 tickets'); return; }
        var ventas = ventasCache.slice().reverse();
        setText('historial-count', ventas.length + ' ticket' + (ventas.length !== 1 ? 's' : ''));
        container.innerHTML = ventas.map(function(v) {
            var items = []; try { items = JSON.parse(v.items); } catch(e) {}
            var extras = []; try { extras = JSON.parse(v.extras || '[]'); } catch(e) {}
            var mesaTag = v.mesa ? ' · Mesa ' + v.mesa : '';
            var meseroTag = v.mesero && v.mesero !== 'Admin' ? ' · ' + v.mesero : '';
            return '<div class="historial-ticket"><div class="historial-ticket-header" onclick="this.nextElementSibling.classList.toggle(\'open\')"><div class="historial-ticket-left"><span class="historial-ticket-time"><i class="ri-time-line"></i> ' + (v.hora||'--:--') + '</span><span class="historial-ticket-method">' + (v.metodoPago||'EFECTIVO') + '</span><span style="font-size:11px;color:var(--text-dim)">' + items.length + ' prod' + mesaTag + meseroTag + '</span></div><span class="historial-ticket-total">$' + (parseFloat(v.total)||0).toFixed(2) + '</span></div><div class="historial-detail"><div class="historial-detail-inner">' +
                items.map(function(i) { var nota = i.nota ? '<div style="font-size:11px;color:var(--success);font-style:italic">  → '+i.nota+'</div>' : ''; return '<div class="historial-item-row"><span>'+i.n+' × '+i.q+'</span><span style="color:var(--accent)">$'+(i.q*i.p).toFixed(2)+'</span></div>'+nota; }).join('') +
                extras.map(function(ex) { return '<div class="historial-item-row"><span style="color:var(--success)">⚡ '+ex.concepto+'</span><span style="color:var(--accent)">+$'+parseFloat(ex.monto).toFixed(2)+'</span></div>'; }).join('') +
                (parseFloat(v.propinaMonto) > 0 ? '<div class="historial-summary"><span>Propina '+v.propina+'%</span><span style="color:var(--accent)">+$'+parseFloat(v.propinaMonto).toFixed(2)+'</span></div>' : '') +
            '<button class="btn btn-secondary btn-sm" onclick="reimprimirTicket(\''+v.id+'\')" style="width:100%;margin-top:10px;"><i class="ri-whatsapp-line"></i> Compartir Ticket</button></div></div></div>';
        }).join('');
    }

    // ============================================================
    // WHATSAPP (FIXED EMOJIS)
    // ============================================================
    window.enviarTicketWhatsApp = function() {
        if(!lastTicketData) return;
        var t = lastTicketData;
        var items = t.items.map(function(i) {
            var line = '• ' + i.n + ' ×' + i.q + ' — $' + (i.q*i.p).toFixed(2);
            if(i.nota) line += '\n   _' + i.nota + '_';
            return line;
        }).join('\n');
        var extrasText = t.extras.length > 0 ? '\n\n⚡ *Extras:*\n' + t.extras.map(function(e) { return '• ' + e.concepto + ' +$' + parseFloat(e.monto).toFixed(2); }).join('\n') : '';
        var mesaLine = t.mesa ? '\n🪑 Mesa: ' + t.mesa + ' (' + t.personas + ' personas)\n' : '\n';
        var text = '🌿 *FIORE DE ENERO*\n━━━━━━━━━━━━━━━\n📋 Ticket: ' + t.id + '\n📅 ' + t.fecha + ' — ' + t.hora + mesaLine + '\n🍽 *Detalle:*\n' + items + extrasText + '\n\n💰 Subtotal: $' + t.subtotal.toFixed(2) + '\n' +
            (t.extrasTotal > 0 ? '⚡ Extras: +$' + t.extrasTotal.toFixed(2) + '\n' : '') +
            (t.descuento > 0 ? '🎁 Descuento (' + t.descuento + '%): -$' + t.descMonto.toFixed(2) + '\n' : '') +
            (t.propina > 0 ? '💝 Propina (' + t.propina + '%): +$' + t.propinaMonto.toFixed(2) + '\n' : '') +
            '━━━━━━━━━━━━━━━\n✅ *TOTAL: $' + t.total.toFixed(2) + '*\n💳 Método: ' + t.metodoPago + '\n\nGracias por tu preferencia 🌸';
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };

    window.reimprimirTicket = function(id) {
        var v = ventasCache.find(function(x) { return x.id === id; });
        if(!v) { showToast('Ticket no encontrado'); return; }
        
        var items = []; try { items = JSON.parse(v.items); } catch(e) {}
        var extras = []; try { extras = JSON.parse(v.extras || '[]'); } catch(e) {}

        lastTicketData = {
            id: v.id,
            fecha: v.fecha,
            hora: v.hora,
            mesa: v.mesa || '',
            personas: v.personas || 1,
            items: items,
            extras: extras,
            extrasTotal: extras.reduce(function(s, e) { return s + (parseFloat(e.monto) || 0); }, 0),
            subtotal: parseFloat(v.subtotal) || 0,
            descuento: parseFloat(v.descuento) || 0,
            descMonto: parseFloat(v.descMonto) || 0,
            propina: parseFloat(v.propina) || 0,
            propinaMonto: parseFloat(v.propinaMonto) || 0,
            total: parseFloat(v.total) || 0,
            metodoPago: v.metodoPago || 'EFECTIVO'
        };
        enviarTicketWhatsApp();
    };

    window.descargarReporteCSV = function() {
        if(ventasCache.length === 0) { showToast('No hay ventas para exportar'); return; }
        var headers = ['ID Ticket', 'Fecha', 'Hora', 'Mesa', 'Mesero', 'Personas', 'Metodo Pago', 'Items', 'Cargos Extra', 'Subtotal', 'Descuento %', 'Descuento $', 'Propina %', 'Propina $', 'TOTAL'];
        var rows = ventasCache.map(function(v) {
            var itemsStr = '[]';
            try { itemsStr = JSON.parse(v.items).map(function(i){ return i.q + 'x ' + i.n; }).join(' | '); } catch(e) {}
            var extrasStr = '[]';
            try { extrasStr = JSON.parse(v.extras || '[]').map(function(e){ return e.concepto + ' (+$' + e.monto + ')'; }).join(' | '); } catch(e) {}
            
            return [
                v.id, v.fecha, v.hora, v.mesa || '', v.mesero || 'Admin', v.personas || 1, v.metodoPago || 'EFECTIVO',
                '"' + itemsStr + '"', '"' + extrasStr + '"',
                parseFloat(v.subtotal||0).toFixed(2),
                v.descuento||0, parseFloat(v.descMonto||0).toFixed(2),
                v.propina||0, parseFloat(v.propinaMonto||0).toFixed(2),
                parseFloat(v.total||0).toFixed(2)
            ].join(',');
        });
        
        var csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_ventas_" + formatDate(new Date()) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ============================================================
    // STOCK SYNC + AUDIT
    // ============================================================
    window.refreshPOSAfterCatalog = function() { if(!cajaReady) return; posProducts = {}; renderPOSGrid(); };

    async function logAudit(accion, detalles) {
        try { await fetch(WEBAPP_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'logAudit', usuario:'Admin', accion:accion, detalles:detalles}) }); } catch(e) {}
    }

    // ============================================================
    // HELPERS
    // ============================================================
    function setText(id, val) { var el = document.getElementById(id); if(el) el.textContent = val; }
    function formatDate(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

})();
