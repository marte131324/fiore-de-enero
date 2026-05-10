// =========================================
// TREZE LABS // GOOGLE SHEETS API ENGINE v2.0
// Cliente: Fiore de Enero
// (POS + Centro de Comandas + Mesas + Meseros)
// =========================================

// ---- HELPER: Audit Logger ----
function logAuditEntry(sheet, usuario, accion, detalles) {
  var sheetAudit = sheet.getSheetByName("Auditoria");
  if(!sheetAudit) {
    sheetAudit = sheet.insertSheet("Auditoria");
    sheetAudit.appendRow(['Timestamp', 'Usuario', 'Accion', 'Detalles']);
  }
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'America/Mexico_City', "yyyy-MM-dd HH:mm:ss");
  sheetAudit.appendRow([timestamp, usuario, accion, detalles]);
}

// ========== GET ==========
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetConfig = sheet.getSheetByName("Config");
  var sheetProducts = sheet.getSheetByName("Productos");
  var sheetVentas = sheet.getSheetByName("Ventas");
  var sheetTrafico = sheet.getSheetByName("Trafico");
  var sheetMesas = sheet.getSheetByName("Mesas");
  var sheetMeseros = sheet.getSheetByName("Meseros");
  
  // --- Config (key-based read, más robusto) ---
  var configData = sheetConfig ? sheetConfig.getDataRange().getValues() : [];
  var configObj = {};
  for(var i=0; i<configData.length; i++) {
    if(configData[i][0]) {
      configObj[configData[i][0]] = configData[i][1] !== undefined ? configData[i][1] : '';
    }
  }
  
  // --- Productos ---
  var prodData = sheetProducts ? sheetProducts.getDataRange().getValues() : [];
  var productos = [];
  if(prodData.length > 1) {
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

  // --- Fecha de hoy ---
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'America/Mexico_City', "yyyy-MM-dd");
  
  var action = (e && e.parameter) ? e.parameter.action : '';


  // --- Ventas por rango (Dashboard) ---
  if(action === 'getVentasRango') {
    var desde = e.parameter.desde;
    var hasta = e.parameter.hasta;
    var tz = 'America/Mexico_City';
    var ventasRango = [];
    if(sheetVentas) {
      var vData = sheetVentas.getDataRange().getValues();
      for(var i=1; i<vData.length; i++) {
        var fechaObj = vData[i][1];
        var fechaStr = "";
        if(fechaObj instanceof Date) {
            // Use explicit timezone to prevent day-shift from UTC conversion
            fechaStr = Utilities.formatDate(fechaObj, tz, "yyyy-MM-dd");
        } else {
            var parsedDate = new Date(fechaObj);
            if (!isNaN(parsedDate.getTime())) {
                fechaStr = Utilities.formatDate(parsedDate, tz, "yyyy-MM-dd");
            } else {
                fechaStr = String(fechaObj).substring(0, 10);
            }
        }
        if(fechaStr >= desde && fechaStr <= hasta) {
          // Normalize hora — GSheets may store as Date object
          var horaRaw = vData[i][2];
          var horaStr = '';
          if(horaRaw instanceof Date) {
            horaStr = Utilities.formatDate(horaRaw, tz, "HH:mm");
          } else {
            var parsedHora = new Date(horaRaw);
            if (!isNaN(parsedHora.getTime()) && String(horaRaw).length > 10) {
               horaStr = Utilities.formatDate(parsedHora, tz, "HH:mm");
            } else {
               horaStr = String(horaRaw || '');
            }
          }
          
          // Normalize items — ensure it's a JSON string
          var itemsRaw = vData[i][3];
          var itemsStr = '[]';
          if(typeof itemsRaw === 'string') {
            itemsStr = itemsRaw;
          } else if(itemsRaw) {
            try { itemsStr = JSON.stringify(itemsRaw); } catch(e2) { itemsStr = '[]'; }
          }
          
          // Normalize extras
          var extrasRaw = vData[i][13];
          var extrasStr = '[]';
          if(typeof extrasRaw === 'string' && extrasRaw.length > 0) {
            extrasStr = extrasRaw;
          } else if(extrasRaw) {
            try { extrasStr = JSON.stringify(extrasRaw); } catch(e2) { extrasStr = '[]'; }
          }
          
          var sub = parseFloat(vData[i][4]) || 0;
          var descPct = parseFloat(vData[i][5]) || 0;
          
          ventasRango.push({
            id: vData[i][0], fecha: fechaStr, hora: horaStr,
            items: itemsStr, subtotal: sub, descuento: descPct,
            descMonto: sub * descPct / 100,
            total: parseFloat(vData[i][6]) || 0, metodoPago: vData[i][7] || '',
            mesa: vData[i][8] || '', mesero: vData[i][9] || '',
            personas: vData[i][10] || 1, propina: vData[i][11] || 0,
            propinaMonto: parseFloat(vData[i][12]) || 0, extras: extrasStr
          });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ventas: ventasRango })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Sync Mesas (polling ligero) ---
  if(action === 'syncMesas') {
    var mesasActivas = readMesasActivas(sheetMesas);
    return ContentService.createTextOutput(JSON.stringify({ mesas: mesasActivas })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Mesero Init (solo lo que necesita el mesero) ---
  if(action === 'meseroInit') {
    var mesasActivas = readMesasActivas(sheetMesas);
    var meseros = readMeseros(sheetMeseros);
    return ContentService.createTextOutput(JSON.stringify({
      productos: productos,
      mesas: mesasActivas,
      meseros: meseros,
      mesaCount: parseInt(configObj.mesaCount) || 15
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Auditoría (últimas N entradas) ---
  if(action === 'getAuditoria') {
    var sheetAudit = sheet.getSheetByName("Auditoria");
    var auditEntries = [];
    if(sheetAudit) {
      var aData = sheetAudit.getDataRange().getValues();
      var start = Math.max(1, aData.length - 50);
      for(var i=aData.length-1; i>=start; i--) {
        auditEntries.push({
          timestamp: aData[i][0], usuario: aData[i][1],
          accion: aData[i][2], detalles: aData[i][3]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ auditoria: auditEntries })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Ventas de Hoy ---
  var ventasHoy = [];
  if(sheetVentas) {
    var vData = sheetVentas.getDataRange().getValues();
    if(vData.length > 1) {
      for(var i=1; i<vData.length; i++) {
        var fechaObj = vData[i][1];
        var fechaStr = "";
        if(fechaObj instanceof Date) {
            fechaStr = Utilities.formatDate(fechaObj, 'America/Mexico_City', "yyyy-MM-dd");
        } else {
            var parsedDate = new Date(fechaObj);
            if (!isNaN(parsedDate.getTime())) {
                fechaStr = Utilities.formatDate(parsedDate, 'America/Mexico_City', "yyyy-MM-dd");
            } else {
                fechaStr = String(fechaObj).substring(0, 10);
            }
        }
        if(fechaStr === todayStr) {
          // Normalize hora
          var horaRaw = vData[i][2];
          var horaStr = '';
          if(horaRaw instanceof Date) {
            horaStr = Utilities.formatDate(horaRaw, 'America/Mexico_City', "HH:mm");
          } else {
            var parsedHora = new Date(horaRaw);
            if (!isNaN(parsedHora.getTime()) && String(horaRaw).length > 10) {
               horaStr = Utilities.formatDate(parsedHora, 'America/Mexico_City', "HH:mm");
            } else {
               horaStr = String(horaRaw || '');
            }
          }
          // Normalize items
          var itemsRaw = vData[i][3];
          var itemsStr = '[]';
          if(typeof itemsRaw === 'string') { itemsStr = itemsRaw; }
          else if(itemsRaw) { try { itemsStr = JSON.stringify(itemsRaw); } catch(e2) {} }
          // Normalize extras
          var extrasRaw = vData[i][13];
          var extrasStr = '[]';
          if(typeof extrasRaw === 'string' && extrasRaw.length > 0) { extrasStr = extrasRaw; }
          else if(extrasRaw) { try { extrasStr = JSON.stringify(extrasRaw); } catch(e2) {} }
          
          var sub = parseFloat(vData[i][4]) || 0;
          var descPct = parseFloat(vData[i][5]) || 0;
          
          ventasHoy.push({
            id: vData[i][0], fecha: fechaStr, hora: horaStr,
            items: itemsStr, subtotal: sub, descuento: descPct,
            descMonto: sub * descPct / 100,
            total: parseFloat(vData[i][6]) || 0, metodoPago: vData[i][7] || '',
            mesa: vData[i][8] || '', mesero: vData[i][9] || '',
            personas: vData[i][10] || 1, propina: vData[i][11] || 0,
            propinaMonto: parseFloat(vData[i][12]) || 0, extras: extrasStr
          });
        }
      }
    }
  }

  // --- Tráfico de Hoy ---
  var traficoHoy = 0;
  if(sheetTrafico) {
    var tData = sheetTrafico.getDataRange().getValues();
    for(var i=1; i<tData.length; i++) {
      if(tData[i][0] == todayStr) {
        traficoHoy = tData[i][1];
        break;
      }
    }
  }

  // --- Mesas Activas ---
  var mesasActivas = readMesasActivas(sheetMesas);

  // --- Meseros ---
  var meseros = readMeseros(sheetMeseros);
  
  // --- Respuesta completa (admin) ---
  var response = { 
    config: configObj, 
    productos: productos, 
    ventasHoy: ventasHoy, 
    traficoHoy: traficoHoy,
    mesas: mesasActivas,
    meseros: meseros
  };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// ========== POST ==========
function doPost(e) {
  var postData = JSON.parse(e.postData.contents);
  var action = postData.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- Config (original) ---
  if(action === 'getCocina') {
    var sheetCocina = sheet.getSheetByName("Cocina_Tickets");
    if(!sheetCocina) {
      return ContentService.createTextOutput(JSON.stringify({ tickets: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    var cData = sheetCocina.getDataRange().getValues();
    var tickets = [];
    // Include historic tickets from today. We can filter by date if needed, but for now we'll just send all LISTO today or recent.
    var todayStr = Utilities.formatDate(new Date(), 'America/Mexico_City', "yyyy-MM-dd");
    for(var i=1; i<cData.length; i++) {
        var estado = cData[i][5];
        if(estado === 'PENDIENTE' || estado === 'EN PREPARACION' || estado === 'LISTO') {
            var horaObj = cData[i][3];
            var horaStr = "";
            if (horaObj instanceof Date) {
               horaStr = Utilities.formatDate(horaObj, 'America/Mexico_City', "HH:mm");
            } else {
               horaStr = String(horaObj);
            }
            
            var horaTerminadoObj = cData[i][6];
            var horaTerminadoStr = "";
            if (horaTerminadoObj instanceof Date) {
               horaTerminadoStr = Utilities.formatDate(horaTerminadoObj, 'America/Mexico_City', "HH:mm");
            } else {
               horaTerminadoStr = String(horaTerminadoObj || "");
            }

            tickets.push({
              id: cData[i][0],
              mesaNum: cData[i][1],
              mesero: cData[i][2],
              hora: horaStr,
              items: cData[i][4],
              estado: estado,
              terminadoHora: horaTerminadoStr,
              estacion: cData[i][7] || 'todas'
            });
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ tickets: tickets })).setMimeType(ContentService.MimeType.JSON);
  } else if(action === 'sendToCocina') {
    var sheetCocina = sheet.getSheetByName("Cocina_Tickets");
    if(!sheetCocina) {
      sheetCocina = sheet.insertSheet("Cocina_Tickets");
      sheetCocina.appendRow(['TicketID','MesaNum','Mesero','Hora','ItemsJSON','Estado', 'TerminadoHora', 'Estacion']);
    }
    var baseID = Date.now().toString(36) + Math.random().toString(36).substring(2,5);
    var timeStr = Utilities.formatDate(new Date(), 'America/Mexico_City', "HH:mm");
    
    var barraItems = [];
    var cocinaItems = [];
    
    postData.nuevosItems.forEach(function(i) {
        var cat = String(i.c || '').toLowerCase();
        if(cat.indexOf('bebida') > -1 || cat.indexOf('frappe') > -1 || cat.indexOf('café') > -1 || cat.indexOf('postre') > -1 || cat.indexOf('dolci') > -1 || cat.indexOf('coctelería') > -1 || cat.indexOf('cocteleria') > -1) {
            barraItems.push(i);
        } else {
            cocinaItems.push(i);
        }
    });

    if(barraItems.length > 0) {
        sheetCocina.appendRow([
          baseID + '-B', 
          postData.mesaNum, 
          postData.mesero, 
          timeStr, 
          JSON.stringify(barraItems), 
          'PENDIENTE',
          '',
          'barra'
        ]);
    }
    if(cocinaItems.length > 0) {
        sheetCocina.appendRow([
          baseID + '-C', 
          postData.mesaNum, 
          postData.mesero, 
          timeStr, 
          JSON.stringify(cocinaItems), 
          'PENDIENTE',
          '',
          'cocina'
        ]);
    }
    return ContentService.createTextOutput(JSON.stringify({"status":"ok"})).setMimeType(ContentService.MimeType.JSON);
  } else if(action === 'markCocinaPreparing') {
    var sheetCocina = sheet.getSheetByName("Cocina_Tickets");
    if(sheetCocina) {
      var cData = sheetCocina.getDataRange().getValues();
      for(var i=1; i<cData.length; i++) {
        if(String(cData[i][0]) === String(postData.ticketID)) {
          sheetCocina.getRange(i+1, 6).setValue('EN PREPARACION');
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status":"ok"})).setMimeType(ContentService.MimeType.JSON);
  } else if(action === 'markCocinaReady') {
    var sheetCocina = sheet.getSheetByName("Cocina_Tickets");
    if(sheetCocina) {
      var cData = sheetCocina.getDataRange().getValues();
      var timeStr = Utilities.formatDate(new Date(), 'America/Mexico_City', "HH:mm");
      for(var i=1; i<cData.length; i++) {
        if(String(cData[i][0]) === String(postData.ticketID)) {
          sheetCocina.getRange(i+1, 6).setValue('LISTO');
          sheetCocina.getRange(i+1, 7).setValue(timeStr);
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status":"ok"})).setMimeType(ContentService.MimeType.JSON);
  } else if(action === 'deleteCocinaTicket') {
    var sheetCocina = sheet.getSheetByName("Cocina_Tickets");
    if(sheetCocina) {
      var cData = sheetCocina.getDataRange().getValues();
      for(var i=1; i<cData.length; i++) {
        if(String(cData[i][0]) === String(postData.ticketID)) {
          sheetCocina.deleteRow(i+1);
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status":"ok"})).setMimeType(ContentService.MimeType.JSON);
  } else if(action === 'saveConfig' || action === 'savePromo') {
    var sheetConfig = sheet.getSheetByName("Config");
    sheetConfig.clear();
    var keys = Object.keys(postData.data);
    for(var i=0; i<keys.length; i++) {
      sheetConfig.getRange(i+1, 1).setValue(keys[i]);
      sheetConfig.getRange(i+1, 2).setValue(postData.data[keys[i]]);
    }
  }
  
  // --- Productos (original) ---
  if(action === 'saveProducts') {
    var sheetProducts = sheet.getSheetByName("Productos");
    sheetProducts.clear();
    sheetProducts.appendRow(["ID", "NOMBRE", "CATEGORIA", "PRECIO", "STATUS", "IMG_URL", "DESC"]);
    var arr = postData.productos;
    for(var i=0; i<arr.length; i++) {
      var p = arr[i];
      sheetProducts.appendRow([p.id, p.nombre, p.categoria || "N/A", p.precio, p.status, p.img, p.desc]);
    }
  }

  // --- Guardar Venta (extendido) ---
  if(action === 'saveVenta') {
    var sheetVentas = sheet.getSheetByName("Ventas");
    if(!sheetVentas) {
      sheetVentas = sheet.insertSheet("Ventas");
      sheetVentas.appendRow(['ID','Fecha','Hora','ItemsJSON','Subtotal','Descuento','Total','MetodoPago','Mesa','Mesero','Personas','Propina','PropinaMonto','Extras']);
    }
    var v = postData.venta;
    sheetVentas.appendRow([
      v.id, v.fecha, v.hora, v.items, v.subtotal, v.descuento, v.total, v.metodoPago,
      v.mesa || '', v.mesero || '', v.personas || 1, v.propina || 0, v.propinaMonto || 0, v.extras || '[]'
    ]);
    logAuditEntry(sheet, v.mesero || 'Admin', 'VENTA', 'Ticket ' + v.id + ' Mesa ' + (v.mesa || 'N/A') + ' $' + v.total);
  }

  // --- Tráfico (original) ---
  if(action === 'updateTrafico') {
    var sheetTrafico = sheet.getSheetByName("Trafico");
    if(!sheetTrafico) {
      sheetTrafico = sheet.insertSheet("Trafico");
      sheetTrafico.appendRow(['Fecha', 'Personas', 'UltimaActualizacion']);
    }
    var today = new Date();
    var todayStr = Utilities.formatDate(today, 'America/Mexico_City', "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(today, 'America/Mexico_City', "HH:mm:ss");
    var tData = sheetTrafico.getDataRange().getValues();
    var found = false;
    for(var i=1; i<tData.length; i++) {
      if(tData[i][0] == todayStr) {
        sheetTrafico.getRange(i+1, 2).setValue(postData.personas);
        sheetTrafico.getRange(i+1, 3).setValue(timeStr);
        found = true;
        break;
      }
    }
    if(!found) {
      sheetTrafico.appendRow([todayStr, postData.personas, timeStr]);
    }
  }

  // =============================================
  // MESAS
  // =============================================

  // --- Guardar/Actualizar Mesa ---
  if(action === 'saveMesa') {
    var sheetMesas = sheet.getSheetByName("Mesas");
    if(!sheetMesas) {
      sheetMesas = sheet.insertSheet("Mesas");
      sheetMesas.appendRow(['MesaNum','Estado','Mesero','Personas','HoraApertura','ItemsJSON','ExtrasJSON','Descuento','Total','UltimaAct', 'PideCuenta']);
    }
    var m = postData.mesa;
    var isNewReq = postData.isNew === true;
    var mData = sheetMesas.getDataRange().getValues();
    var found = false;
    var timeStr = Utilities.formatDate(new Date(), 'America/Mexico_City', "HH:mm:ss");
    var pideCuentaVal = m.pideCuenta ? "SI" : "NO";
    
    for(var i=1; i<mData.length; i++) {
      if(String(mData[i][0]) == String(m.mesaNum) && mData[i][1] === 'abierta') {
        sheetMesas.getRange(i+1, 3).setValue(m.mesero || '');
        sheetMesas.getRange(i+1, 4).setValue(m.personas || 1);
        sheetMesas.getRange(i+1, 6).setValue(m.items || '[]');
        sheetMesas.getRange(i+1, 7).setValue(m.extras || '[]');
        sheetMesas.getRange(i+1, 8).setValue(m.descuento || 0);
        sheetMesas.getRange(i+1, 9).setValue(m.total || 0);
        sheetMesas.getRange(i+1, 10).setValue(timeStr);
        sheetMesas.getRange(i+1, 11).setValue(pideCuentaVal);
        found = true;
        break;
      }
    }

    if(!found) {
      // VULNERABILITY FIX: Solo creamos nueva fila si la petición explícitamente pide crear mesa.
      // Si el mesero está guardando una comanda en una mesa que creía abierta (pero caja ya cerró), isNew será false.
      if(isNewReq) {
        sheetMesas.appendRow([
          m.mesaNum, 'abierta', m.mesero || '', m.personas || 1, timeStr,
          m.items || '[]', m.extras || '[]', m.descuento || 0, m.total || 0, timeStr, pideCuentaVal
        ]);
      } else {
        // La mesa no está abierta y no era una petición de creación = RACE CONDITION ATCHED.
        return ContentService.createTextOutput(JSON.stringify({"status":"error", "reason":"CLOSED"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  // --- Cerrar Mesa (cobrada) ---
  if(action === 'closeMesa') {
    var sheetMesas = sheet.getSheetByName("Mesas");
    if(sheetMesas) {
      var mData = sheetMesas.getDataRange().getValues();
      for(var i=1; i<mData.length; i++) {
        if(String(mData[i][0]) == String(postData.mesaNum) && mData[i][1] === 'abierta') {
          sheetMesas.getRange(i+1, 2).setValue('cobrada');
          sheetMesas.getRange(i+1, 10).setValue(Utilities.formatDate(new Date(), 'America/Mexico_City', "HH:mm:ss"));
          break;
        }
      }
    }
    logAuditEntry(sheet, postData.usuario || 'Admin', 'CERRAR_MESA', 'Mesa ' + postData.mesaNum + ' cobrada');
  }

  // --- Cancelar Mesa ---
  if(action === 'cancelMesa') {
    var sheetMesas = sheet.getSheetByName("Mesas");
    if(sheetMesas) {
      var mData = sheetMesas.getDataRange().getValues();
      for(var i=1; i<mData.length; i++) {
        if(String(mData[i][0]) == String(postData.mesaNum) && mData[i][1] === 'abierta') {
          sheetMesas.getRange(i+1, 2).setValue('cancelada');
          sheetMesas.getRange(i+1, 10).setValue(Utilities.formatDate(new Date(), 'America/Mexico_City', "HH:mm:ss"));
          break;
        }
      }
    }
    logAuditEntry(sheet, postData.usuario || 'Admin', 'CANCELAR_MESA', 'Mesa ' + postData.mesaNum + ' cancelada. Motivo: ' + (postData.motivo || ''));
  }

  // =============================================
  // MESEROS
  // =============================================

  // --- Guardar/Actualizar Mesero ---
  if(action === 'saveMesero') {
    var sheetMeseros = sheet.getSheetByName("Meseros");
    if(!sheetMeseros) {
      sheetMeseros = sheet.insertSheet("Meseros");
      sheetMeseros.appendRow(['Codigo','Nombre','Activo']);
    }
    var mes = postData.mesero;
    var mesData = sheetMeseros.getDataRange().getValues();
    var found = false;
    for(var i=1; i<mesData.length; i++) {
      if(String(mesData[i][0]) == String(mes.codigo)) {
        sheetMeseros.getRange(i+1, 2).setValue(mes.nombre);
        sheetMeseros.getRange(i+1, 3).setValue(mes.activo || 'SI');
        found = true;
        break;
      }
    }
    if(!found) {
      sheetMeseros.appendRow([mes.codigo, mes.nombre, mes.activo || 'SI']);
    }
    logAuditEntry(sheet, 'Admin', 'MESERO', (found ? 'Actualizado' : 'Creado') + ': ' + mes.nombre + ' (' + mes.codigo + ')');
  }

  // --- Eliminar Mesero ---
  if(action === 'deleteMesero') {
    var sheetMeseros = sheet.getSheetByName("Meseros");
    if(sheetMeseros) {
      var mesData = sheetMeseros.getDataRange().getValues();
      for(var i=1; i<mesData.length; i++) {
        if(String(mesData[i][0]) == String(postData.codigo)) {
          logAuditEntry(sheet, 'Admin', 'MESERO_ELIMINADO', mesData[i][1] + ' (' + mesData[i][0] + ')');
          sheetMeseros.deleteRow(i+1);
          break;
        }
      }
    }
  }

  // --- Error Logger (Registro de Errores del Sistema) ---
  if(action === 'logError') {
    var sheetErrors = sheet.getSheetByName("ErrorLog");
    if(!sheetErrors) {
      sheetErrors = sheet.insertSheet("ErrorLog");
      sheetErrors.appendRow(['Timestamp', 'Modulo', 'TipoError', 'Mesero', 'Mesa', 'Detalles', 'ItemsJSON', 'Resuelto']);
      // Format header
      sheetErrors.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    var now = new Date();
    var timestamp = Utilities.formatDate(now, 'America/Mexico_City', "yyyy-MM-dd HH:mm:ss");
    sheetErrors.appendRow([
      timestamp,
      postData.modulo || 'Desconocido',
      postData.errorType || 'GENERIC',
      postData.mesero || '',
      postData.mesa || '',
      postData.detalles || '',
      postData.itemsJSON || '',
      'NO'
    ]);
    // Also log to Auditoria for cross-reference
    logAuditEntry(sheet, postData.mesero || 'Sistema', 'ERROR_SISTEMA', postData.errorType + ': ' + (postData.detalles || ''));
  }

  // --- Get Error Log (Admin reads errors) ---
  if(action === 'getErrorLog') {
    var sheetErrors = sheet.getSheetByName("ErrorLog");
    var errors = [];
    if(sheetErrors) {
      var eData = sheetErrors.getDataRange().getValues();
      var start = Math.max(1, eData.length - 100);
      for(var i=eData.length-1; i>=start; i--) {
        errors.push({
          timestamp: eData[i][0],
          modulo: eData[i][1],
          tipoError: eData[i][2],
          mesero: eData[i][3],
          mesa: eData[i][4],
          detalles: eData[i][5],
          itemsJSON: eData[i][6],
          resuelto: eData[i][7]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ errors: errors })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Log Auditoría manual ---
  if(action === 'logAudit') {
    logAuditEntry(sheet, postData.usuario || 'Sistema', postData.accion || '', postData.detalles || '');
  }
  
  return ContentService.createTextOutput(JSON.stringify({"status":"success"})).setMimeType(ContentService.MimeType.JSON);
}

// ========== HELPERS ==========

function readMesasActivas(sheetMesas) {
  var mesas = [];
  if(!sheetMesas) return mesas;
  var mData = sheetMesas.getDataRange().getValues();
  for(var i=1; i<mData.length; i++) {
    if(mData[i][1] === 'abierta') {
      mesas.push({
        mesaNum: mData[i][0],
        estado: mData[i][1],
        mesero: mData[i][2] || '',
        personas: mData[i][3] || 1,
        horaApertura: mData[i][4] || '',
        items: mData[i][5] || '[]',
        extras: mData[i][6] || '[]',
        descuento: mData[i][7] || 0,
        total: mData[i][8] || 0,
        ultimaAct: mData[i][9] || '',
        pideCuenta: (mData[i][10] === 'SI' || mData[i][10] === true)
      });
    }
  }
  return mesas;
}

function readMeseros(sheetMeseros) {
  var meseros = [];
  if(!sheetMeseros) return meseros;
  var mesData = sheetMeseros.getDataRange().getValues();
  for(var i=1; i<mesData.length; i++) {
    if(mesData[i][0]) {
      meseros.push({
        codigo: String(mesData[i][0]),
        nombre: mesData[i][1] || '',
        activo: mesData[i][2] || 'SI'
      });
    }
  }
  return meseros;
}

function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
