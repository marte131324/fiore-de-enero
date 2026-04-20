const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzt__3DvYwwqoeaJEduyk-zBBmyx2ZwwXeD0FEJj567oH5LDcTB4Rlfry_6wt6CoeJk/exec";

let actTickets = [];
let hisTickets = [];
let currentView = 'activos'; // 'activos' or 'historial'
let lastCount = 0;

function updateClock() {
    const now = new Date();
    document.getElementById('kds-clock').textContent = now.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

function getMinutesDiff(timeStr) {
    if(!timeStr) return 0;
    const parts = timeStr.split(':');
    const now = new Date();
    const t = new Date();
    t.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    let diff = (now - t) / 60000;
    if(diff < 0) diff += 24 * 60; // Cross midnight
    return Math.floor(diff);
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
            
            // Sort history by terminadoHora descending (latest first)
            hisTickets.sort((a, b) => b.terminadoHora.localeCompare(a.terminadoHora));
            
            if (currentView === 'activos') {
                renderBoard();
            } else {
                renderHistorial();
            }
            
            // Notificar si hay nuevos PENDIENTES
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
        board.innerHTML = '<div style="margin:auto; color:var(--text-dim); text-align:center;"><i class="ri-check-all" style="font-size:48px; color:var(--success); margin-bottom:10px; display:block;"></i><h3>Todo Entregado</h3><p>Esperando nuevas comandas...</p></div>';
        return;
    }

    let html = '';
    actTickets.forEach(t => {
        let items = [];
        try { items = JSON.parse(t.items); } catch(e) {}
        
        const mins = getMinutesDiff(t.hora);
        const isLate = mins >= 15 ? 'late' : '';
        const isPrep = t.estado === 'EN PREPARACION';
        const prepClass = isPrep ? 'preparando' : '';

        html += `
        <div class="ticket ${isLate} ${prepClass}" data-id="${t.id}" data-time="${t.hora}">
            <div class="ticket-header">
                <div class="ticket-mesa">
                    <span>MESA</span>
                    ${t.mesaNum}
                </div>
                <div class="ticket-meta">
                    <div class="ticket-timer"><i class="ri-timer-line"></i> <span>${mins}m</span></div>
                    <div class="ticket-mesero"><i class="ri-user-smile-line"></i> ${t.mesero}</div>
                </div>
            </div>
            <div class="ticket-body">
                ${items.map(item => `
                    <div class="ticket-item">
                        <div class="item-qty">${item.q}</div>
                        <div class="item-details">
                            <div class="item-name">${item.n}</div>
                            ${item.nota ? `<div class="item-nota">${item.nota}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="ticket-footer">
                ${!isPrep ? `
                <button class="btn-listo btn-preparando" onclick="markPreparing('${t.id}')">
                    <i class="ri-fire-fill"></i> Preparar
                </button>
                ` : `
                <button class="btn-listo" onclick="markReady('${t.id}')">
                    <i class="ri-check-double-line"></i> Entregado
                </button>
                `}
            </div>
        </div>`;
    });

    board.innerHTML = html;
}

function renderHistorial() {
    const board = document.getElementById('kds-board');
    if(hisTickets.length === 0) {
        board.innerHTML = '<div style="margin:auto; color:var(--text-dim); text-align:center;"><i class="ri-history-line" style="font-size:48px; color:var(--text-dim); margin-bottom:10px; display:block;"></i><h3>Sin Historial</h3><p>No hay comandas entregadas aún...</p></div>';
        return;
    }

    let html = `
    <div style="width: 100%; max-width: 900px; margin: 0 auto; background: #18181b; border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; max-height: 100%;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size: 18px; font-weight: 600;"><i class="ri-history-line"></i> Historial de Hoy</h2>
            <span style="background: var(--success); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">${hisTickets.length} TICKETS</span>
        </div>
        <div style="overflow-y: auto; max-height: calc(100vh - 200px);">
            <table class="historial-table">
                <thead>
                    <tr>
                        <th>Hora Pedido</th>
                        <th>Hora Entrega</th>
                        <th>Mesa</th>
                        <th>Mesero</th>
                        <th>Resumen Ítems</th>
                    </tr>
                </thead>
                <tbody>
    `;

    hisTickets.forEach(t => {
        let items = [];
        try { items = JSON.parse(t.items); } catch(e) {}
        let itemNames = items.map(i => `${i.q}x ${i.n}`).join(', ');

        html += `
            <tr>
                <td>${t.hora}</td>
                <td style="color:var(--success); font-weight:600;">${t.terminadoHora}</td>
                <td style="font-family:var(--font-display); font-weight:700; font-size:16px;">M-${t.mesaNum}</td>
                <td>${t.mesero}</td>
                <td><span class="historial-items-list" title="${itemNames}">${itemNames}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
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
        fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'markCocinaPreparing', ticketID: id })
        }).then(setTimeout(fetchTickets, 1000));
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
        fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'markCocinaReady', ticketID: id })
        }).then(setTimeout(fetchTickets, 1000));
    } catch(e) {
        console.error(e);
        alert('Error conectando. Verifica conexión de red.');
    }
};

setInterval(fetchTickets, 15000);
fetchTickets();
