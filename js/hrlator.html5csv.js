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
      row[hrlator.contacts.cols.valid] = 'validating';
      shared.ht.render();
      hrlator.validateContactsRow(row);
    }
    shared.rowToValidate++;
    window.setTimeout((function(caller) { return function() { caller.validate(); } })(shared), 50);
  }
  else {
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
      row[hrlator.activities.cols.valid] = 'validating';
      shared.ht.render();
      hrlator.validateActivitiesRow(row);
    }
    shared.rowToValidate++;
    window.setTimeout((function(caller) { return function() { caller.validate(); } })(shared), 50);
  }
  else {
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
    hrlator.contacts = {
      rows: data,
      cols: shared.data.cols,
      headers: shared.data.rows[0]
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
    for(i=0; i < row.length; i++) {
      row[i] = row[i].trim();
    }

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
    hrlator.activities = {
      rows: data,
      cols: shared.data.cols,
      headers: shared.data.rows[0]
    }

    // set validation function
    shared.validate = validateActivities;

    return shared.nextTask();
  },

  // validate data
  'validateContacts': function() {
    var shared = this; // pick up shared object from this, will be set internally by func.apply
    // hic sunt leones
    shared.rowToValidate = 1;
    shared.validate();
  },

  // validate data
  'validateActivities': function() {
    var shared = this; // pick up shared object from this, will be set internally by func.apply
    // hic sunt leones
    shared.rowToValidate = 1;
    shared.validate();
  },

  // render data in handsontable
  'handsontable':  function(template) {

    var shared = this; // pick up shared object from this, will be set internally by func.apply

    if ('activities' == template) {
      var data = hrlator.activities.rows;

      var rowRenderer = new hrlator.htContactsRenderer();
      var colHeaders = shared.data.colHeaders;
      var colDanger = shared.data.cols.valid;

      var afterSelectionEnd = function () {}; //hrlator.afterSelectionEndContacts;
      var afterChange = function () {}; //hrlator.afterChangeContacts;

    }
    else {
      var data = hrlator.contacts.rows;

      var rowRenderer = new hrlator.htContactsRenderer();
      var colHeaders = shared.data.colHeaders;
      var colDanger = shared.data.cols.valid;

      var afterSelectionEnd = hrlator.afterSelectionEndContacts;
      var afterChange = hrlator.afterChangeContacts;
    }

    $('div#hottable').handsontable({
      data: data,
      cells: function (row, col, prop) {
        var cellProperties = {};
        cellProperties.renderer = rowRenderer.getRenderFunction(colDanger);
        return cellProperties;
      },
      minSpareRows: 1,
      height: 600,
      colHeaders: colHeaders,
      rowHeaders: true,
      contextMenu: true,
      persistantState: true,
      manualColumnResize: true,
      afterSelectionEnd: afterSelectionEnd,
      afterChange: afterChange,
    });
    hrlator.ht = shared.ht = $('div#hottable').handsontable('getInstance');

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
  $('#hrlator-download-csv').on('click', function(){ alert('Wait for validation to complete'); return false;});

  // contacts
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
    handsontable('contacts').

    // enable download
    call( function() {
      var shared = this;
      $('#hrlator-download-csv').unbind().on('click', function(e) {
        e.preventDefault();
        var ht_data = shared.ht.getData().slice(0);
        ht_data.unshift(shared.data.colHeaders);

        CSV.begin(ht_data).download("hrlator.csv").go();

        return false;
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
    go();

  $('#csvActivities').on('clic', csvActivities);

});
