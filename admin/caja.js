// =============================================
// TREZE LABS // MÓDULO CAJA POS + DASHBOARD
// Cliente: Fiore de Enero
// v1.0 — Abril 2026
// =============================================

(function() {
    'use strict';

    // ---- State ----
    let ticketActual = [];
    let descuentoActual = 0;
    let metodoPagoActual = 'EFECTIVO';
    let traficoCount = 0;
    let ventasCache = [];
    let cajaReady = false;
    let posProducts = {};

    // ---- Category short names for POS pills ----
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

        initEventDelegation();
        renderPOSGrid();
        updateTraficoUI();
        renderDashboard();
    };

    function initEventDelegation() {
        // POS grid — click on product card
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

        // Category pills
        var cats = document.getElementById('pos-categories');
        if(cats) {
            cats.addEventListener('click', function(e) {
                var pill = e.target.closest('.pos-cat-pill');
                if(!pill) return;
                cats.querySelectorAll('.pos-cat-pill').forEach(function(b) { b.classList.remove('active'); });
                pill.classList.add('active');

                var cat = pill.dataset.cat;
                var productos = (typeof catalogoData !== 'undefined' ? catalogoData : []).filter(function(p) {
                    return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0;
                });
                if(cat === 'TODOS') renderProductCards(productos);
                else renderProductCards(productos.filter(function(p) { return p.categoria === cat; }));
            });
        }

        // Ticket item actions
        var ticketCont = document.getElementById('ticket-items');
        if(ticketCont) {
            ticketCont.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-action]');
                if(!btn) return;
                var id = btn.dataset.id;
                if(btn.dataset.action === 'add') agregarAlTicket(id);
                else if(btn.dataset.action === 'sub') quitarDelTicket(id);
                else if(btn.dataset.action === 'del') eliminarDelTicket(id);
            });
        }
    }

    // ============================================================
    // POS / CAJA
    // ============================================================

    function renderPOSGrid() {
        var catsContainer = document.getElementById('pos-categories');
        var gridContainer = document.getElementById('pos-grid');
        if(!catsContainer || !gridContainer || typeof catalogoData === 'undefined' || catalogoData.length === 0) return;

        var productos = catalogoData.filter(function(p) {
            return p.status === 'DISPONIBLE' && parseFloat(p.precio) > 0;
        });

        // Store for quick lookup
        posProducts = {};
        productos.forEach(function(p) { posProducts[p.id] = p; });

        // Group by category (preserve order)
        var groups = {};
        var catOrder = [];
        productos.forEach(function(p) {
            var cat = p.categoria || 'Otros';
            if(!groups[cat]) { groups[cat] = []; catOrder.push(cat); }
            groups[cat].push(p);
        });

        // Pills
        var pills = '<button class="pos-cat-pill active" data-cat="TODOS">Todos</button>';
        catOrder.forEach(function(cat) {
            pills += '<button class="pos-cat-pill" data-cat="' + cat + '">' + (CAT_SHORT[cat] || cat) + '</button>';
        });
        catsContainer.innerHTML = pills;

        renderProductCards(productos);
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

    function agregarAlTicket(id) {
        var product = posProducts[id];
        if(!product) return;

        var existing = ticketActual.find(function(t) { return t.id === id; });
        if(existing) {
            existing.qty++;
        } else {
            ticketActual.push({
                id: id,
                nombre: product.nombre,
                precio: parseFloat(product.precio),
                qty: 1
            });
        }
        renderTicket();
    }

    function quitarDelTicket(id) {
        var item = ticketActual.find(function(t) { return t.id === id; });
        if(item) {
            item.qty--;
            if(item.qty <= 0) ticketActual = ticketActual.filter(function(t) { return t.id !== id; });
        }
        renderTicket();
    }

    function eliminarDelTicket(id) {
        ticketActual = ticketActual.filter(function(t) { return t.id !== id; });
        renderTicket();
    }

    function renderTicket() {
        var container = document.getElementById('ticket-items');
        if(!container) return;

        if(ticketActual.length === 0) {
            container.innerHTML = '<p class="ticket-empty"><i class="ri-shopping-bag-line" style="font-size:24px;display:block;margin-bottom:8px;"></i>Toca un producto para agregar</p>';
        } else {
            container.innerHTML = ticketActual.map(function(item) {
                return '<div class="ticket-item">' +
                    '<div class="ticket-item-info">' +
                        '<span class="ticket-item-name">' + item.nombre + '</span>' +
                        '<span class="ticket-item-price">$' + (item.precio * item.qty).toFixed(2) + '</span>' +
                    '</div>' +
                    '<div class="ticket-item-controls">' +
                        '<button class="qty-sm" data-action="sub" data-id="' + item.id + '">−</button>' +
                        '<span class="qty-num">' + item.qty + '</span>' +
                        '<button class="qty-sm" data-action="add" data-id="' + item.id + '">+</button>' +
                        '<button class="qty-sm del" data-action="del" data-id="' + item.id + '">×</button>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        // Calculate totals
        var subtotal = ticketActual.reduce(function(s, i) { return s + (i.precio * i.qty); }, 0);
        var descMonto = subtotal * (descuentoActual / 100);
        var total = subtotal - descMonto;

        setText('ticket-subtotal', '$' + subtotal.toFixed(2));
        setText('ticket-total', '$' + total.toFixed(2));
        setText('cobrar-total', total.toFixed(2));

        // Discount line
        var discLine = document.getElementById('discount-line');
        if(discLine) {
            if(descuentoActual > 0) {
                discLine.style.display = 'flex';
                setText('discount-pct', descuentoActual);
                setText('discount-amount', '-$' + descMonto.toFixed(2));
            } else {
                discLine.style.display = 'none';
            }
        }

        var btnCobrar = document.getElementById('btn-cobrar');
        if(btnCobrar) btnCobrar.disabled = ticketActual.length === 0;
    }

    window.setDescuento = function(pct, btn) {
        descuentoActual = pct;
        document.querySelectorAll('.disc-btn').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
        renderTicket();
    };

    window.setMetodoPago = function(metodo, btn) {
        metodoPagoActual = metodo;
        document.querySelectorAll('.pay-btn').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
    };

    window.limpiarTicket = function() {
        ticketActual = [];
        descuentoActual = 0;
        metodoPagoActual = 'EFECTIVO';
        document.querySelectorAll('.disc-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        document.querySelectorAll('.pay-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
        renderTicket();
    };

    window.cobrarTicket = async function() {
        if(ticketActual.length === 0) return;

        var subtotal = ticketActual.reduce(function(s, i) { return s + (i.precio * i.qty); }, 0);
        var descMonto = subtotal * (descuentoActual / 100);
        var total = subtotal - descMonto;

        var now = new Date();
        var fecha = now.getFullYear() + '-' +
            String(now.getMonth()+1).padStart(2,'0') + '-' +
            String(now.getDate()).padStart(2,'0');
        var hora = String(now.getHours()).padStart(2,'0') + ':' +
            String(now.getMinutes()).padStart(2,'0');

        var venta = {
            id: 'V' + Date.now(),
            fecha: fecha,
            hora: hora,
            items: JSON.stringify(ticketActual.map(function(i) { return {n:i.nombre, q:i.qty, p:i.precio}; })),
            subtotal: subtotal,
            descuento: descuentoActual,
            total: total,
            metodoPago: metodoPagoActual
        };

        // Success overlay
        var overlay = document.getElementById('cobrar-success');
        if(overlay) {
            setText('cobrar-success-amount', '$' + total.toFixed(2));
            overlay.classList.add('show');
            setTimeout(function() { overlay.classList.remove('show'); }, 1800);
        }

        // Save to Google Sheets
        try {
            await fetch(WEBAPP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'saveVenta', venta: venta })
            });
        } catch(e) { console.error('Error guardando venta:', e); }

        // Update local cache
        ventasCache.push(venta);

        // Clear ticket
        window.limpiarTicket();

        // Update dashboard
        renderDashboard();

        showToast('Venta registrada: $' + total.toFixed(2));
    };

    // ============================================================
    // TRAFFIC COUNTER
    // ============================================================

    window.incrementarTrafico = function() {
        traficoCount++;
        updateTraficoUI();
        saveTrafico();
    };

    window.decrementarTrafico = function() {
        if(traficoCount > 0) traficoCount--;
        updateTraficoUI();
        saveTrafico();
    };

    function updateTraficoUI() {
        var el = document.getElementById('traffic-number');
        if(el) {
            el.textContent = traficoCount;
            el.style.transform = 'scale(1.1)';
            setTimeout(function() { el.style.transform = 'scale(1)'; }, 200);
        }

        var dateEl = document.getElementById('traffic-date');
        if(dateEl) {
            var now = new Date();
            var dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            dateEl.textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()];
        }

        // Sync with dashboard KPI
        setText('kpi-personas', traficoCount);
    }

    async function saveTrafico() {
        try {
            await fetch(WEBAPP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateTrafico', personas: traficoCount })
            });
        } catch(e) { console.error('Error guardando tráfico:', e); }
    }

    // ============================================================
    // DASHBOARD
    // ============================================================

    function renderDashboard() {
        var totalVenta = ventasCache.reduce(function(s, v) { return s + (parseFloat(v.total) || 0); }, 0);
        var numTickets = ventasCache.length;
        var promedio = numTickets > 0 ? totalVenta / numTickets : 0;

        setText('kpi-venta-total', '$' + totalVenta.toFixed(2));
        setText('kpi-tickets', numTickets);
        setText('kpi-promedio', '$' + promedio.toFixed(2));
        setText('kpi-personas', traficoCount);

        renderMetodosPago();
        renderTopProductos();
    }

    function renderMetodosPago() {
        var el = document.getElementById('dash-metodos');
        if(!el) return;

        var metodos = {};
        ventasCache.forEach(function(v) {
            var m = v.metodoPago || 'EFECTIVO';
            if(!metodos[m]) metodos[m] = { count: 0, total: 0 };
            metodos[m].count++;
            metodos[m].total += parseFloat(v.total) || 0;
        });

        var keys = Object.keys(metodos);
        if(keys.length === 0) { el.innerHTML = '<p class="dash-empty">Sin ventas registradas</p>'; return; }

        var icons = { EFECTIVO:'ri-money-dollar-circle-line', TARJETA:'ri-bank-card-line', TRANSFERENCIA:'ri-smartphone-line' };
        el.innerHTML = keys.map(function(m) {
            return '<div class="metodo-row">' +
                '<span><i class="' + (icons[m]||'ri-money-dollar-circle-line') + '"></i> ' + m + '</span>' +
                '<span>' + metodos[m].count + ' tickets — <strong>$' + metodos[m].total.toFixed(2) + '</strong></span>' +
            '</div>';
        }).join('');
    }

    function renderTopProductos() {
        var el = document.getElementById('dash-top-productos');
        if(!el) return;

        var productos = {};
        ventasCache.forEach(function(v) {
            try {
                var items = JSON.parse(v.items);
                items.forEach(function(i) {
                    if(!productos[i.n]) productos[i.n] = { qty: 0, revenue: 0 };
                    productos[i.n].qty += i.q;
                    productos[i.n].revenue += i.q * i.p;
                });
            } catch(e) {}
        });

        var sorted = Object.entries(productos).sort(function(a,b) { return b[1].qty - a[1].qty; }).slice(0, 5);
        if(sorted.length === 0) { el.innerHTML = '<p class="dash-empty">Sin ventas registradas</p>'; return; }

        el.innerHTML = sorted.map(function(entry, i) {
            var name = entry[0], d = entry[1];
            return '<div class="top-product-row">' +
                '<span class="top-rank">#' + (i+1) + '</span>' +
                '<span class="top-name">' + name + '</span>' +
                '<span class="top-qty">' + d.qty + ' uds — $' + d.revenue.toFixed(2) + '</span>' +
            '</div>';
        }).join('');
    }

    window.filtrarDash = async function(periodo, btn) {
        document.querySelectorAll('.dash-filter').forEach(function(b) { b.classList.remove('active'); });
        if(btn) btn.classList.add('active');

        if(periodo === 'hoy') {
            ventasCache = window._ventasHoy || [];
            renderDashboard();
            return;
        }

        var now = new Date();
        var desde, hasta;
        if(periodo === 'ayer') {
            var ayer = new Date(now);
            ayer.setDate(ayer.getDate() - 1);
            desde = hasta = formatDate(ayer);
        } else if(periodo === 'semana') {
            var inicio = new Date(now);
            inicio.setDate(inicio.getDate() - 7);
            desde = formatDate(inicio);
            hasta = formatDate(now);
        }

        try {
            var res = await fetch(WEBAPP_URL + '?action=getVentasRango&desde=' + desde + '&hasta=' + hasta);
            var data = await res.json();
            ventasCache = data.ventas || [];
            renderDashboard();
        } catch(e) {
            console.error('Error cargando ventas:', e);
            showToast('Actualiza el Script de Google para usar filtros');
        }
    };

    // ---- Helpers ----
    function setText(id, val) {
        var el = document.getElementById(id);
        if(el) el.textContent = val;
    }

    function formatDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth()+1).padStart(2,'0') + '-' +
            String(d.getDate()).padStart(2,'0');
    }

})();
