/**
 * CSV estensions
 * - validate
 * - handson //table
 */
function hrlator_api(api_data) {
  $.ajax({
    data: api_data,
    success: function(result) {
      jsonResult = result;
    },
    async: false
  });
  return jsonResult;
}

function insertColumn(rows, col, colName, data) {
  data = typeof data !== 'string' ? '' : data;
  rows[0].splice(col, 0, colName);
  for (i=1; i<rows.length; i++) {
    rows[i].splice(col, 0, data);
  }
}

function removeColumn(rows, col) {
  rows[0].splice(col, 1);
  for (i=1; i<rows.length; i++) {
    rows[i].splice(col, 1);
  }
}

var extension = {

  // initContacts
  'initContacts': function() {

    $("h1 i").addClass('glyphicon-refresh-animate').show();

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    function getDataCols() {
      var header = shared.data.rows[0].slice(0).map(function(element) { return element.toLowerCase();} );
      return {
        firstName:    header.indexOf('first name'),
        lastName:     header.indexOf('last name'),
        fullName:     header.indexOf('full name'),
        name:         header.indexOf('name'),
        organization: header.indexOf('organization'),
        cluster:      header.indexOf('clusters'),
        email:        header.indexOf('email'),
        phone:        header.indexOf('telephones'),
        location:     header.indexOf('location'),
        valid:        header.indexOf('valid'),
        comments:     header.indexOf('comments')
      }
    }

    // cleanup first row
    var row = shared.data.rows[0];
    var i, l;
    for(i=0; i < row.length; i++) {
      row[i] = row[i].trim();
    }

    // remove empty rows
    shared.data.rows = shared.data.rows.filter( function(row, i) {
      return (row.join("").trim()) ? row : null; } );

    // get data columns
    shared.data.cols = getDataCols();

    // check columns
    // 1) name/full name vs. first/last name
    if (shared.data.cols.fullName >= 0) {
      if (shared.data.cols.firstName < 0) {
        insertColumn(shared.data.rows, shared.data.cols.fullName+1, 'First name');
        shared.data.cols = getDataCols();
      }
      if (shared.data.cols.lastName < 0) {
        insertColumn(shared.data.rows, shared.data.cols.firstName+1, 'Last name');
        shared.data.cols = getDataCols();
      }
    }
    else if (shared.data.cols.name >= 0) {
      if (shared.data.cols.firstName < 0) {
        insertColumn(shared.data.rows, shared.data.cols.name+1, 'First name');
        shared.data.cols = getDataCols();
      }
      if (shared.data.cols.lastName < 0) {
        insertColumn(shared.data.rows, shared.data.cols.firstName+1, 'Last name');
        shared.data.cols = getDataCols();
      }
    }

    // 2) valid
    if (shared.data.cols.valid >= 0) {
      removeColumn(shared.data.rows, shared.data.cols.valid);
    }
    insertColumn(shared.data.rows, shared.data.rows[0].length, 'valid', 'loaded');
    shared.data.cols = getDataCols();

    // 3) comments
    if (shared.data.cols.comments >= 0) {
      removeColumn(shared.data.rows, shared.data.cols.comments);
    }
    insertColumn(shared.data.rows, shared.data.rows[0].length, 'comments');
    shared.data.cols = getDataCols();

    // get headers
    shared.data.colHeaders = shared.data.rows[0];

    // push data in hrlator
    var data = shared.data.rows.slice(0);
    data.shift();
    hrlator.data = {
      type: 'contacts',
      rows: data,
      cols: shared.data.cols,
      headers: shared.data.rows[0],
      validateRow: hrlator.validateContactsRow,
      filename: $('#csv-data').val().split("\\").pop()
    }

    // set validation function
    //shared.validate = validateContacts;

    $("h1 i").removeClass('glyphicon-refresh-animate').hide();

    return shared.nextTask();
  },

  // initActivities
  'initActivities': function() {

    $("h1 i").addClass('glyphicon-refresh-animate').show();

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    function getDataCols() {
      var header = shared.data.rows[0].slice(0).map(function(element) { return element.toLowerCase();} );
      return {
        Organizations: header.indexOf('organizations'),
        OrgAcronym:    header.indexOf('organizations acronym'),
        Clusters:      header.indexOf('clusters'),
        Locations:     header.indexOf('locations'),
        Title:         header.indexOf('title'),
        PrimBen:       header.indexOf('primary beneficiary'),
        PrimBenNum:    header.indexOf('number of primary beneficiaries'),
        Status:        header.indexOf('status'),
        DateStart:     header.indexOf('start date'),
        DateEnd:       header.indexOf('end date'),
        valid:         header.indexOf('valid'),
        comments:      header.indexOf('comments')
      }
    }

    // cleanup first row
    var row = shared.data.rows[0];
    var i, l;
    for(i=0; i < row.length; i++) {
      row[i] = row[i].trim();
    }

    // remove empty rows
    shared.data.rows = shared.data.rows.filter( function(row, i) {
      return (row.join("").trim()) ? row : null; } );

    // get data columns
    shared.data.cols = getDataCols();

    // check columns
    // Acronym
    if (shared.data.cols.OrgAcronym < 0) {
      insertColumn(shared.data.rows, shared.data.cols.Organizations+1, 'Organizations Acronym');
    }

    // 2) valid
    if (shared.data.cols.valid >= 0) {
      removeColumn(shared.data.rows, shared.data.cols.valid);
    }
    insertColumn(shared.data.rows, shared.data.rows[0].length, 'valid');
    shared.data.cols = getDataCols();

    // 3) comments
    if (shared.data.cols.comments >= 0) {
      removeColumn(shared.data.rows, shared.data.cols.comments);
    }
    insertColumn(shared.data.rows, shared.data.rows[0].length, 'comments');
    shared.data.cols = getDataCols();

    // get headers
    shared.data.colHeaders = shared.data.rows[0];

    // push data in hrlator
    var data = shared.data.rows.slice(0);
    data.shift();
    hrlator.data = {
      type: 'activities',
      rows: data,
      cols: shared.data.cols,
      headers: shared.data.rows[0],
      validateRow: hrlator.validateActivitiesRow,
      filename: shared.data.meta.file.name
    }

    // set validation function
    //shared.validate = validateActivities;

    $("h1 i").removeClass('glyphicon-refresh-animate').hide();
    return shared.nextTask();
  },

  // validate data
  'validateTable': function() {

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    // hic sunt leones
    shared.rowToValidate = 1;

    var data = shared.data;
    var rows = data.rows;
    var validationRows = [];
    var deferred = $.Deferred();

    var timer = setInterval(function() {
      var stats = hrlator.dataStats();
      var message = stats.message;
      shared.ht.render();
      hrlatorStatus(message);
    }, 300);

    for (var i=1; i < rows.length; i++) {
      validationRows.push(hrlator.data.validateRow(rows[i]));
    }

    $("h1 i").addClass('glyphicon-refresh-animate').show();

    $.when.apply($, validationRows).done(function () {
      var stats = hrlator.dataStats();
      var message = stats.message;

      clearInterval(timer);
      message.log.text = 'Validation completed - ' + message.log.text;
      hrlatorStatus(message);

      $("h1 i").removeClass('glyphicon-refresh-animate').hide();
      return shared.nextTask();

    });
  },

  // render data in handsontable
  'handsontable':  function(template) {

    $("h1 i").addClass('glyphicon-refresh-animate').show();

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    var data = hrlator.data.rows;
    var rowRenderer = new hrlator.htContactsRenderer();
    var colHeaders = shared.data.colHeaders;

    if ('activities' == template) {
    }
    else {
    }

    $('div#hottable').handsontable({
      data: data,
      cells: function (row, col, prop) {
        var cellProperties = {};
        cellProperties.renderer = rowRenderer.getRenderFunction();
        return cellProperties;
      },
      minSpareRows: 1,
      height: 600,
      colHeaders: colHeaders,
      rowHeaders: true,
      contextMenu: true,
      persistantState: true,
      manualColumnResize: true,
      afterSelectionEnd: hrlator.afterSelectionEnd, //afterSelectionEnd,
      afterChange: hrlator.afterChange
    });

    hrlator.ht = shared.ht = $('div#hottable').handsontable('getInstance');
    hrlator.showStatus('', 0);

    $("h1 i").removeClass('glyphicon-refresh-animate').hide();

    return shared.nextTask();
  }
};

//CSV.extend(extension); // attach to list of known middleware

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

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

function dataDownload(filename, data) {

  var colDelim = ',';
  var rowDelim = '\r\n';
  var csvData = data.map(function (row) {
    return row.map(function (cell) {
      return cell ? '"' + cell.replace('"', '""') + '"' : '""';
    }).join(colDelim);
  }).join(rowDelim);

  var a = document.createElement('a');
  a.href = 'data:attachment/csv,'+encodeURIComponent(csvData);
  a.target = '_blank';
  a.id = 'dataURLdownloader';
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

}

function enableDownload() {
  var hrType = hrlator.data.type;

  $('#' + hrType + '-upload').attr( 'disabled', true );
  $('#' + hrType + '-new').attr( 'disabled', true );
  $('#' + hrType + '-download').attr( 'disabled', false ).
    on('click', function(e) {
      var data = hrlator.data.rows.slice(0);
      data.unshift(hrlator.data.headers);
      dataDownload('hrlator-' + hrType + '.csv', data);
      //CSV.begin(data).download('hrlator-' + hrType + '.csv').go();
    });
  $('.log span.hr-download').on('click', function(e) {
    // get status clicked
    var re = /label-(\w*)/g;
    var res = re.exec(this.className);
    var status = res.pop(0);
    var stats = hrlator.dataStats();
    // show modal
    $('#hrlator-show-modal h4').text('Filter by ' + status + ' (' + stats.stats[status] + '/' + stats.total + ')');
    $('#hrlator-show-modal').modal();
    $('#hrlator-show-modal button.btn-primary').on('click', function() {
      // set data for download
      var data = hrlator.data.rows.filter(function (e) {return (e[hrlator.data.cols.valid]==status)});
      data.unshift(hrlator.data.headers);
      dataDownload('hrlator-' + hrType + '.csv', data);
      // CSV.begin(data).download('hrlator-' + hrType + '-' + status + '.csv').go();
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
      if ('contacts' == hrType || 'activities'  == hrType) {
        $('#csv-data').on('change', function () {

          //Retrieve the first (and only!) File from the FileList object
          var f = this.files[0];

          if (f) {
            $("h1 i").addClass('glyphicon-refresh-animate').show();
            hrlatorStatus({log: {text: 'Loading ' + f.name, class: 'blink'}});
            var r = new FileReader();
            r.onload = function(e) {
              var contents = e.target.result;
              hrlatorStatus({log: {text: 'Load data from ' + f.name, class: 'blink'}});
              // loading file in rows
              if ('application/vnd.ms-excel' == f.type || f.name.match(/xls$/)) { // excel 97 file
                var cfb = XLS.CFB.read(contents, {type:"binary"});
                var wb = XLS.parse_xlscfb(cfb);
                var sheet = wb.Sheets[wb.SheetNames[0]];
                var rows = [];
                if(!sheet["!ref"]) return out;
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
              else {
                var rows = CSV.parse(contents);
              }

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
            //r.readAsText(f);
            r.readAsBinaryString(f);
          } else {
            alert("Failed to load file");
          }

        });
      }
      else if ('activitiesx'  == hrType) { // activities
        $('#csv-data').on('click', function () {
          CSV
            .begin('#csv-data')
            // init data & check columns
            .initActivities()
            // display data
            .handsontable('activities')
            // data validation
            .validateTable()
            .go(function(e,D) {
              if (e) {
                alert('Oops, an error!');
                console.log(e);
                return e;
              }
              else {
                // enable download
                enableDownload();
              }
            });
          $('#data-sample').hide();
      });
    }

    $('#' + hrType + '-upload').attr( "disabled", false );
    $('#' + hrType + '-new').attr( "disabled", false );
    $("h1 i").removeClass('glyphicon-refresh-animate').hide();

    })
  .fail(function () {
      $("h1 i").removeClass('glyphicon-refresh-animate').hide();
      alert("The answer is 42");
    });

});
