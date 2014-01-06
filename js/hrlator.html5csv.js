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
 */
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

var extension = {

    // validate data
    'validate': function() {
        var shared = this; // pick up shared object from this, will be set internally by func.apply
        var headers = shared.data.colHeaders;
        var data = shared.data;
        var rows = data.rows;
        var cols = data.cols;
        var hrlator = shared.hrlator;

        var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
        var PNF = i18n.phonenumbers.PhoneNumberFormat;

        // get data (async from the first phase ?)
//        var hr_organizations = JSON.parse(hrlator_api({'api': 'load', 'uri': 'organizations'}));
//        var hr_clusters = JSON.parse(hrlator_api({'api': 'load', 'uri': 'clusters'}));
//console.log(hr_organizations);
//console.log(hr_clusters);
/*
        // check validation columns
        var col_firstName = headers.indexOf('First name');
        var col_lastName = headers.indexOf('Last name');
        var col_organization = headers.indexOf('Organization');
        var col_cluster = headers.indexOf('Clusters');
        var col_email = headers.indexOf('Email');
        var col_phone = headers.indexOf('Telephones');
        var col_location = headers.indexOf('Location');
        var col_valid = headers.indexOf('valid')
        var col_comments = headers.indexOf('comments');
*/
        // hic sunt leones
        var i, l;
        data.validation = [];
        l = shared.data.rows.length;
        shared.rowToValidate = 1;

//        shared.validateRow();

/*
        for (i=1, l=shared.data.rows.length; i<l; ++i) {
console.log('ROW: ' + i);
console.log(shared.data.rows[i]);
        }
*/
//        return shared.nextTask();

        for (i=1, l=rows.length; i<l; ++i) {
console.log('ROW: ' + i);
console.log(rows[i]);
          // clear validation
          data.validation[i] = [];

          // check email
          // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
          if (cols.email >= 0 && rows[i][cols.email]) {
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
            if (!re.exec(rows[i][cols.email])) {
              data.validation[i][cols.email] = { valid: 'danger', comment: 'Email address is invalid'};
            }
          }

          // validate organization
          // 1 consult_dictionary
          // 2 organization_exists
          // 3 find_organization_by_acronym
          if (cols.organization >=0 && rows[i][cols.organization]) {
            var organization = data.rows[i][cols.organization].trim();
            var api_json = hrlator_api({'api': 'contact_organization', 'organization': organization});
            if (jsonResult) {
              data.validation[i][cols.organization] = JSON.parse(jsonResult);
            }
          }

          // validate cluster
          // 1 cluster_exists
          // 2 find_cluster
          if (cols.cluster >= 0 && rows[i][cols.cluster]) {
            var clusters = {
              'data':  rows[i][cols.cluster].replace(/[,]/g,';').split(';'),
              'checked' : [],
              'valid': 'success',
              'comments': []
            }
            $.each(clusters.data, function(j, cluster) {
              cluster = cluster.trim();
              //var findings = hr_clusters.filter( function (element) { return element.Name ? element.Name === cluster : null } );
              var findings = hr_clusters.filter( function (element) {
                var prefix_map = {
                  'CCCM': 'CM',
                  'WASH': 'W',
                  'NFI': 'ES',
                  'ETC': 'ET',
                  'FSAC': 'FS',
                  'Shelter': 'ES',
                  'Food': 'FS',
                  'EDU': 'E'
                };
                var out = null;
                element.comment = null;
                // check the list
                if (element.Name === cluster) {
                  out = element;
                }
                // check the prefix
                else if (element.Prefix === cluster) {
                  out = element;
                  out.comment = 'Cluster ' + cluster + ' (prefix) replaced by ' + element.Name;
                }
                // check prefix map
                else if (element.Prefix === prefix_map[cluster]) {
                  out = element;
                  out.comment = 'Cluster ' + cluster + ' (mapped to ' + prefix_map[cluster] + ') replaced by ' + element.Name;
                }
                return out;
              });

              if (findings.length == 1) {
                clusters.checked.push(findings[0].Name);
                if (findings[0].comment) {
                  clusters.comments.push(findings[0].comment);
                }
              }
              else {
                // final check for similarities
                var findings = hr_clusters.filter( function (element) {
                  var out = null;
                  element.comment = null;
                  // check similar name
                  if (element.Name.indexOf(cluster)>=0) {
                    out = element;
                    out.comment = 'Cluster ' + cluster + ' replaced by ' + element.Name;
                  }
                  return out;
                });
                if (findings.length == 1) {
                  clusters.checked.push(findings[0].Name);
                  if (findings[0].comment) {
                    clusters.comments.push(findings[0].comment);
                  }
                }
                else {
                  clusters.checked.push(cluster);
                  clusters.valid = 'danger';
                  clusters.comments.push('Cluster ' + cluster + ' not found');
                }
              }
            });
            rows[i][cols.cluster] = clusters.checked.join(', ');
            data.validation[i][cols.cluster] = {valid: clusters.valid, comment: clusters.comments.join('; ')};

          }

          // validate location
          // 1 find_location_by_name
          if (cols.location >= 0 && rows[i][cols.location]) {
            locations = {
              'data':  rows[i][cols.location].replace(/[,]/g,';').split(';'),
              'checked' : [],
              'valid': 'success',
              'comments': []
            };
            $.each(locations.data, function(j, location) {
              location = location.trim();
              if (location.length) {
                var api_json = hrlator_api({'api': 'location_by_name', 'location': location});
                if (jsonResult) {
                  data.validation[i][cols.location] = JSON.parse(jsonResult);
                }
              }
            });
console.log(locations);
          }

          // validate phone
          // 1 format_phone
          if (cols.phone >= 0 && rows[i][cols.phone]) {
            // cleanup numbers and split
            // phones = phones.replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '');
            phones = {
              'data': rows[i][cols.phone].
                replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '').
                split(";"),
              'checked' : [],
              'valid': 'success',
              'comments': []
            }
            $.each(phones.data, function(j, phone) {
              phone = phone.trim();
              if (phone.length) {

                // @TODO remove hard coded reference to country
                var countryCode = "PH";
                var phoneParsed = phoneUtil.parse(phone, countryCode);
                if (!phoneUtil.isValidNumber(phoneParsed)) {
                  phones.comments.push("Phone number " + phone + " is invalid");
                  phones.checked.push(phone);
                  phone.valid = 'danger';
                }
                else {
                  phones.checked.push(phoneUtil.format(phoneParsed, PNF.E164));
                }

              }
            });
            rows[i][cols.phone] = phones.checked.join(', ');
            data.validation[i][cols.phone] = {valid: phones.valid, comment: phones.comments.join('; ')};
          }

          // validate first last name
          // 1 determine First name and last name from full name

          // contact exists in DB
          // 1 contact exists
          if (cols.lastName >= 0 && cols.firstName >=0) {
            var lastName = data.rows[i][cols.lastName];
//console.log('last name: ' + lastName);
            if (lastName) {
              var firstName = rows[i][cols.firstName];
              if (firstName) {
//console.log('first name: ' + firstName);
                var api_data = {'api': 'contact_exist', 'last_name': lastName, 'first_name': firstName};
                $.ajax({
                  data: api_data,
                  success: function(result) {
                    jsonResult = result;
                  },
                  async: false
                });
                if (jsonResult) {
//console.log("contact API result: " + jsonResult);
                  data.validation[i][cols.lastName] = JSON.parse(jsonResult);
                }
              }
              else {
                data.validation[i][cols.firstName] = {valid: 'danger', comment: "First Name is empty"};
              }
            }
            else {
              data.validation[i][cols.lastName] = {valid: 'danger', comment: "Last Name is empty"};
            }
          }

          // final check
          var valid = 'success';
          var comments = [];
          for (var j in data.validation[i]) {
            valid = ('danger' == data.validation[i][j].valid) ? 'danger' : valid;
            if (data.validation[i][j].comment) {
              comments.push(data.validation[i][j].comment);
            }
          }
          rows[i][cols.valid] = valid;
          rows[i][cols.comments] = comments.join('; ');

          // show in ht?
          shared.ht.setDataAtCell(i, cols.valid, valid);
          // shared.ht.setDataAtCell(i, col_comments, shared.data.rows[i][col_comments]);
          window.setTimeout(shared.ht.render(), 10);

        }

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
            contactUri: "/operational-presence/xml?search_api_views_fulltext="
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
          shared.validateRow = validateRow;
        }

        // get data from html5csv
        // use a copy so we can safely remove the first line
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
