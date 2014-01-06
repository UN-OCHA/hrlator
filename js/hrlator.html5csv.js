/**
 * CSV estensions
 * - validate
 * - handson //table
 */
function replace_separator(string) {
  string = string.replace(/[,\/]/g,';');
}

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

/**
 * HRLator contacts row validation
 *
function validateRow() {
  var shared = this;
console.log('row: ' + shared.rowToValidate);
console.log(shared.data.rows[shared.rowToValidate]);

  shared.rowToValidate++;
  if (shared.rowToValidate < shared.data.rows.length) {
    // http://robinwinslow.co.uk/2012/03/13/javascript-closures-passing-an-object-context-to-a-callback-function/ 
    // Call the callback function after 1 second
    window.setTimeout((function(caller) { return function() { caller.validateRow(); } })(shared), 50);
  }
  else {
    return 'zut';
  }
}
*/

var extension = {

    // validate data
    'validate': function() {
        var shared = this; // pick up shared object from this, will be set internally by func.apply

        // hic sunt leones
        shared.data.validation = [];
        shared.rowToValidate = 1;

        // add blink effect
        // http://stackoverflow.com/questions/11578800/how-can-i-create-a-looping-fade-in-out-image-effect-using-css-3-transitions
        $(".htCore tbody tr:nth-child(" + shared.rowToValidate +")").toggleClass( "blink");
        shared.validateContactsRow();

        return shared.nextTask();

    },

    // render data in handsontable
    'handsontable':  function(step) {

        var shared = this; // pick up shared object from this, will be set internally by func.apply

        // check step
        if ('init'==step) {

          // @TODO hardcoded but should be moved
          shared.hrlator = {
            siteUrl: "https://philippines.humanitarianresponse.info",
            contactUri: "/operational-presence/xml?search_api_views_fulltext=",
            countryCode: "PH"
          }

          // get headers
          shared.data.colHeaders = shared.data.rows[0];

          // get data columns
          shared.data.cols = {
            firstName: shared.data.colHeaders.indexOf('First name'),
            lastName: shared.data.colHeaders.indexOf('Last name'),
            organization: shared.data.colHeaders.indexOf('Organization'),
            cluster: shared.data.colHeaders.indexOf('Clusters'),
            email: shared.data.colHeaders.indexOf('Email'),
            phone: shared.data.colHeaders.indexOf('Telephones'),
            location: shared.data.colHeaders.indexOf('Location'),
            valid: shared.data.colHeaders.indexOf('valid'),
            comments: shared.data.colHeaders.indexOf('comments')
          }

          // set validation function
          shared.validateContactsRow = validateContactsRow;
        }

        // get data from html5csv
        // use a copy so we can safely remove the first line
        var data = shared.data.rows.slice(0);
        data.shift();

        var rowRenderer = new hrlatorRenderer();
        var colHeaders = shared.data.colHeaders;
        var colDanger = shared.data.cols.valid;

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
        });
        shared.ht = $('div#hottable').handsontable('getInstance');

// console.log('zonkers:' + step);
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

  CSV.begin('#csvfile').

    call( function() {
      var d = new Date();
      t = d.getTime();
    }).

    // append columns
    appendCol('valid',
      function(i, row, shared) {
        return 'succes';
      },
      false).
    appendCol('comments',
      function(i, row, shared) {
        return '';
      },
      false).
//    call( function(){ alert("pre handsontable") }).

    // display data
    handsontable('init').

    // async validation
    validate().
/*
//    call( function(){ alert("post handsontable") }).
    call( function() {
      var shared = this;

      testd(10);


//      shared.data.rows[1][14] = "danger";
      var start = new Date().getSeconds();
      console.log('now: ' + start);
      sleep(3000);
      start = new Date().getSeconds();
      console.log("and now" + start);

    }).
*/
    call( function() {
      var d = new Date();
      console.log( "Run time: " + (d.getTime() - t));
    }).
    // edit data
    handsontable('edit').
    go();

/*
  $('#contacts-upload').on('click',
    function() {
      CSV.begin('#csvfile').table("table").go();
      return false;
    }
  );
*/
});
