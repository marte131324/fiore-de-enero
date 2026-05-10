  if(action === 'getAllVentasDebug') {
    var ventas = [];
    if(sheetVentas) {
      var vData = sheetVentas.getDataRange().getValues();
      for(var i=1; i<vData.length; i++) {
        ventas.push({ id: vData[i][0], rawFecha: String(vData[i][1]) });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(ventas)).setMimeType(ContentService.MimeType.JSON);
  }
