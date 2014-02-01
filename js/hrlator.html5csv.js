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

function validateContacts() {
  var shared = this;
  var data = shared.data;
  var rows = data.rows;
  var validationRows = [];
  var rowsValidated = 1;
  var deferred = $.Deferred();

  var timer = setInterval(function() {
    shared.ht.render();
    var stats = hrlator.dataStats();
    var message = stats.message;
    hrlatorStatus(message);
  }, 300);

  for (var i=1; i < rows.length; i++) {
    validationRows.push(hrlator.data.validateRow(rows[i]));
  }

  $.when.apply($, validationRows).done(function () {
    clearInterval(timer);
    deferred.resolve();
  });

  return deferred.promise();
}

function validateActivities() {
  var shared = this;
  var data = shared.data;
  var rows = data.rows;

  var rowToValidate = shared.rowToValidate;

  if (rowToValidate < rows.length) {
    row = rows[rowToValidate];
    if (row.join('').length > 0) {
      row[hrlator.data.cols.valid] = 'validating';
      shared.ht.render();
      hrlator.data.validateRow(row);
    }
    hrlator.showStatus('Validating ' + shared.rowToValidate + '/' + rows.length, (shared.rowToValidate * 100 /rows.length));
    shared.rowToValidate++;
    window.setTimeout((function(caller) { return function() { caller.validate(); } })(shared), 50);
  }
  else {
    hrlator.showStatus('', 0);
    shared.ht.render();
    return shared.nextTask();
  }
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
      validateRow: hrlator.validateContactsRow
    }

    // set validation function
    shared.validate = validateContacts;

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
      validateRow: hrlator.validateActivitiesRow
    }

    hrlator.showStatus('', 0);

    // set validation function
    shared.validate = validateActivities;

    $("h1 i").removeClass('glyphicon-refresh-animate').hide();
    return shared.nextTask();
  },

  // validate data
  'validateTable': function() {
    $("h1 i").addClass('glyphicon-refresh-animate').show();
    hrlatorStatus({log: {text: 'validating'}});

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    // hic sunt leones
    shared.rowToValidate = 1;
    $.when(shared.validate())
      .always(function() {
        var stats = hrlator.dataStats();
        var message = stats.message;
        message.log.text = 'Validation completed - ' + message.log.text;
        hrlatorStatus(message);

        $("h1 i").removeClass('glyphicon-refresh-animate').hide();
        return shared.nextTask();
      });
  },

  // validate data
  'validateContacts': function() {
console.log('validateContacts: ' + template);
    var shared = this; // pick up shared object from this, will be set internally by func.apply
    hrlator.showStatus('Validating', 0);
    // hic sunt leones
    shared.rowToValidate = 1;
    shared.validate();
  },

  // validate data
  'validateActivities': function() {
    var shared = this; // pick up shared object from this, will be set internally by func.apply
    hrlator.showStatus('Validating', 0);
    // hic sunt leones
    shared.rowToValidate = 1;
    shared.validate();
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

CSV.extend(extension); // attach to list of known middleware

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
    afterSelectionEnd: hrlator.afterSelectionEnd, //afterSelectionEnd,
    afterChange: hrlator.afterChange
  });

  hrlator.ht = $('div#hottable').handsontable('getInstance');
  hrlator.showStatus('', 0);

  enableDownload();
}

function enableDownload() {
  var hrType = hrlator.data.type;

  $('#' + hrType + '-upload').attr( 'disabled', true );
  $('#' + hrType + '-new').attr( 'disabled', true );
  $('#' + hrType + '-download').attr( 'disabled', false ).
    on('click', function(e) {
      var data = hrlator.data.rows.slice(0);
      data.unshift(hrlator.data.headers);
      CSV.begin(data).download('hrlator-' + hrType + '.csv').go();
    });
}

$(document).ready(function () {

  var t;

  var hrReady = hrlator.init();
  hrReady
    .done(function () {

      var hrType = hrlator.data.type;

      $('.nav.navbar-nav li').removeClass('active');
      $('.nav.navbar-nav li.' + hrType).addClass('active');
      hrlatorStatus({log: {text: 'ready'}});

      // create data
      $('#' + hrType + '-new').on('click', function(e) {
         dataNew(hrType);
         $('#data-sample').hide();
      });

      // upload data
      if ('contacts' == hrType) { //contacts
        $('#csv-data').on('click', function () {
          CSV
            .begin('#csv-data')
            // init data & check columns
            .initContacts()
            // display data
            .handsontable('contacts')
            // data validation
            .validateTable()
            .go();
            // enable download
            enableDownload();
          $('#data-sample').hide();
        });
      }
      else if ('activities'  == hrType) { // activities
        $('#csv-data').on('click', function () {
          CSV.
            begin('#csv-data').
            call( function() {
              var d = new Date();
              t = d.getTime();
            }).
            // init data & check columns
            initActivities().
            // display data
            handsontable('activities').
            // data validation
            validateActivities().
            call( function() {
              var d = new Date();
              console.log( "Run time: " + (d.getTime() - t));
            }).
            go();
            // enable download
            enableDownload();
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
