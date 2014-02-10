/**
 * hrlator front-end
 * - handsontable
 * - csv/xls
 */

// create empty data in hrlator
function dataNew(type) {

  // setup data
  hrlator.newData(type);
  var rowRenderer = new hrlator.htContactsRenderer();

  $('div#hottable').handsontable({
    data: hrlator.data.rows,
    columns: hrlator.data.columns,
    cells: function (row, col, prop) {
      var cellProperties = {};
      cellProperties.renderer = rowRenderer.getRenderFunction();
      return cellProperties;
    },
    minSpareRows: 1,
    height: 600,
    colHeaders: hrlator.data.headers,
    rowHeaders: true,
    contextMenu: true,
    persistantState: true,
    manualColumnResize: true,
    afterSelectionEnd: hrlator.afterSelectionEnd,
    afterChange: hrlator.afterChange
  });

  hrlator.ht = $('div#hottable').handsontable('getInstance');

  enableDownload();
}

// load data in rows from file
function loadRows(contents) {
  var f = hrlator.data.file;
  var rows = [];

  // http://stackoverflow.com/questions/11832930/html-input-file-accept-attribute-file-type-csv
  if ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' == f.type || f.name.match(/xlsx$/)) { // excel 2010 xlsx) file
    var wb = XLSX.read(contents, {type: 'binary'});
    var sheet = wb.Sheets[wb.SheetNames[0]];
    if(!sheet["!ref"]) return rows;
    var r = XLSX.utils.decode_range(sheet["!ref"]);
    for(var R = r.s.r; R <= r.e.r; ++R) {
      var row = [];
      for(var C = r.s.c; C <= r.e.c; ++C) {
        var val = sheet[XLSX.utils.encode_cell({c:C,r:R})];
        if(!val) { row.push(""); continue; }
        // force text rendered
        if (val.t != 's') {
          val.t = 's';
          delete val.XF;
          delete val.w;
        }
        txt = XLS.utils.format_cell(val);
        row.push(String(txt).replace(/\\n/g,"\n").replace(/\\t/g,"\t").replace(/\\\\/g,"\\").replace(/\\\"/g,"\"\"").trim());
      }
      rows.push(row);
    }
  }
  else if ('application/vnd.ms-excel' == f.type || f.name.match(/xls$/)) { // excel 97 (xls) file
    var cfb = XLS.CFB.read(contents, {type:"binary"});
    var wb = XLS.parse_xlscfb(cfb);
    var sheet = wb.Sheets[wb.SheetNames[0]];
    if(!sheet["!ref"]) return rows;
    var r = XLS.utils.decode_range(sheet["!ref"]);
    for(var R = r.s.r; R <= r.e.r; ++R) {
      var row = [];
      for(var C = r.s.c; C <= r.e.c; ++C) {
        var val = sheet[XLS.utils.encode_cell({c:C,r:R})];
        if(!val) { row.push(""); continue; }
        // force text rendered
        if (val.t != 's') {
          val.t = 's';
          delete val.XF;
          delete val.w;
        }
        txt = XLS.utils.format_cell(val);
        row.push(String(txt).replace(/\\n/g,"\n").replace(/\\t/g,"\t").replace(/\\\\/g,"\\").replace(/\\\"/g,"\"\"").trim());
      }
      rows.push(row);
    }
  }
  else { // CSV
    rows = CSV.parse(contents);
  }

  return rows;
}

// Show ht with data from hrlator.data object
function showHt() {
  $('div#hottable').handsontable({
    data: hrlator.data.rows,
    columns: hrlator.data.columns,
    cells: function (row, col, prop) {
      var cellProperties = {};
      cellProperties.renderer = hrlator.htCellRenderer;
      return cellProperties;
    },
    minSpareRows: 1,
    height: 600,
    colHeaders: hrlator.data.headers,
    rowHeaders: true,
    contextMenu: true,
    persistantState: true,
    manualColumnResize: true,
    afterSelectionEnd: hrlator.afterSelectionEnd,
    afterChange: hrlator.afterChange
  });

  hrlator.ht = $('div#hottable').handsontable('getInstance');
  hrlator.showStatus('', 0);

  enableDownload();
}

var supportHTM5download = null;
function dataDownload(filename, data) {

  var colDelim = ',';
  var rowDelim = '\r\n';
  var csvData = data.map(function (row) {
    return row.map(function (cell) {
      return cell ? '"' + cell.replace('"', '""') + '"' : '""';
    }).join(colDelim);
  }).join(rowDelim);
  var dataURL = 'data:text/plain,' + encodeURIComponent(csvData);

  // check if HTML5 a download attribute is working
  // Safari (Version 6.1.1) doesn't support
  var supportHTM5download = (typeof $('a')[0].download === 'string');

  if (supportHTM5download) {
    // use a.download to set file name
    var a = document.getElementById('dataURLdownloader');
    if (!a) {
      a = document.createElement('a');
      a.target = '_blank';
      a.id = 'dataURLdownloader';
      document.body.appendChild(a);
    }
    a.href = dataURL;
    a.download = filename;
    a.click();
  }
  else {
    window.open(dataURL);
  }

}

function enableDownload() {
  var hrType = hrlator.data.type;

  $('#' + hrType + '-upload').attr( 'disabled', true );
  $('#' + hrType + '-new').attr( 'disabled', true );
  $('#' + hrType + '-download').attr( 'disabled', false ).
    unbind().
    on('click', function(e) {
      var data = hrlator.data.rows.slice(0);
      data.unshift(hrlator.data.headers);
      dataDownload('hrlator-' + hrType + '.csv', data);
    });
  $('.log span.hr-download').unbind().on('click', function(e) {
    // get status clicked
    var re = /label-(\w*)/g;
    var res = re.exec(this.className);
    var status = res.pop(0);
    var stats = hrlator.dataStats();
    // show modal
    $('#hrlator-show-modal h4').text('Filter by ' + status + ' (' + stats.stats[status] + '/' + stats.total + ')');
    $('#hrlator-show-modal').modal();
    $('#hrlator-show-modal button.btn-primary').unbind().on('click', function() {
      // set data for download
      var data = hrlator.data.rows.filter(function (e) {return (e[hrlator.data.cols.valid]==status)});
      data.unshift(hrlator.data.headers);
      dataDownload('hrlator-' + hrType + '-' + status + '.csv', data);
      $('#hrlator-show-modal').modal('hide');
    });
  });
}

$(document).ready(function () {

  var t;

  var hrReady = hrlator.init();
  $('#hrlator-show .log .blink').text('Loading from ' + hrlator.serverUrlBase);
  hrReady
    .done(function () {

      var hrType = hrlator.data.type;

      $('.nav.navbar-nav li').removeClass('active');
      $('.nav.navbar-nav li.' + hrType).addClass('active');
      hrlatorStatus({log: {text: 'Ready'}});

      // create data
      $('#' + hrType + '-new').on('click', function(e) {
         dataNew(hrType);
         $('#data-sample').hide();
      });

      // upload data
      $('#csv-data').on('change', function () {

        //Retrieve the first (and only!) File from the FileList object
        var f = this.files[0];

        if (f) {
          hrlator.data.file = f;
          hrlator.data.filename = f.name
          $("h1 i").addClass('glyphicon-refresh-animate').show();
          hrlatorStatus({log: {text: 'Loading ' + hrlator.data.filename, class: 'blink'}});
          var r = new FileReader();
          r.onload = function(e) {

            // load data from file
            hrlatorStatus({log: {text: 'Load data from ' + hrlator.data.filename, class: 'blink'}});
            var rows = loadRows(e.target.result);

            // preprocess rows
            $('#data-sample').hide();
            hrlatorStatus({log: {text: 'Preprocessing data', class: 'blink'}});
            hrlator.preprocessData(rows);
            showHt();

            // validate data
            $.when(hrlator.validateData()).then(function () {
              showHt();
              enableDownload();
              $("h1 i").addClass('glyphicon-refresh-animate').hide();
            });
          }
          r.readAsBinaryString(f);
        } else {
          alert("Failed to load file");
        }

      });

      $('#' + hrType + '-upload').attr( "disabled", false );
      $('#' + hrType + '-new').attr( "disabled", false );
      $("h1 i").removeClass('glyphicon-refresh-animate').hide();

    })
  .fail(function () {
      $("h1 i").removeClass('glyphicon-refresh-animate').hide();
      alert("Uh uh, something bad happened, please contact the webmaster.");
    });

});
