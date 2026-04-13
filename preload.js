const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxSfezJEvwiAdwqsSqtUuCE3pctKRNg3zkeGoO-4iTZRjdMBlezOjlBBgrLbGqWMTsA/exec";

const menuData = [
    { category: "🥗 Antipasti", items: [
        { id: "a1", name: "Insalata Caprese al Pesto", price: 160, desc: "" },
        { id: "a2", name: "Insalata de frutos rojos", price: 180, desc: "Mezcla de lechugas, arándanos, zarzamora, higos, ate y queso de cabra con vinagreta de fresa." },
        { id: "a3", name: "Tabla de quesos", price: 299, desc: "Chorizo español, salami, jamón serrano, manchego semi curado, queso de cabra, frutas de temporada, aceitunas con anchoas, miel y pan bomba." }
    ]},
    { category: "🍕 La Vera Pizza Napoletana", items: [
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
    ]},
    { category: "🍝 Pasta Fatta In Casa", items: [
        { id: "pa1", name: "Tagliatelle al Ragü Bolognese", price: 180, desc: "Pasta fresca con ragú de carne cocinada lentamente con tomate y queso parmesano." },
        { id: "pa2", name: "Lasagna della Nonna", price: 210, desc: "La Ricetta di la nonna mayita, con mozzarella, salsa de tomate san Marzano y parmesano." },
        { id: "pa3", name: "Rigatoni alla Vodka", price: 217, desc: "Salsa cremosa de tomate italiano con vodka, mantequilla, parmesano y albahaca fresca." },
        { id: "pa4", name: "Tagliatelle al diavolo e gamberi", price: 205, desc: "Salsa de tomate picante con jugosos camarones en aceite de oliva y parmesano." },
        { id: "pa5", name: "Spaghetti al pesto", price: 190, desc: "Pasta larga a base de salsa de albahaca con piñones, tomate Cherry y parmesano." },
        { id: "pa6", name: "Rigatoni al Ragù di Funghi", price: 217, desc: "Hongos salteados con tomate, vino tinto, albahaca, tomillo, mantequilla y parmesano." },
        { id: "pa7", name: "Fettuccine Alfredo", price: 215, desc: "La ricetta classica di Roma. Salsa blanca cremosa de mantequilla con Parmigiano Reggiano." }
    ]},
    { category: "☕ Bebidas Calientes", items: [
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
    ]},
    { category: "❄️ Frappes", items: [
        { id: "f1", name: "Taro", price: 85, desc: "" },
        { id: "f2", name: "Ferrero", price: 95, desc: "" },
        { id: "f3", name: "Caramelo", price: 85, desc: "" },
        { id: "f4", name: "Moka", price: 60, desc: "" },
        { id: "f5", name: "Chocoreta", price: 80, desc: "" },
        { id: "f6", name: "Mazapan", price: 80, desc: "" },
        { id: "f7", name: "Oreo", price: 80, desc: "" },
        { id: "f8", name: "Matcha", price: 105, desc: "" },
        { id: "f9", name: "Pastel Hersheys", price: 90, desc: "" }
    ]},
    { category: "🧊 Bebidas Frías", items: [
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
    ]},
    { category: "🍨 Dolci de Véneto", items: [
        { id: "d1", name: "Affogato (Ahogado)", price: 75, desc: "Robusto espresso y cremoso helado de vainilla." },
        { id: "d2", name: "Affogato Matcha Nostra Ricetta", price: 90, desc: "" },
        { id: "d3", name: "Gelato di vainilla", price: 55, desc: "Con frutos rojos y crema batida." },
        { id: "d4", name: "Postre de temporada", price: 0, desc: "Pregunta por nuestro postre semanal." }
    ]}
];

// Flatmap it to the structure needed
const arrToPush = [];
menuData.forEach(c => {
    c.items.forEach(i => {
        arrToPush.push({
            id: i.id,
            nombre: i.name,
            categoria: c.category,
            precio: i.price,
            status: "DISPONIBLE",
            img: "",
            desc: i.desc || ""
        });
    });
});

async function push() {
    console.log("Pushing " + arrToPush.length + " products to sheet...");
    try {
        const res = await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'saveProducts',
                productos: arrToPush
            })
        });
        const d = await res.text();
        console.log("Response:", d);
    } catch(e) {
        console.error("Error:", e);
    }
}
push();
