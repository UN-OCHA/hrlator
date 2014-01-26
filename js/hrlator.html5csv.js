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
//  var cols = data.cols;
  var rowToValidate = shared.rowToValidate;

  if (rowToValidate < rows.length) {
    row = rows[rowToValidate];
    if (row.join('').length > 0) {
      row[hrlator.data.cols.valid] = 'validating';
      shared.ht.render();
      hrlator.data.validateRow(row);
    }
    hrlator.showStatus('Validating ' + shared.rowToValidate + '/' + rows.length, Math.round(shared.rowToValidate * 100 /rows.length));
    shared.rowToValidate++;
    window.setTimeout((function(caller) { return function() { caller.validate(); } })(shared), 100);
  }
  else {
    hrlator.showStatus('', 0);
    shared.ht.render();
    return shared.nextTask();
  }
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

function insertColumn(rows, col, colName) {
  rows[0].splice(col, 0, colName);
  for (i=1; i<rows.length; i++) {
    rows[i].splice(col, 0, '');
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
    var shared = this; // pick up shared object from this, will be set internally by func.apply

    function getDataCols() {
      return {
        firstName:    shared.data.rows[0].indexOf('First name'),
        lastName:     shared.data.rows[0].indexOf('Last name'),
        fullName:     shared.data.rows[0].indexOf('Full name'),
        name:         shared.data.rows[0].indexOf('Name'),
        organization: shared.data.rows[0].indexOf('Organization'),
        cluster:      shared.data.rows[0].indexOf('Clusters'),
        email:        shared.data.rows[0].indexOf('Email'),
        phone:        shared.data.rows[0].indexOf('Telephones'),
        location:     shared.data.rows[0].indexOf('Location'),
        valid:        shared.data.rows[0].indexOf('valid'),
        comments:     shared.data.rows[0].indexOf('comments')
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
      type: 'contacs',
      rows: data,
      cols: shared.data.cols,
      headers: shared.data.rows[0],
      validateRow: hrlator.validateContactsRow
    }

    // set validation function
    shared.validate = validateContacts;

    return shared.nextTask();
  },

  // initActivities
  'initActivities': function() {
    var shared = this; // pick up shared object from this, will be set internally by func.apply

    function getDataCols() {

      return {
        Organizations: shared.data.rows[0].indexOf('Organizations'),
        OrgAcronym:    shared.data.rows[0].indexOf('Organizations Acronym'),
        Clusters:      shared.data.rows[0].indexOf('Clusters'),
        Locations:     shared.data.rows[0].indexOf('Locations'),
        Title:         shared.data.rows[0].indexOf('Title'),
        PrimBen:       shared.data.rows[0].indexOf('Primary Beneficiary'),
        PrimBenNum:    shared.data.rows[0].indexOf('Number of primary beneficiaries'),
        Status:        shared.data.rows[0].indexOf('Status'),
        DateStart:     shared.data.rows[0].indexOf('Start Date'),
        DateEnd:       shared.data.rows[0].indexOf('End Date'),
        valid:         shared.data.rows[0].indexOf('valid'),
        comments:      shared.data.rows[0].indexOf('comments')
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

    return shared.nextTask();
  },

  // validate data
  'validateContacts': function() {
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

$(document).ready(function () {

  var t;

  hrlator.init();

  // Disable download button
//  $('#hrlator-download-csv').on('click', function(){ alert('Wait for validation to complete'); return false;});

  // create contacts
  $("#contacts-new").on('click', function(e) {

    // setup data
    hrlator.newData('contacts');
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

    $("#contacts-upload").attr( "disabled", true );
    $("#contacts-new").attr( "disabled", true );
    $("#contacts-download").attr( "disabled", false ).
      on('click', function(e) {
        var data = hrlator.data.rows.slice(0);
        data.unshift(hrlator.data.headers);
        CSV.begin(data).download("hrlator-contacts.csv").go();
      });
  });

  // upload contacts
  var csvContacts = CSV.begin('#csvContacts').

    call( function() {
      var d = new Date();
      t = d.getTime();
    }).

    // init data & check columns
    initContacts().

    // display data
    handsontable('contacts').

    // data validation
    validateContacts().

    call( function() {
      var d = new Date();
      console.log( "Run time: " + (d.getTime() - t));
    }).

    // edit data
//    handsontable('contacts').

    // enable download
    call( function() {
      $("#contacts-upload").attr( "disabled", true );
      $("#contacts-new").attr( "disabled", true );
      $("#contacts-download").attr( "disabled", false ).
        on('click', function(e) {
          var data = hrlator.data.rows.slice(0);
          data.unshift(hrlator.data.headers);
          CSV.begin(data).download("hrlator-contacts.csv").go();
        });
    }).
    go();

  $('#csvContacts').on('click', csvContacts);

  // activities
  var csvActivities = CSV.begin('#csvActivities').

    // init data & check columns
    initActivities().

    // display data
    handsontable('activities').

    // data validation
    validateActivities().

    call( function() {
      var d = new Date();
      t = d.getTime();
    }).
    call( function() {
      var d = new Date();
      console.log( "Run time: " + (d.getTime() - t));
    }).

    // enable download
    call( function() {
      var shared = this;
      $('#hrlator-download-csv').unbind().on('click', function(e) {
        e.preventDefault();
        var ht_data = shared.ht.getData().slice(0);
        ht_data.unshift(shared.data.colHeaders);

        CSV.begin(ht_data).download("hrlator-activities.csv").go();

        return false;
      });
    }).
    go();

  $('#csvActivities').on('clic', csvActivities);

});
