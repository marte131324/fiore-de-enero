// Global States
// Audio removed per client request


// Consolidated Initialization logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Audio Reference Removed

    
    // 2. Initialize Menu
    if (typeof renderMenu === 'function') renderMenu();
    loadDynamicData(); // <-- Inyectar datos en tiempo real
    
    // 3. Initialize Review Carousel
    initReviewCarousel();
    
    // 4. Initialize Loyalty System
    initLoyaltySystem();
    
    // 5. Intro Splash Screen Logic
    const splash = document.getElementById('intro-splash');
    
    function dismissSplash() {
        if (splash) splash.classList.add('hide');
    }
    
    if (splash) {
        // Auto-dismiss after 2.5s
        const autoTimer = setTimeout(() => {
            dismissSplash();
        }, 2500);
        
        // Tap to dismiss immediately
        const splashDismissHandler = () => {
            clearTimeout(autoTimer);
            dismissSplash();
        };
        splash.addEventListener('click', splashDismissHandler);
        splash.addEventListener('touchstart', splashDismissHandler);
    }
});

// Tab Navigation Functionality
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show target section & activate correct tab
    document.getElementById(sectionId).classList.add('active');

    // Activate the clicked button
    const tabs = document.querySelectorAll('.tab-btn');
    const clickedTab = Array.from(tabs).find(tab => tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(sectionId));
    if (clickedTab) clickedTab.classList.add('active');
}

// Simple Review Carousel
function initReviewCarousel() {
    // Array of dummy reviews for the carousel
    const reviews = [
        {
            text: '"La pizza es idéntica a la italiana, el servicio excelente y muy rico el sazón."',
            author: '- Reseña de Google Maps',
            stars: 5
        },
        {
            text: '"Excelente lugar, excelente comida pero sobre todo excelente servicio!!"',
            author: '- Reseña de Google Maps',
            stars: 5
        },
        {
            text: '"Las pastas estan deliciosas y el ambiente es muy acogedor."',
            author: '- Reseña de Google Maps',
            stars: 5
        }
    ];

    const carouselContainer = document.querySelector('.reviews-carousel');
    if (!carouselContainer) return;

    let currentIndex = 0;
    
    function renderReview(index) {
        const review = reviews[index];
        let starsHtml = '';
        for(let i=0; i<review.stars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }

        const reviewHtml = `
            <div class="review-slide active">
                <div class="stars">
                    ${starsHtml}
                </div>
                <p class="review-text">${review.text}</p>
                <p class="review-author">${review.author}</p>
            </div>
            <div class="carousel-dots">
                ${reviews.map((_, i) => `<span class="dot ${i === index ? 'active' : ''}" onclick="window.goToReview(${i})"></span>`).join('')}
            </div>
        `;
        
        carouselContainer.innerHTML = reviewHtml;
    }

    // Auto-advance carousel
    let slideInterval = setInterval(nextReview, 5000);

    function nextReview() {
        currentIndex = (currentIndex + 1) % reviews.length;
        renderReview(currentIndex);
    }

    // Expose function to window for dot clicks
    window.goToReview = function(index) {
        currentIndex = index;
        renderReview(currentIndex);
        // Reset interval to prevent immediate change after manual click
        clearInterval(slideInterval);
        slideInterval = setInterval(nextReview, 5000);
    }

    // Initial render
    renderReview(0);
}

// Loyalty Card / Stamps System (LocalStorage)
function initLoyaltySystem() {
    // ADMIN PIN Setup (Secret for waitstaff to add stamps)
    const SECRET_PIN = "1313"; // <-- Change this if needed
    const MAX_STAMPS = 10;
    
    // Elements
    const stampsBoard = document.getElementById('stamps-board');
    if (!stampsBoard) return; // Exit if not on page

    const stampCountEl = document.getElementById('stamp-count');
    const adminPinInput = document.getElementById('admin-pin');
    const addStampBtn = document.getElementById('add-stamp-btn');
    const resetStampsBtn = document.getElementById('reset-stamps-btn');
    const pinErrorEl = document.getElementById('pin-error');
    const rewardFoundEl = document.getElementById('reward-success');
    const inputGroup = document.querySelector('.pin-input-group');

    // Storage Key
    const STORAGE_KEY = 'fiore_rewards_stamps';

    // Get current stamps from browser memory
    let currentStamps = parseInt(localStorage.getItem(STORAGE_KEY)) || 0;

    // Render UI initially
    updateStampsUI(false);

    // Event Listener: Add Stamp Button
    addStampBtn.addEventListener('click', () => {
        const pin = adminPinInput.value;
        
        if (pin === SECRET_PIN) {
            pinErrorEl.style.display = 'none';
            adminPinInput.value = ''; // clear
            
            if (currentStamps < MAX_STAMPS) {
                currentStamps++;
                localStorage.setItem(STORAGE_KEY, currentStamps);
                updateStampsUI(true);
            }
        } else {
            pinErrorEl.textContent = "PIN incorrecto";
            pinErrorEl.style.display = 'block';
            adminPinInput.classList.add('pulse-animation');
            setTimeout(() => {
                adminPinInput.classList.remove('pulse-animation');
            }, 500);
        }
    });

    // Event Listener: Reset Rewards (Admin only)
    resetStampsBtn.addEventListener('click', () => {
        const pin = adminPinInput.value;
        if (pin === SECRET_PIN) {
            pinErrorEl.style.display = 'none';
            adminPinInput.value = '';
            
            // Confirm reset
            if (confirm("¿Estás seguro que quieres reiniciar la tarjeta de este cliente tras darle el premio?")) {
                currentStamps = 0;
                localStorage.setItem(STORAGE_KEY, 0);
                updateStampsUI(false);
            }
        } else {
            pinErrorEl.textContent = "Introduce el PIN para reiniciar";
            pinErrorEl.style.display = 'block';
        }
    });

    // Main UI Updater
    function updateStampsUI(isAnimateNew) {
        // ... (resto del código actualizado abajo)
        stampCountEl.textContent = currentStamps;
        
        // Loop through slots
        const slots = document.querySelectorAll('.stamp-slot');
        slots.forEach(slot => {
            const index = parseInt(slot.getAttribute('data-index'));
            const icon = slot.querySelector('i');
            
            // Clean previous classes
            slot.classList.remove('stamped');
            icon.classList.remove('stamp-animation');
            
            // Change Icon to active Check/Star
            if (index <= currentStamps) {
                slot.classList.add('stamped');
                // Replace icon classes safely while preserving the placeholder class
                if (index === MAX_STAMPS) {
                    icon.className = 'fas fa-gift placeholder-star';
                } else if (index === 7) {
                    icon.className = 'fas fa-coffee placeholder-star';
                } else {
                    icon.className = 'fas fa-check-circle placeholder-star';
                }
                
                // Animate ONLY the newly added one
                if (isAnimateNew && index === currentStamps) {
                    icon.classList.add('stamp-animation');
                    
                    // Trigger visual celebration for the last one
                    if (currentStamps === MAX_STAMPS) {
                        triggerConfettiEffect();
                    }
                }
            } else {
                // Return to empty state
                if (index === MAX_STAMPS) {
                    icon.className = 'fas fa-gift placeholder-star';
                } else if (index === 7) {
                    icon.className = 'fas fa-coffee placeholder-star';
                } else {
                    icon.className = 'fas fa-star placeholder-star';
                }
            }
        });

        // Toggle Admin UI depending on completion
        if (currentStamps >= MAX_STAMPS) {
            addStampBtn.style.display = 'none';
            rewardFoundEl.style.display = 'block';
            inputGroup.style.marginTop = "1rem";
        } else {
            addStampBtn.style.display = 'block';
            rewardFoundEl.style.display = 'none';
            inputGroup.style.marginTop = "0";
        }
    }

    // Custom Toast Notification Function for instant feedback
    function showToast(message, iconClass = "fas fa-check-circle") {
        const toastEl = document.getElementById('toast-container');
        const iconEl = document.getElementById('toast-icon');
        const msgEl = document.getElementById('toast-message');
        
        if(toastEl && iconEl && msgEl) {
            iconEl.className = iconClass;
            msgEl.textContent = message;
            toastEl.classList.remove('toast-hidden');
            toastEl.classList.add('toast-visible');
            
            setTimeout(() => {
                toastEl.classList.remove('toast-visible');
                toastEl.classList.add('toast-hidden');
            }, 3500);
        }
    }

    // --- NEW: URL Parameter Scanner for QR Codes ---
    function checkUrlForStamp() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPin = urlParams.get('sello');
        
        // If the URL has ?sello=1313
        if (urlPin) {
            // Remove the parameter from URL immediately so refreshing doesn't add another stamp
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: newUrl}, '', newUrl);

            // Navigate to rewards section instantly
            showSection('recompensas');

            // Validate the PIN
            if (urlPin === SECRET_PIN) {
                if (currentStamps < MAX_STAMPS) {
                    // Check logic to avoid multi-scans in short time (Anti-Cheat 12 hours)
                    const lastScanTime = localStorage.getItem('fiore_last_scan_time');
                    const now = new Date().getTime();
                    
                    // 12 hours in milliseconds = 12 * 60 * 60 * 1000 = 43200000
                    const cooldown = 43200000; 
                    
                    if (!lastScanTime || (now - parseInt(lastScanTime)) > cooldown) {
                        currentStamps++;
                        localStorage.setItem(STORAGE_KEY, currentStamps);
                        localStorage.setItem('fiore_last_scan_time', now.toString());
                        updateStampsUI(true);
                        
                        showToast("¡Sello validado con éxito! 🌟", "fas fa-star");
                    } else {
                        // User tried to scan too soon
                        showToast("Ya recibiste un sello hoy. Intenta mañana.", "fas fa-clock");
                    }
                } else {
                    showToast("¡Ya tienes la tarjeta llena!", "fas fa-gift");
                }
            } else {
                showToast("El QR escaneado es inválido.", "fas fa-times-circle");
            }
        }
    }

    // Run the check on load
    checkUrlForStamp();

    // Small celebratory JS effect
    function triggerConfettiEffect() {
        const board = document.getElementById('stamps-board');
        board.style.transform = "scale(1.05)";
        board.style.transition = "transform 0.3s";
        setTimeout(() => {
            board.style.transform = "scale(1)";
        }, 300);
    }
}

/* ========================
   MENU DIGITAL INTERACTIVO (CARRITO)
   ======================== */
let menuData = {
    comida: [
        {
            category: "🥗 Antipasti",
            items: [
                { id: "a1", name: "Insalata Caprese al Pesto", price: 160, desc: "" },
                { id: "a2", name: "Insalata de frutos rojos", price: 180, desc: "Mezcla de lechugas, arándanos, zarzamora, higos, ate y queso de cabra con vinagreta de fresa." },
                { id: "a3", name: "Tabla de quesos", price: 299, desc: "Chorizo español, salami, jamón serrano, manchego semi curado, queso de cabra, frutas de temporada, aceitunas con anchoas, miel y pan bomba." }
            ]
        },
        {
            category: "🍕 La Vera Pizza Napoletana",
            items: [
                { id: "pn1", name: "Margherita", price: 160, desc: "Tomate san Marzano, mozzarella fresca, albahaca y aceite de oliva virgen." },
                { id: "pn2", name: "Diavolo", price: 195, desc: "Tomate San Marzano, mozzarella fresco, salami picante, albahaca y aceite de oliva virgen." },
                { id: "pn3", name: "Pesto Caprese", price: 215, desc: "Salsa italiana de albahaca con piñones, mozzarella fresco y tomates Cherry." },
                { id: "pn4", name: "Quattro Formaggi (Bianca)", price: 228, desc: "Ricotta suave, mozzarella fresca y parmesano con salsa de piñones y albahaca verde." },
                { id: "pn5", name: "Higos con prosciutto y miel (Bianca)", price: 220, desc: "Higos frescos caramelizados en horno, prosciutto y miel de abeja." },
                { id: "pn6", name: "Del mio Nonno Beto", price: 228, desc: "Triple pomodoro: San Marzano, tomate secchi, tomate deshidratado, mozzarella fresca, jamón serrano y peperoncino." },
                { id: "pn7", name: "Diavolo e Gamberi", price: 230, desc: "Inferno d'Amore. Salsa de tomate, salami picante, camarones con ajo, mozzarella fresca y albahaca." },
                { id: "pn8", name: "La Bella Vodka", price: 225, desc: "Salsa cremosa de vodka, tomate San Marzano, mozzarella fresco y tocino. Con arúgula y parmesano." },
                { id: "pn9", name: "Peperoni", price: 180, desc: "" },
                { id: "pn10", name: "Hawaiana", price: 185, desc: "" }
            ]
        },
        {
            category: "🍝 Pasta Fatta In Casa",
            items: [
                { id: "pa1", name: "Tagliatelle al Ragü Bolognese", price: 180, desc: "Pasta fresca con ragú de carne cocinada lentamente con tomate y queso parmesano." },
                { id: "pa2", name: "Lasagna della Nonna", price: 210, desc: "La Ricetta di la nonna mayita, con mozzarella, salsa de tomate san Marzano y parmesano." },
                { id: "pa3", name: "Rigatoni alla Vodka", price: 217, desc: "Salsa cremosa de tomate italiano con vodka, mantequilla, parmesano y albahaca fresca." },
                { id: "pa4", name: "Tagliatelle al diavolo e gamberi", price: 205, desc: "Salsa de tomate picante con jugosos camarones en aceite de oliva y parmesano." },
                { id: "pa5", name: "Spaghetti al pesto", price: 190, desc: "Pasta larga a base de salsa de albahaca con piñones, tomate Cherry y parmesano." },
                { id: "pa6", name: "Rigatoni al Ragù di Funghi", price: 217, desc: "Hongos salteados con tomate, vino tinto, albahaca, tomillo, mantequilla y parmesano." },
                { id: "pa7", name: "Fettuccine Alfredo", price: 215, desc: "La ricetta classica di Roma. Salsa blanca cremosa de mantequilla con Parmigiano Reggiano." }
            ]
        }
    ],
    bebidas: [
        {
            category: "☕ Bebidas Calientes",
            items: [
                { id: "c1", name: "Espresso", price: 38, desc: "" },
                { id: "c2", name: "Americano", price: 35, desc: "" },
                { id: "c3", name: "Long black", price: 35, desc: "" },
                { id: "c4", name: "Latte", price: 50, desc: "" },
                { id: "c5", name: "Taro", price: 95, desc: "" },
                { id: "c6", name: "Capuccino", price: 55, desc: "" },
                { id: "c7", name: "Flat white", price: 68, desc: "Doble shot de espresso y leche texturizada." },
                { id: "c8", name: "Matcha", price: 85, desc: "" },
                { id: "c9", name: "Capuccino de Sabor", price: 70, desc: "Moka, Caramelo, Irlandés y Mazapán." },
                { id: "c10", name: "Chocolate caliente", price: 68, desc: "" }
            ]
        },
        {
            category: "❄️ Frappes",
            items: [
                { id: "f1", name: "Taro", price: 85, desc: "" },
                { id: "f2", name: "Ferrero", price: 95, desc: "" },
                { id: "f3", name: "Caramelo", price: 85, desc: "" },
                { id: "f4", name: "Moka", price: 60, desc: "" },
                { id: "f5", name: "Chocoreta", price: 80, desc: "" },
                { id: "f6", name: "Mazapan", price: 80, desc: "" },
                { id: "f7", name: "Oreo", price: 80, desc: "" },
                { id: "f8", name: "Matcha", price: 105, desc: "" },
                { id: "f9", name: "Pastel Hersheys", price: 90, desc: "" }
            ]
        },
        {
            category: "🧊 Bebidas Frías",
            items: [
                { id: "bf1", name: "Copa de vino de verano", price: 98, desc: "Cléricot refrescante y ligero, acidez del vino con dulzor de frutos frescos." },
                { id: "bf2", name: "Copa de vino Tinto", price: 105, desc: "Pregunta por la selección de la casa." },
                { id: "bf3", name: "Sodas italianas", price: 75, desc: "Sabores de temporada con perlas explosivas." },
                { id: "bf4", name: "Ice Caramelo", price: 75, desc: "" },
                { id: "bf5", name: "Ice Latte", price: 68, desc: "" },
                { id: "bf6", name: "Ice Taro", price: 80, desc: "" },
                { id: "bf7", name: "Ice Taro coffee", price: 95, desc: "" },
                { id: "bf8", name: "Sakura", price: 95, desc: "Sutil sabor del Taro combinado con cold foam de fresa." },
                { id: "bf9", name: "Ice Tiramisu", price: 105, desc: "" },
                { id: "bf10", name: "Matcha fría", price: 105, desc: "" },
                { id: "bf11", name: "Strawberry Matcha", price: 105, desc: "" },
                { id: "bf12", name: "Mango Matcha", price: 95, desc: "" },
                { id: "bf13", name: "Ice Coco Matcha", price: 90, desc: "" },
                { id: "bf14", name: "Coffee coco Matcha", price: 110, desc: "" },
                { id: "bf15", name: "Ice latte Matcha Einspanner", price: 105, desc: "" },
                { id: "bf16", name: "Ice latte cold foam", price: 89, desc: "" },
                { id: "bf17", name: "Coca-Cola", price: 40, desc: "" },
                { id: "bf18", name: "Refresco de sabor", price: 38, desc: "" },
                { id: "bf19", name: "Carajillo", price: 140, desc: "" },
                { id: "bf20", name: "Cerveza", price: 50, desc: "" }
            ]
        },
        {
            category: "🍨 Dolci de Véneto",
            items: [
                { id: "d1", name: "Affogato (Ahogado)", price: 75, desc: "Robusto espresso y cremoso helado de vainilla." },
                { id: "d2", name: "Affogato Matcha Nostra Ricetta", price: 90, desc: "" },
                { id: "d3", name: "Gelato di vainilla", price: 55, desc: "Con frutos rojos y crema batida." },
                { id: "d4", name: "Postre de temporada", price: 0, desc: "Pregunta por nuestro postre semanal." }
            ]
        }
    ]
};

async function loadDynamicData() {
    try {
        const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxSfezJEvwiAdwqsSqtUuCE3pctKRNg3zkeGoO-4iTZRjdMBlezOjlBBgrLbGqWMTsA/exec";
        const res = await fetch(WEBAPP_URL + "?action=get");
        const data = await res.json();
        
        // Render Eventos dinámicos
        if(data && data.config && data.config.eventoTitulo) {
            const evCard = document.querySelector('#eventos .event-card');
            if(evCard) {
                evCard.innerHTML = `
                    <div class="event-date">
                        <span class="day"><i class="far fa-calendar-alt"></i> PRÓXIMO EVENTO</span>
                    </div>
                    <div class="event-details" style="text-align: left; margin-top: 1rem;">
                        <h3 style="color: var(--secondary-color); font-size: 1.4rem; font-family: var(--font-heading); margin-bottom: 0.3rem;">${data.config.eventoTitulo}</h3>
                        <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 1.2rem; line-height: 1.4;">${data.config.eventoDesc || ''}</p>
                        <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--accent-color);">
                            <span><i class="far fa-calendar" style="margin-right: 4px;"></i> ${data.config.eventoFecha || 'Próximamente'}</span>
                            <span><i class="far fa-clock" style="margin-right: 4px;"></i> ${data.config.eventoHora || ''}</span>
                        </div>
                    </div>
                `;
            }
        }

        if(data && data.productos && data.productos.length > 0) {
            let newMenu = { comida: [], bebidas: [] };
            let cats = {};
            
            data.productos.forEach(p => {
                if(p.status !== 'DISPONIBLE') return;
                
                let group = p.categoria;
                let tab = 'comida';
                if(!group) group = "Otros";
                if(group.includes('Bebida') || group.includes('Frappe') || group.includes('Dolci')) {
                    tab = 'bebidas';
                }
                
                if(!cats[group]) cats[group] = { category: group, items: [], tab: tab };
                
                cats[group].items.push({
                    id: p.id,
                    name: p.nombre,
                    price: parseFloat(p.precio) || 0,
                    desc: p.desc || ""
                });
            });
            
            for(let k in cats) newMenu[cats[k].tab].push(cats[k]);
            menuData = newMenu;
            
            let comidaHtml = '<div class="cenit-profile glass-effect"><h4>🍕 La Vera Pizza Napoletana</h4><p><em>Tradición napolitana auténtica. Harina italiana de alta calidad, maduración lenta de 48 horas. Cocción a 450° por 90 segundos para un sabor único.</em></p></div>';
            let bebidaHtml = '<div class="cenit-profile glass-effect"><h4>☕ Perfil: NEGRO Cenit</h4><p><strong>Origen:</strong> Tlaltetela Veracruz | <strong>Altura:</strong> 1500 msnm</p><p><strong>Proceso:</strong> Honey | <strong>Variedad:</strong> Bourbon</p><p style="margin-top: 0.5rem;"><em>Dulzor alto, acidez brillante y balanceada. Cuerpo cremoso con notas afrutadas (cereza, ciruela), achocolatadas y a caramelo.</em></p></div>';
            
            document.getElementById('tab-comida').innerHTML = comidaHtml;
            document.getElementById('tab-bebidas').innerHTML = bebidaHtml;
            renderMenu();
        }
    } catch(e) {
        console.error("VCard: Using offline menu data.");
    }
}

let cart = {};

window.switchMenuTab = function(tabName, btnRef) {
    document.getElementById('tab-comida').style.display = 'none';
    document.getElementById('tab-bebidas').style.display = 'none';
    document.getElementById('tab-' + tabName).style.display = 'block';
    
    document.querySelectorAll('.menu-subtab').forEach(btn => btn.classList.remove('active'));
    btnRef.classList.add('active');
}

function renderMenu() {
    ['comida', 'bebidas'].forEach(tab => {
        let container = document.getElementById('tab-' + tab);
        if(!container) return;
        
        let html = '';
        menuData[tab].forEach((section, index) => {
            html += `
            <div class="accordion-item">
                <button class="accordion-header ${index===0?'active':''}" onclick="toggleAccordion(this)">
                    <span>${section.category}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="accordion-content" style="max-height: ${index===0?'1500px':'0'};">
                    <div class="accordion-inner">
                        ${section.items.map(item => `
                        <div class="menu-product">
                            <div class="product-info">
                                <h4 class="product-name">${item.name}</h4>
                                ${item.desc ? `<p class="product-desc">${item.desc}</p>` : ''}
                                <span class="product-price">${item.price > 0 ? '$' + item.price.toFixed(2) : 'Consultar'}</span>
                            </div>
                            ${item.price > 0 ? `
                            <div class="qty-controls">
                                <button class="qty-btn" onclick="updateCart('${item.id}', '${item.name}', ${item.price}, -1)">-</button>
                                <span class="qty-display" id="qty-${item.id}">0</span>
                                <button class="qty-btn" onclick="updateCart('${item.id}', '${item.name}', ${item.price}, 1)">+</button>
                            </div>` : ''}
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        });
        
        container.innerHTML += html;
    });
}

window.toggleAccordion = function(btn) {
    btn.classList.toggle('active');
    let content = btn.nextElementSibling;
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

window.updateCart = function(id, name, price, change) {
    if (!cart[id]) {
        cart[id] = { name, price, qty: 0 };
    }
    
    cart[id].qty += change;
    
    if (cart[id].qty <= 0) {
        delete cart[id];
        document.getElementById('qty-' + id).textContent = "0";
    } else {
        document.getElementById('qty-' + id).textContent = cart[id].qty;
    }
    
    updateCartUI();
}

function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;
    
    for (let id in cart) {
        totalItems += cart[id].qty;
        totalPrice += cart[id].qty * cart[id].price;
    }
    
    const floatCart = document.getElementById('floating-cart');
    if (totalItems > 0) {
        floatCart.classList.add('visible');
        document.getElementById('cart-count').textContent = totalItems;
        document.getElementById('cart-total-float').textContent = totalPrice.toFixed(2);
    } else {
        floatCart.classList.remove('visible');
    }
}

window.openCartModal = function() {
    const modal = document.getElementById('cart-modal');
    const container = document.getElementById('modal-items-container');
    let total = 0;
    
    container.innerHTML = '';
    
    for (let id in cart) {
        let item = cart[id];
        let itemTotal = item.qty * item.price;
        total += itemTotal;
        
        container.innerHTML += `
            <div class="cart-item-preview">
                <span>${item.qty}x ${item.name}</span>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }
    
    document.getElementById('modal-total').textContent = total.toFixed(2);
    modal.classList.add('show');
}

window.closeCartModal = function() {
    document.getElementById('cart-modal').classList.remove('show');
}

window.sendOrderToWhatsApp = function() {
    let total = 0;
    let lines = [];
    lines.push("*NUEVA COMANDA - Fiore de Enero*");
    lines.push("");
    
    for (let id in cart) {
        let item = cart[id];
        let itemTotal = item.qty * item.price;
        total += itemTotal;
        lines.push(item.qty + "x *" + item.name + "* ($" + itemTotal.toFixed(2) + ")");
    }
    
    lines.push("");
    lines.push("*TOTAL ESTIMADO:* $" + total.toFixed(2));
    lines.push("");
    lines.push("_Por favor, confirmen mi orden a mi llegada._");
    
    const message = lines.join("\n");
    const whatsappPhone = "522293706307";
    const url = "https://wa.me/" + whatsappPhone + "?text=" + encodeURIComponent(message);
    window.open(url, '_blank');
}





/* ========================
   TOUR PARA LA DUEÑA (Intro.js)
   ======================== */
const tourBtn = document.getElementById('start-tour');
if (tourBtn) {
    tourBtn.addEventListener('click', () => {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            const tour = introJs();
            tour.setOptions({
                nextLabel: 'Siguiente →',
                prevLabel: '← Anterior',
                doneLabel: '¡Entendido!',
                skipLabel: 'Saltar',
                hidePrev: true,
                showStepNumbers: false,
                showBullets: true,
                scrollToElement: false, // MANDATORY: Stop Intro.js from scrolling to the element
                disableInteraction: false,
                exitOnOverlayClick: false,
                tooltipClass: 'custom-tour-tooltip',
                highlightClass: 'custom-tour-highlight',
                steps: [
                    {
                        intro: "<b>¡Bienvenida! 👋</b><br>Este tour te mostrará cómo funciona tu VCard digital de <b>Fiore de Enero</b>.<br><br>Cada sección tiene un propósito específico para atraer y retener clientes."
                    },
                    {
                        element: document.querySelector('.header-section'),
                        intro: "<b>🏠 Tu Identidad</b><br>Aquí aparece tu logo, nombre y eslogan. Es lo primero que ven tus clientes — genera confianza y marca premium al instante.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.social-links'),
                        intro: "<b>📲 Redes Sociales</b><br>Tus clientes pueden seguirte en Instagram y TikTok con un toque. Esto aumenta tu comunidad orgánicamente.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.nav-tabs'),
                        intro: "<b>🧭 Navegación</b><br>Estas pestañas organizan tu contenido: <b>Menú, Eventos, Talleres y Club Fiore</b>. El cliente navega como en una app real.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#menu'),
                        intro: "<b>🍕 Menú Digital Interactivo</b><br>¡Tu menú completo con los 63 productos! Los clientes pueden explorar por categoría con los acordeones y agregar productos al carrito para hacer su pedido directo a tu WhatsApp.<br><br><em>Tú puedes editar precios fácilmente en el código.</em>",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.menu-tabs-container'),
                        intro: "<b>📋 Pestañas del Menú</b><br>Dividimos la carta en <b>Pizzas & Pastas</b> y <b>Bebidas & Postres</b> para que el cliente encuentre lo que busca rápidamente.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.floating-cart'),
                        intro: "<b>🛒 Carrito Flotante</b><br>Cuando el cliente agrega productos, aparece esta barra con el total. Al tocarla se abre un resumen de la comanda con botón para enviarla por WhatsApp.",
                        position: 'top'
                    },
                    {
                        element: document.querySelector('#eventos'),
                        intro: "<b>🎶 Cartelera de Eventos</b><br>Aquí publicas tus noches de jazz, música en vivo o eventos especiales. Mantén esto actualizado para enganchar a tus clientes recurrentes.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#talleres'),
                        intro: "<b>🎨 Talleres del Mes</b><br>Este diseño se actualiza desde <b>Canva</b>. Solo editas tu diseño en Canva y se refleja aquí automáticamente — sin tocar código.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#recompensas'),
                        intro: "<b>⭐ Club Fiore (Fidelidad)</b><br>Tu tarjeta digital de sellos. Funcionamiento:<br>• <b>7 sellos</b> = Una bebida gratis<br>• <b>10 sellos</b> = Descuento en compra<br><br>Los sellos se guardan en el dispositivo del cliente.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.reviews-section'),
                        intro: "<b>💬 Reseñas</b><br>Muestras las opiniones de tus comensales como prueba social. Refuerza la confianza de nuevos clientes.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.location-section'),
                        intro: "<b>📍 Ubicación</b><br>Enlace directo a Google Maps para que te encuentren fácilmente. Los clientes tocan y navegan hacia tu local.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.fab-whatsapp'),
                        intro: "<b>💬 Botón WhatsApp</b><br>Siempre visible, permite reservar o contactarte instantáneamente. ¡Es tu principal herramienta de conversión!",
                        position: 'top'
                    },

                    {
                        intro: "<b>🎉 ¡Listo!</b><br>Ya conoces todas las funciones de tu VCard.<br><br>Recuerda que puedes:<br>• Actualizar talleres en Canva<br>• Cambiar precios del menú<br>• Compartir el link con tus clientes<br><br><em>Este botón de ayuda (?) se puede ocultar cuando estés lista para lanzar con tus clientes.</em>"
                    }
                ]
            });

            tour.onbeforechange(function(targetEl) {
                tourBtn.style.opacity = '0';
                tourBtn.style.pointerEvents = 'none';
                
                // Ensure floating cart is visible ONLY for its step during tour
                const cartEl = document.querySelector('.floating-cart');
                if (targetEl && targetEl.classList.contains('floating-cart')) {
                    if (cartEl) cartEl.classList.add('visible');
                } else {
                    if (cartEl && Object.keys(cart).length === 0) cartEl.classList.remove('visible');
                }

                if (targetEl) {
                    const sectionId = targetEl.id || '';
                    if (sectionId === 'eventos') showSection('eventos');
                    else if (sectionId === 'talleres') showSection('talleres');
                    else if (sectionId === 'recompensas') showSection('recompensas');
                    else if (sectionId === 'menu' || (targetEl.classList && targetEl.classList.contains('menu-tabs-container'))) { 
                        showSection('menu'); 
                    }
                    // Immediate refresh to catch the section change
                    tour.refresh();
                }
            });

            tour.onafterchange(function() {
                // Ensure everything has moved before we calculate
                setTimeout(() => {
                    const tooltip = document.querySelector('.introjs-tooltip');
                    if (tooltip) {
                        const rect = tooltip.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const absoluteTop = rect.top + scrollTop;
                        
                        // Center tooltip in view
                        const scrollPos = absoluteTop - (window.innerHeight / 2) + (rect.height / 2);
                        window.scrollTo({
                            top: scrollPos,
                            behavior: 'smooth'
                        });
                        
                        // Extra insurance refresh
                        setTimeout(() => { tour.refresh(); }, 150);
                    }
                }, 250);
            });

            tour.oncomplete(function() {
                tourBtn.style.opacity = '0.6';
                tourBtn.style.pointerEvents = 'auto';
                showSection('menu'); // Reset to menu
            });

            tour.onexit(function() {
                tourBtn.style.opacity = '0.6';
                tourBtn.style.pointerEvents = 'auto';
            });

            tour.start();
        }, 600);
    });
}
