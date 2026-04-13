# ⚙️ Manual: Base de Datos Desacoplada (Fiore de Enero)

Agencia Treze Labs.
Siguiendo los protocolos de alto rendimiento, este documento contiene las instrucciones precisas para generar el **Motor de Base de Datos** de Fiore de Enero sin riesgos de cuota en Vercel.

---

## 1. Crear el Archivo en Google Sheets
1. Entra a tu cuenta de Google Drive de la agencia o de escritorio.
2. Crea un nuevo Google Sheet llamado **"BD_FIORE_DE_ENERO"**.
3. Cambia el nombre de la pestaña abajo (Hoja 1) a: **Config**
4. Agrega una segunda pestaña (Hoja 2) y nómbrala: **Productos**

*(No importa qué pongas en las columnas, el script actualizará los datos basándose en el panel central).*

---

## 2. Inyectar el Código de la API (Backend Cero Costo)
1. Con tu Google Sheet abierto, ve al menú superior: **Extensiones > Apps Script**.
2. Borra todo el código que aparece ahí y **pega exactamente lo siguiente**:

```javascript
// =========================================
// TREZE LABS // GOOGLE SHEETS API ENGINE 
// Cliente: Fiore de Enero
// =========================================

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetConfig = sheet.getSheetByName("Config");
  var sheetProducts = sheet.getSheetByName("Productos");
  
  // Extraer Config
  var configData = sheetConfig.getDataRange().getValues();
  var configObj = {};
  if(configData.length > 0) {
    configObj = {
      tiendaStatus: configData[0][1] || 'ABIERTO',
      banner: configData[1][1] || '',
      promoActive: configData[2][1] || 'NO',
      promoTitle: configData[3][1] || '',
      promoDesc: configData[4][1] || ''
    };
  }
  
  // Extraer Productos
  var prodData = sheetProducts.getDataRange().getValues();
  var productos = [];
  if(prodData.length > 1) { // Asume renglón 1 es Headers
    for(var i=1; i<prodData.length; i++) {
       productos.push({
          id: prodData[i][0],
         nombre: prodData[i][1],
         categoria: prodData[i][2],
         precio: prodData[i][3],
         status: prodData[i][4],
         img: prodData[i][5],
         desc: prodData[i][6]
       });
    }
  }
  
  var response = { config: configObj, productos: productos };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var postData = JSON.parse(e.postData.contents);
  var action = postData.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  if(action === 'saveConfig' || action === 'savePromo') {
    var sheetConfig = sheet.getSheetByName("Config");
    sheetConfig.clear();
    
    var keys = Object.keys(postData.data);
    for(var i=0; i<keys.length; i++) {
       sheetConfig.getRange(i+1, 1).setValue(keys[i]);
       sheetConfig.getRange(i+1, 2).setValue(postData.data[keys[i]]);
    }
  }
  
  if(action === 'saveProducts') {
    var sheetProducts = sheet.getSheetByName("Productos");
    sheetProducts.clear();
    sheetProducts.appendRow(["ID", "NOMBRE", "CATEGORIA", "PRECIO", "STATUS", "IMG_URL", "DESC"]); // Headers
    
    var arr = postData.productos;
    for(var i=0; i<arr.length; i++) {
      var p = arr[i];
      sheetProducts.appendRow([p.id, p.nombre, p.categoria || "N/A", p.precio, p.status, p.img, p.desc]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({"status":"success"})).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 3. Desplegar como Aplicación Web (Webhook)
1. En el script, dale al icono de guardar (el disquete).
2. Arriba a la derecha, dale clic en el botón azul **"Implementar" -> "Nueva implementación"**.
3. Configuración:
   - Tipo: **Aplicación Web**
   - Ejecutar como: **Yo (tu correo)**
   - Quién tiene acceso: **Cualquier persona** (⚠️ Esto es CRÍTICO para que no pida login a tus clientes).
4. Dale en **Implementar**. Si te pide autorizar accesos a tu cuenta, acéptalos en la ventana de Advertencia Avanzada "Ir a Proyecto".
5. ¡Listo! Te dará una **URL LARGA de Aplicación Web**. Cópiala.

---

## 4. Conectar al Ecosistema (Paso Final)
Abre el archivo `admin/app.js` en tu VSC o Treze Node y, en la línea 2, reemplaza `PEGAR_AQUI_LA_URL_DEL_SCRIPT` con esa URL larga que acabas de copiar. Ejemplo:

`const WEBAPP_URL = "https://script.google.com/macros/s/AKfycb.../exec";`

Una vez hecho eso, tu **Command Center** y el **Portafolio de Fiore** estarán matemáticamente enlazados de por vida sin necesidad de tocar Vercel.
