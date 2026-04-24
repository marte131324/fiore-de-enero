# 📋 STATUS — Fiore de Enero | Command Center
> Archivo de contexto persistente para Antigravity AI.  
> Última actualización: 2026-04-23

---

## 🏗️ Arquitectura del Ecosistema

| Módulo | Ruta | URL Producción | Estado |
|--------|------|----------------|--------|
| VCard Pública | `/index.html` | `fiore-de-enero.vercel.app` | ✅ LIVE |
| Command Center (Admin/Caja) | `/admin/` | `fiore-de-enero.vercel.app/admin` | ✅ LIVE |
| Módulo Mesero | `/mesero/` | `fiore-de-enero.vercel.app/mesero` | ✅ LIVE |
| Kitchen Display (KDS) | `/cocina/` | `fiore-de-enero.vercel.app/cocina` | ✅ LIVE |
| Bóveda de Entrega | `/Boveda/` | `fiore-de-enero.vercel.app/boveda` | ✅ LIVE |
| Backend API | Google Apps Script v2 | WebApp URL conectada | ✅ LIVE |

## 🔑 Credenciales del Sistema
- **PIN Admin:** 2026 (acceso completo)
- **PIN Cajera:** 1313 (acceso restringido — sin Dashboard, Historial, Meseros, Config, Productos)
- **PIN Meseros:** Se gestionan desde Admin > Personal & PIN
- **Dominio Autorizado:** `fiore-de-enero.vercel.app` (+ localhost)
- **WebApp URL:** `https://script.google.com/macros/s/AKfycbyDWCCn2P3v4-Co3OtJWbXQSHR244n96x7x1vqe4mE_L3tMns_E5-aT4CcyyHAPc8L2/exec`

## 📊 Google Sheets (Backend)
Hojas configuradas:
- `Config` — Estado tienda, banner, promos, eventos, mesaCount
- `Productos` — Catálogo con categorías (Pizza, Pasta, Antipasti, Café, Frappes, Bebidas, Postres)
- `Ventas` — Registro de tickets cobrados (ID, Fecha, Hora, Items, Total, Método Pago, Mesa, Mesero, Propina, Extras)
- `Mesas` — Estado real-time de mesas (Num, Estado, Mesero, Personas, Items, Extras, Descuento, PideCuenta)
- `Meseros` — Catálogo de empleados (Codigo, Nombre, Activo)
- `Trafico` — Contador diario de personas
- `Cocina_Tickets` — Tickets KDS (ID, Mesa, Mesero, Hora, Items, Estado, TerminadoHora)
- `Auditoria` — Log de acciones (Timestamp, Usuario, Acción, Detalles)

## 🛡️ Seguridad Implementada
- Anti-Clonación por Domain Lock (admin, mesero, cocina)
- PIN Gate con SHA-256 hash
- RBAC (Role-Based Access Control): Admin vs Cajera
- PIN Gerencial para modificaciones de mesa
- Auditoría completa de acciones críticas
- Headers de seguridad en Vercel (HSTS, X-Frame, XSS Protection, CSP)
- Cache deshabilitado para rutas operativas (/admin, /mesero, /cocina)

## ✅ Funcionalidades Completadas
1. **Caja POS** — Cobro con descuentos (0/10/15/20%), propina (0/5/10/15/20%), 3 métodos de pago, cargos extra
2. **Mesas Activas** — Vista en tiempo real, "Pide Cuenta" con animación pulsante
3. **Selector de Mesa en POS** — Carga automática de consumo existente
4. **Mesero App (Mobile First)** — Login, toma de comanda, notas preset, cargos extra, pedir cuenta
5. **Kitchen Display (KDS)** — Tickets activos, estados (Pendiente → En Preparación → Listo), audio alert, historial
6. **Dashboard** — KPIs, métodos de pago, top/flop productos, ventas por hora, tasa de conversión
7. **Historial de Ventas** — Tickets expandibles, descarga CSV
8. **Tráfico del Día** — Contador manual
9. **Control Maestro** — Estado tienda (Abierto/Cerrado), banner global
10. **Catálogo Menú** — CRUD de platillos con categorías
11. **Promociones** — Pop-up controlable desde admin
12. **Eventos / Cartelera** — Sección controlable para VCard
13. **Personal & PIN** — Gestión de meseros (CRUD)
14. **Polling** — Sync cada 30s (admin y mesero), 15s (cocina)
15. **Race Condition Protection** — Validación servidor para mesa cerrada mientras mesero edita
16. **WhatsApp Ticket** — Compartir ticket cobrado vía WhatsApp
17. **Responsive** — Desktop + Mobile en todos los módulos
18. **Bóveda de Entrega** — Documentación profesional del proyecto

## 🔄 Fase Actual
**FASE: PRODUCCIÓN (CLIENT HANDOFF)**
- Base de datos conectada: ✅
- Menú cargado en BD: ✅
- Despliegue Vercel: ✅
- Auditoría de flujo completo: ✅ COMPLETADA
- Ecosistema listo para entrega al cliente.

## 📝 Bugs Encontrados en Auditoría
<!-- Agregar bugs aquí conforme se detecten -->
| # | Descripción | Módulo | Severidad | Estado |
|---|-------------|--------|-----------|--------|
| - | - | - | - | - |

## 📅 Historial de Cambios
| Fecha | Cambio |
|-------|--------|
| 2026-04-23 | Creación de STATUS.md — Inicio de auditoría de flujo operativo |

---
*Archivo mantenido por Treze Labs × Antigravity*
