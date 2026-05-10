const fetch = require('node-fetch');
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyDWCCn2P3v4-Co3OtJWbXQSHR244n96x7x1vqe4mE_L3tMns_E5-aT4CcyyHAPc8L2/exec";

async function testRango() {
    console.log("Fetching yesterday (2026-05-09)...");
    try {
        const res = await fetch(WEBAPP_URL + "?action=getVentasRango&desde=2026-05-09&hasta=2026-05-09");
        const text = await res.text();
        console.log("Length:", text.length);
        console.log("Raw Response (first 500 chars):", text.substring(0, 500));
        const data = JSON.parse(text);
        console.log("Parsed Array Length:", data.ventas ? data.ventas.length : 'undefined');
    } catch(e) {
        console.error("Error:", e);
    }
}
testRango();
