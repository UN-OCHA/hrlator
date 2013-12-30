/**
 * CSV estensions
 * - validate
 * - handson //table
 */
function replace_separator(string) {
  string = string.replace(/[,\/]/g,';');
}

var extension = {

    // validate data
    'validate': function() {
        var shared = this; // pick up shared object from this, will be set internally by func.apply
console.log('validate');

        var headers = shared.data.rows[0];

        var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();

        // check validation columns
//        var validation = [];
        var col_email = headers.indexOf('Email');
        var col_phone = headers.indexOf('Telephones');
        var col_valid = headers.indexOf('valid')
        var col_comments = headers.indexOf('comments');

        // hic sunt leones
        var i, l;
        for(i=1, l=shared.data.rows.length; i<l; ++i) {

          // clear validation
          shared.data.validation[i] = [];

          // check email
          if(col_email >= 0 && shared.data.rows[i][col_email]) {
console.log("ROW: " + i + " - email: " + shared.data.rows[i][col_email]);
            // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
            if(!re.exec(shared.data.rows[i][col_email])) {
//              validation[col_email] = { valid: 'danger', comment: 'Email address is invalid'};
              shared.data.validation[i][col_email] = { valid: 'danger', comment: 'Email address is invalid'};
            }
          }

          // validate organization
          // 1 consult_dictionary
          // 2 organization_exists
          // 3 find_organization_by_acronym

          // validate cluster
          // 1 cluster_exists
          // 2 find_cluster

          // validate location
          // 1 find_location_by_name

          // validate phone
          // 1 format_phone
          if(col_phone >= 0 && shared.data.rows[i][col_phone]) {
            // cleanup numbers and split
            // phones = phones.replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '');
            phones = shared.data.rows[i][col_phone].
              replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '').
              split(";");
//console.log(phones);
            var phoneComments = [];
            var phoneValid = true;
            $.each(phones, function(j, phone) {
              phone = phone.trim();
              if(phone.length) {
//console.log("Phone " + j + ": " + phone);
                // @TODO remove hard coded reference to country
                var countryCode = "PH";
                var phoneParsed = phoneUtil.parse(phone, countryCode);
//console.log(phoneParsed);
                if(!phoneUtil.isValidNumber(phoneParsed)) {
                  phoneComments.push("Phone number " + phone + " is invalid");
                  phoneValid = false;
                }
              }
            });
            if(!phoneValid) {
              shared.data.validation[i][col_phone] = {valid: 'danger', comment: phoneComments.join('; ')};
            }
          }

          // validate first last name
          // 1 determine First name and last name from full name

          // contact exists in DB
          // 1 contact exists

          // final check
          var valid = 'success';
          var comments = [];
          for(var j in shared.data.validation[i]) {
            valid = ('danger' == shared.data.validation[i][j].valid) ? 'danger' : valid;
            comments.push(shared.data.validation[i][j].comment);
          }
          shared.data.rows[i][col_valid] = valid;
          shared.data.rows[i][col_comments] = comments.join('; ');

        }

        return shared.nextTask();
    },

    // render data in handsontable
    'handsontable':  function(step) {

        var shared = this; // pick up shared object from this, will be set internally by func.apply

        // check step
        if('init'==step) {
          shared.data.colHeaders = shared.data.rows[0];
          shared.data.validation = [];
        }

        // get data from html5csv
        var data = shared.data.rows.slice(0);
        data.shift();

        var rowRenderer = new hrlatorRenderer();
        var colHeaders = shared.data.colHeaders;
        var colDanger = 14;

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
          manualColumnResize: true
        });

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
  CSV.begin('#csvfile').

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
    call( function(){ alert("pre handsontable") }).

    // display data
    handsontable('init').

    // async validation
    validate().
/*
//    call( function(){ alert("post handsontable") }).
    call( function() {
      var shared = this;
      shared.data.rows[1][14] = "danger";
      var start = new Date().getSeconds();
      console.log('now: ' + start);
      sleep(3000);
      start = new Date().getSeconds();
      console.log("and now" + start);
    }).
*/
    // edit data
    handsontable('write').
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
