const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzt__3DvYwwqoeaJEduyk-zBBmyx2ZwwXeD0FEJj567oH5LDcTB4Rlfry_6wt6CoeJk/exec";

let actTickets = [];
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
    document.querySelectorAll('.ticket').forEach(tBox => {
        const timeBox = tBox.querySelector('.ticket-timer span');
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
            actTickets = data.tickets;
            renderBoard();
            
            // Notificar si hay nuevos
            if(data.tickets.length > lastCount) {
                const audio = document.getElementById('audio-ding');
                if(audio) audio.play().catch(e => console.log('Audio Autoplay Blocked:', e));
            }
            lastCount = data.tickets.length;
        }
    } catch(e) {
        console.error("KDS Sync Error:", e);
    }
    document.getElementById('loader').style.display = 'none';
}

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

        html += `
        <div class="ticket ${isLate}" data-id="${t.id}" data-time="${t.hora}">
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
                <button class="btn-listo" onclick="markReady('${t.id}')">
                    <i class="ri-check-double-line"></i> Entregado
                </button>
            </div>
        </div>`;
    });

    board.innerHTML = html;
}

window.markReady = async function(id) {
    if(!confirm('¿Marcar este ticket como Entregado?')) return;
    
    const tEl = document.querySelector(`.ticket[data-id="${id}"]`);
    if(tEl) {
        tEl.style.transform = 'scale(0.9)';
        tEl.style.opacity = '0';
        setTimeout(() => tEl.remove(), 300);
        lastCount--;
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
