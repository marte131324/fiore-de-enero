const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyDWCCn2P3v4-Co3OtJWbXQSHR244n96x7x1vqe4mE_L3tMns_E5-aT4CcyyHAPc8L2/exec";

let actTickets = [];
let hisTickets = [];
let currentView = 'activos';
let lastCount = 0;

function updateClock() {
    const now = new Date();
    document.getElementById('kds-clock').textContent = now.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

function parseHora(raw) {
    if(!raw) return null;
    var s = String(raw).trim();
    // Handle "HH:mm" or "HH:mm:ss"
    var parts = s.split(':');
    if(parts.length >= 2) {
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if(!isNaN(h) && !isNaN(m)) return { h: h, m: m };
    }
    // Handle Date ISO string from JSON (e.g. "1899-12-30T19:23:00.000Z")
    if(s.indexOf('T') !== -1) {
        var d = new Date(s);
        if(!isNaN(d.getTime())) return { h: d.getHours(), m: d.getMinutes() };
    }
    return null;
}

function getMinutesDiff(timeStr) {
    var parsed = parseHora(timeStr);
    if(!parsed) return 0;
    var now = new Date();
    var then = new Date();
    then.setHours(parsed.h, parsed.m, 0, 0);
    var diff = (now - then) / 60000;
    if(diff < 0) diff += 24 * 60;
    return Math.floor(diff);
}

function formatHora(timeStr) {
    var parsed = parseHora(timeStr);
    if(!parsed) return timeStr || '--:--';
    var hh = String(parsed.h).padStart(2, '0');
    var mm = String(parsed.m).padStart(2, '0');
    return hh + ':' + mm;
}

function updateTimers() {
    if (currentView !== 'activos') return;
    document.querySelectorAll('.ticket').forEach(tBox => {
        const timeBox = tBox.querySelector('.ticket-timer span');
        if(!timeBox) return;
        const m = getMinutesDiff(tBox.dataset.time);
        timeBox.textContent = m + 'm';
        if(m >= 15) { tBox.classList.add('late'); }
    });
}
setInterval(updateTimers, 60000);

async function fetchTickets() {
    document.getElementById('loader').style.display = 'flex';
    try {
        const res = await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getCocina' })
        });
        const data = await res.json();
        
        if (data && data.tickets) {
            actTickets = data.tickets.filter(t => t.estado === 'PENDIENTE' || t.estado === 'EN PREPARACION');
            hisTickets = data.tickets.filter(t => t.estado === 'LISTO');
            
            hisTickets.sort((a, b) => {
                var ha = formatHora(a.terminadoHora);
                var hb = formatHora(b.terminadoHora);
                return hb.localeCompare(ha);
            });
            
            if (currentView === 'activos') {
                renderBoard();
            } else {
                renderHistorial();
            }
            
            const pendientesObj = actTickets.filter(t => t.estado === 'PENDIENTE');
            if(pendientesObj.length > lastCount) {
                const audio = document.getElementById('audio-ding');
                if(audio) audio.play().catch(e => console.log('Audio Autoplay Blocked:', e));
            }
            lastCount = pendientesObj.length;
        }
    } catch(e) {
        console.error("KDS Sync Error:", e);
    }
    document.getElementById('loader').style.display = 'none';
}

window.switchView = function(view) {
    currentView = view;
    document.getElementById('btn-activos').classList.remove('active');
    document.getElementById('btn-historial').classList.remove('active');
    document.getElementById('btn-' + view).classList.add('active');
    if(view === 'activos') renderBoard();
    else renderHistorial();
};

function renderBoard() {
    const board = document.getElementById('kds-board');
    if(actTickets.length === 0) {
        board.innerHTML = '<div style="margin:auto; color:var(--text-dim); text-align:center;"><i class="ri-check-double-line" style="font-size:48px; color:var(--success); margin-bottom:10px; display:block;"></i><h3>Todo Entregado</h3><p>Esperando nuevas comandas...</p></div>';
        return;
    }

    window.switchStation = function(station) {
        window._kdsStation = station;
        localStorage.setItem('kds_station', station);
        if(currentView === 'activos') renderKDS();
        else renderHistorial();
    };

    // Load initial station and checked items
    window._kdsStation = localStorage.getItem('kds_station') || 'todas';
    window._kdsChecks = JSON.parse(localStorage.getItem('kds_checks') || '{}');
    setTimeout(() => {
        const select = document.getElementById('kds-station');
        if(select) select.value = window._kdsStation;
    }, 500);

    window.toggleItemCheck = function(ticketId, idx) {
        const key = ticketId + '_' + idx;
        if(window._kdsChecks[key]) delete window._kdsChecks[key];
        else window._kdsChecks[key] = true;
        localStorage.setItem('kds_checks', JSON.stringify(window._kdsChecks));
        
        // Visual toggle immediately to avoid waiting for render
        const el = document.getElementById('item-' + key);
        if(el) el.classList.toggle('item-checked');

        // Evaluate if all items are checked to unlock the Entregado button
        window.evaluateTicket(ticketId);
    };

    window.evaluateTicket = function(ticketId) {
        const ticketEl = document.querySelector(`.ticket[data-id="${ticketId}"]`);
        if(!ticketEl) return;
        
        const items = ticketEl.querySelectorAll('.ticket-item');
        const checkedItems = ticketEl.querySelectorAll('.ticket-item.item-checked');
        const isAllChecked = items.length > 0 && items.length === checkedItems.length;
        
        const btnEntregado = ticketEl.querySelector('.btn-entregado');
        if(btnEntregado) {
            if(isAllChecked) {
                btnEntregado.disabled = false;
                btnEntregado.style.opacity = '1';
                btnEntregado.style.cursor = 'pointer';
                btnEntregado.innerHTML = '<i class="ri-check-double-line"></i> Entregar Orden';
            } else {
                btnEntregado.disabled = true;
                btnEntregado.style.opacity = '0.4';
                btnEntregado.style.cursor = 'not-allowed';
                btnEntregado.innerHTML = '<i class="ri-error-warning-line"></i> Faltan Ítems';
            }
        }
    };

    let html = '';
    actTickets.forEach(t => {
        let items = [];
        try { items = JSON.parse(t.items); } catch(e) {}
        
        // STATION TICKET FILTERING (Server-side split logic)
        const station = window._kdsStation;
        let filteredItems = items;
        
        if (t.estacion === 'barra' && station === 'cocina') return;
        if (t.estacion === 'cocina' && station === 'barra') return;
        
        // Fallback for old tickets (estacion: 'todas')
        if (t.estacion === 'todas' && station !== 'todas') {
            if(station === 'barra') {
                filteredItems = items.filter(i => {
                    const cat = (i.c || '').toLowerCase();
                    return cat.includes('bebida') || cat.includes('frappe') || cat.includes('café') || cat.includes('postre') || cat.includes('dolci') || cat.includes('coctelería') || cat.includes('cocteleria');
                });
            } else if(station === 'cocina') {
                filteredItems = items.filter(i => {
                    const cat = (i.c || '').toLowerCase();
                    return !(cat.includes('bebida') || cat.includes('frappe') || cat.includes('café') || cat.includes('postre') || cat.includes('dolci') || cat.includes('coctelería') || cat.includes('cocteleria'));
                });
            }
            if(filteredItems.length === 0) return;
        }

        const mins = getMinutesDiff(t.hora);
        const horaDisplay = formatHora(t.hora);
        const isLate = mins >= 15 ? 'late' : '';
        const isPrep = t.estado === 'EN PREPARACION';
        const prepClass = isPrep ? 'preparando' : '';
        const iconStation = t.estacion === 'barra' ? '🍹' : (t.estacion === 'cocina' ? '🍳' : '🎫');

        // Check if all filtered items are checked
        let allChecked = true;
        filteredItems.forEach((item, idx) => {
            if(!window._kdsChecks[t.id + '_' + idx]) allChecked = false;
        });
        if(filteredItems.length === 0) allChecked = false;

        html += `
        <div class="ticket ${isLate} ${prepClass}" data-id="${t.id}" data-time="${t.hora}">
            <div class="ticket-header">
                <div class="ticket-mesa">
                    <span>MESA</span>
                    ${t.mesaNum} <span style="font-size:16px; margin-left:4px;">${iconStation}</span>
                </div>
                <div class="ticket-meta" style="position:relative; padding-right: 30px;">
                    <div class="ticket-timer"><i class="ri-timer-line"></i> <span>${mins}m</span></div>
                    <div class="ticket-mesero"><i class="ri-user-smile-line"></i> ${t.mesero}</div>
                    <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">${horaDisplay}</div>
                    <button onclick="promptDeleteTicket('${t.id}')" style="position:absolute; right:-5px; top:0; background:transparent; border:none; color:var(--text-dim); font-size:20px; cursor:pointer; padding:5px;"><i class="ri-close-circle-fill" style="color:rgba(255,50,50,0.5);"></i></button>
                </div>
            </div>
            <div class="ticket-body">
                ${filteredItems.map((item, idx) => {
                    const key = t.id + '_' + idx;
                    const isChecked = window._kdsChecks[key] ? 'item-checked' : '';
                    return `
                    <div class="ticket-item ${isChecked}" id="item-${key}" onclick="toggleItemCheck('${t.id}', ${idx})" style="cursor:pointer; transition:0.2s;">
                        <div class="item-qty">${item.q}</div>
                        <div class="item-details">
                            <div class="item-name">${item.n}</div>
                            ${item.nota ? `<div class="item-nota">${item.nota}</div>` : ''}
                        </div>
                        <div class="item-check-icon"><i class="ri-check-line"></i></div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="ticket-footer">
                ${!isPrep ? `
                <button class="btn-listo btn-preparando" onclick="markPreparing('${t.id}')">
                    <i class="ri-fire-fill"></i> Preparar
                </button>
                ` : `
                <button class="btn-listo btn-entregado" onclick="markReady('${t.id}')" ${allChecked ? '' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>
                    ${allChecked ? '<i class="ri-check-double-line"></i> Entregar Orden' : '<i class="ri-error-warning-line"></i> Faltan Ítems'}
                </button>
                `}
            </div>
        </div>`;
    });

    if(html === '') {
        board.innerHTML = '<div style="margin:auto; color:var(--text-dim); text-align:center;"><i class="ri-check-double-line" style="font-size:48px; color:var(--success); margin-bottom:10px; display:block;"></i><h3>Todo Entregado</h3><p>No hay comandas para esta estación...</p></div>';
        return;
    }

    board.innerHTML = html;
}

function renderHistorial() {
    const board = document.getElementById('kds-board');
    if(hisTickets.length === 0) {
        board.innerHTML = '<div style="margin:auto; color:var(--text-dim); text-align:center;"><i class="ri-history-line" style="font-size:48px; color:var(--text-dim); margin-bottom:10px; display:block;"></i><h3>Sin Historial</h3><p>No hay comandas entregadas aún...</p></div>';
        return;
    }

    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const todayStrLocal = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const selectedDate = window._kdsHistorialDate || todayStrLocal;

    // Filter tickets by selected date
    const filteredHis = hisTickets.filter(t => {
        if(!t.fecha) return true;
        let dStr = t.fecha;
        // Safari safe parse if it's ISO or just extract yyyy-mm-dd
        if(dStr.includes('T')) dStr = dStr.split('T')[0];
        return dStr === selectedDate;
    });

    let html = `
    <div class="historial-container">
        <div class="historial-header" style="flex-wrap:wrap; gap:10px;">
            <h2><i class="ri-history-line"></i> Historial de Cocina</h2>
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="date" id="kds-date-picker" value="${selectedDate}" onchange="window._kdsHistorialDate=this.value; renderHistorial();" style="background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-pure); border-radius:6px; padding:6px 10px; font-family:var(--font-ui); outline:none;">
                <span class="historial-badge">${filteredHis.length} TICKETS</span>
            </div>
        </div>
        <div class="historial-scroll">
    `;

    if(filteredHis.length === 0) {
        html += '<div style="padding:40px; text-align:center; color:var(--text-dim);">No hay comandas entregadas en esta fecha.</div>';
    }

    filteredHis.forEach(t => {
        let items = [];
        try { items = JSON.parse(t.items); } catch(e) {}

        const station = window._kdsStation;
        let filteredItems = items;
        
        if (t.estacion === 'barra' && station === 'cocina') return;
        if (t.estacion === 'cocina' && station === 'barra') return;
        
        if (t.estacion === 'todas' && station !== 'todas') {
            if(station === 'barra') {
                filteredItems = items.filter(i => {
                    const cat = (i.c || '').toLowerCase();
                    return cat.includes('bebida') || cat.includes('frappe') || cat.includes('café') || cat.includes('postre') || cat.includes('dolci') || cat.includes('coctelería') || cat.includes('cocteleria');
                });
            } else if(station === 'cocina') {
                filteredItems = items.filter(i => {
                    const cat = (i.c || '').toLowerCase();
                    return !(cat.includes('bebida') || cat.includes('frappe') || cat.includes('café') || cat.includes('postre') || cat.includes('dolci') || cat.includes('coctelería') || cat.includes('cocteleria'));
                });
            }
            if(filteredItems.length === 0) return;
        }

        const iconStation = t.estacion === 'barra' ? '🍹' : (t.estacion === 'cocina' ? '🍳' : '🎫');

        const pedidoHora = formatHora(t.hora);
        const entregaHora = formatHora(t.terminadoHora);
        const tiempoPrep = (() => {
            var p1 = parseHora(t.hora);
            var p2 = parseHora(t.terminadoHora);
            if(!p1 || !p2) return '--';
            var diff = (p2.h * 60 + p2.m) - (p1.h * 60 + p1.m);
            if(diff < 0) diff += 24 * 60;
            return diff + ' min';
        })();

        html += `
            <div class="historial-card">
                <div class="historial-card-header">
                    <div class="historial-mesa">M-${t.mesaNum} <span style="font-size:16px;">${iconStation}</span></div>
                    <div class="historial-times">
                        <div class="historial-time-row">
                            <span class="time-label">Pedido:</span>
                            <span class="time-value">${pedidoHora}</span>
                        </div>
                        <div class="historial-time-row">
                            <span class="time-label">Entrega:</span>
                            <span class="time-value success">${entregaHora}</span>
                        </div>
                    </div>
                    <div class="historial-prep-time">
                        <span class="prep-icon">⏱</span>
                        <span>${tiempoPrep}</span>
                    </div>
                </div>
                <div class="historial-card-body">
                    <div class="historial-mesero"><i class="ri-user-smile-line"></i> ${t.mesero}</div>
                    <div class="historial-items">
                        ${filteredItems.map(item => `
                            <div class="historial-item-row">
                                <span class="historial-item-qty">${item.q}x</span>
                                <span class="historial-item-name">${item.n}</span>
                                ${item.nota ? `<span class="historial-item-nota">· ${item.nota}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    board.innerHTML = html;
}

window.markPreparing = async function(id) {
    const tEl = document.querySelector(`.ticket[data-id="${id}"]`);
    if(tEl) {
        tEl.classList.add('preparando');
        const btn = tEl.querySelector('.btn-preparando');
        if(btn) {
            btn.outerHTML = `<button class="btn-listo" onclick="markReady('${id}')"><i class="ri-check-double-line"></i> Entregado</button>`;
        }
    }
    try {
        await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'markCocinaPreparing', ticketID: id })
        });
        setTimeout(fetchTickets, 1000);
    } catch(e) {
        console.error(e);
        alert('Error conectando. Verifica conexión de red.');
    }
};

window.markReady = async function(id) {
    const tEl = document.querySelector(`.ticket[data-id="${id}"]`);
    if(tEl) {
        tEl.style.transform = 'scale(0.9)';
        tEl.style.opacity = '0';
        setTimeout(() => tEl.remove(), 300);
    }

    try {
        await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'markCocinaReady', ticketID: id })
        });
        setTimeout(fetchTickets, 1000);
    } catch(e) {
        console.error(e);
        alert('Error conectando. Verifica conexión de red.');
    }
};

setInterval(fetchTickets, 15000);
fetchTickets();

// --- DELETE TICKET LOGIC ---
let ticketToDelete = null;

window.promptDeleteTicket = function(id) {
    ticketToDelete = id;
    document.getElementById('delete-pin').value = '';
    var modal = document.getElementById('modal-delete');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('delete-pin').focus(), 100);
};

window.confirmarDeleteTicket = async function() {
    var pin = document.getElementById('delete-pin').value;
    if(pin !== '2026') {
        alert("PIN Incorrecto.");
        return;
    }
    
    document.getElementById('modal-delete').style.display = 'none';
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'inline-block';
    
    try {
        await fetch(WEBAPP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteCocinaTicket',
                ticketID: ticketToDelete
            })
        });
        
        // Remove locally immediately for snappy feel
        actTickets = actTickets.filter(t => t.id !== ticketToDelete);
        renderBoard();
        
    } catch(e) {
        console.error("Error al borrar ticket", e);
        alert("Error de conexión al borrar. Intenta de nuevo.");
    } finally {
        if(loader) loader.style.display = 'none';
        ticketToDelete = null;
    }
};
