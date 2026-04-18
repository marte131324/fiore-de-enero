// === TREZE LABS ANTI-CLONE & EASTER EGG ===
(function() {
    console.log("%c TREZE LABS - Command Center Protegido", "color: #38bdf8; font-weight: bold; font-size: 14px;");
    
    // Domain Lock (Anti-Clonación)
    var allowedDomains = ["fiore-de-enero.vercel.app", "localhost", "127.0.0.1"];
    var currentDomain = window.location.hostname;
    if (allowedDomains.indexOf(currentDomain) === -1 && currentDomain !== "") {
        document.addEventListener('DOMContentLoaded', function() {
            document.body.innerHTML = '<div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:monospace;text-align:center;padding:20px"><h1 style="color:#ef4444;font-size:3rem;margin-bottom:20px">ACCESO IP DENEGADO</h1><p style="font-size:1.2rem;max-width:600px;line-height:1.6;color:#94a3b8">Panel de Administración Bloqueado. Dominio no autorizado.</p><a href="https://wa.me/522214092478" style="margin-top:40px;padding:15px 30px;border:1px solid #38bdf8;color:#38bdf8;text-decoration:none;border-radius:8px">Contactar Treze Labs</a></div>';
        });
        throw new Error("Dominio no autorizado.");
    }
})();

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxSfezJEvwiAdwqsSqtUuCE3pctKRNg3zkeGoO-4iTZRjdMBlezOjlBBgrLbGqWMTsA/exec"; 

// Variables locales
let catalogoData = [];

// Cambiar vistas del panel
function switchView(viewId, el) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

// Simulador inicial (hasta conectar GAS)
document.addEventListener('DOMContentLoaded', () => {
    // Si la URL del WebApp no está configurada, usar datos locales de prueba
    if(WEBAPP_URL === "PEGAR_AQUI_LA_URL_DEL_SCRIPT") {
        document.getElementById('app-loader').style.display = 'none';
        catalogoData = [
            { id: '1', nombre: 'Ramo Esmeralda', precio: '850', status: 'DISPONIBLE', img: 'https://via.placeholder.com/150', desc: 'Ramo premium de temporada' }
        ];
        renderProductos();
    } else {
        fetchDatos();
    }
});

// Función para mostrar Toast
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = `<i class="ri-checkbox-circle-fill"></i> ${msg}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function showLoader() { document.getElementById('app-loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('app-loader').style.display = 'none'; }

// Fetch desde Google Sheets
async function fetchDatos() {
    try {
        const res = await fetch(WEBAPP_URL + "?action=get");
        const data = await res.json();
        
        // Cargar Config
        if(data.config) {
            document.getElementById('config-status').value = data.config.tiendaStatus || 'ABIERTO';
            document.getElementById('config-banner').value = data.config.banner || '';
            document.getElementById('promo-active').value = data.config.promoActive || 'NO';
            document.getElementById('promo-title').value = data.config.promoTitle || '';
            document.getElementById('promo-desc').value = data.config.promoDesc || '';
            // Eventos
            if(document.getElementById('evento-titulo')) {
                document.getElementById('evento-titulo').value = data.config.eventoTitulo || '';
                document.getElementById('evento-desc').value = data.config.eventoDesc || '';
                document.getElementById('evento-fecha').value = data.config.eventoFecha || '';
                document.getElementById('evento-hora').value = data.config.eventoHora || '';
            }
        }

        // Cargar Productos
        catalogoData = data.productos || [];
        renderProductos();
        hideLoader();
        // Expose data for POS module
        window._ventasHoy = data.ventasHoy || [];
        window._traficoHoy = data.traficoHoy || 0;
        if(typeof window.initCajaModule === 'function') window.initCajaModule();
    } catch(err) {
        console.error(err);
        hideLoader();
        alert("Error conectando con la Base de Datos. Revisa tu conexión.");
    }
}

// POST a Google Sheets
async function saveData(payload, successMsg) {
    if(WEBAPP_URL === "PEGAR_AQUI_LA_URL_DEL_SCRIPT") {
        showToast(successMsg + " (Simulado - Conectar GAS)");
        return;
    }
    showLoader();
    try {
        const res = await fetch(WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        hideLoader();
        showToast(successMsg);
    } catch(err) {
        hideLoader();
        alert("Error enviando datos.");
    }
}

function getFullConfig() {
    return {
        tiendaStatus: document.getElementById('config-status') ? document.getElementById('config-status').value : '',
        banner: document.getElementById('config-banner') ? document.getElementById('config-banner').value : '',
        promoActive: document.getElementById('promo-active') ? document.getElementById('promo-active').value : '',
        promoTitle: document.getElementById('promo-title') ? document.getElementById('promo-title').value : '',
        promoDesc: document.getElementById('promo-desc') ? document.getElementById('promo-desc').value : '',
        eventoTitulo: document.getElementById('evento-titulo') ? document.getElementById('evento-titulo').value : '',
        eventoDesc: document.getElementById('evento-desc') ? document.getElementById('evento-desc').value : '',
        eventoFecha: document.getElementById('evento-fecha') ? document.getElementById('evento-fecha').value : '',
        eventoHora: document.getElementById('evento-hora') ? document.getElementById('evento-hora').value : ''
    };
}

function salvarConfiguracion() {
    const payload = {
        action: 'saveConfig',
        data: getFullConfig()
    };
    saveData(payload, "Configuración del Servidor Guardada");
}

function salvarPromo() {
    const payload = {
        action: 'saveConfig',
        data: getFullConfig()
    };
    saveData(payload, "Promoción Actualizada");
}

// Render Products
function renderProductos() {
    const div = document.getElementById('dom-productos');
    div.innerHTML = '';
    
    catalogoData.forEach(p => {
        div.innerHTML += `
        <div class="product-item">
            <div class="product-info">
                <div>
                    <div class="product-title">${p.nombre}</div>
                    <div class="product-price" style="font-size: 10px; opacity:0.7; margin-top:2px;">${p.categoria || ''}</div>
                    <div class="product-price">$${p.precio} MXN</div>
                </div>
            </div>
            <div class="product-actions">
                <span class="status-badge ${p.status === 'DISPONIBLE' ? 'status-on' : 'status-off'}">
                    ${p.status === 'DISPONIBLE' ? '<i class="ri-checkbox-circle-fill"></i>' : '<i class="ri-close-circle-fill"></i>'} ${p.status}
                </span>
                <button class="btn btn-secondary" onclick="editProduct('${p.id}')"><i class="ri-pencil-line"></i> Editar</button>
            </div>
        </div>
        `;
    });
}

function openProductModal() {
    document.getElementById('p-id').value = '';
    document.getElementById('p-name').value = '';
    document.getElementById('p-category').value = '🍕 La Vera Pizza Napoletana';
    document.getElementById('p-price').value = '';
    document.getElementById('p-status').value = 'DISPONIBLE';
    document.getElementById('p-desc').value = '';
    document.getElementById('btn-delete').style.display = 'none';
    document.getElementById('modal-title').innerText = 'Nuevo Platillo';
    document.getElementById('modal-product').classList.add('show');
}

function editProduct(id) {
    const p = catalogoData.find(x => x.id === id);
    if(!p) return;
    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.nombre;
    if(p.categoria) document.getElementById('p-category').value = p.categoria;
    document.getElementById('p-price').value = p.precio;
    document.getElementById('p-status').value = p.status;
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('btn-delete').style.display = 'block';
    document.getElementById('modal-title').innerText = 'Editar Platillo';
    document.getElementById('modal-product').classList.add('show');
}

function guardarProducto() {
    const id = document.getElementById('p-id').value || 'p_' + Date.now();
    const data = {
        id: id,
        nombre: document.getElementById('p-name').value,
        categoria: document.getElementById('p-category').value,
        precio: document.getElementById('p-price').value,
        status: document.getElementById('p-status').value,
        img: "",
        desc: document.getElementById('p-desc').value
    };

    const isEdit = document.getElementById('p-id').value !== '';
    if(isEdit) {
        const idx = catalogoData.findIndex(x => x.id === id);
        catalogoData[idx] = data;
    } else {
        catalogoData.push(data);
    }
    
    renderProductos();
    document.getElementById('modal-product').classList.remove('show');

    saveData({
        action: 'saveProducts',
        productos: catalogoData
    }, "Catálogo Sincronizado");
}

function eliminarProducto() {
    if(!confirm("¿Segura que deseas eliminar este platillo?")) return;
    const id = document.getElementById('p-id').value;
    catalogoData = catalogoData.filter(x => x.id !== id);
    renderProductos();
    document.getElementById('modal-product').classList.remove('show');

    saveData({
        action: 'saveProducts',
        productos: catalogoData
    }, "Platillo Eliminado");
}

function salvarEvento() {
    const payload = {
        action: 'saveConfig',
        data: getFullConfig()
    };
    saveData(payload, "Cartelera de Eventos Actualizada");
}
