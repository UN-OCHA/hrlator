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

var extension = {

    // validate data
    'validate': function() {
        var shared = this; // pick up shared object from this, will be set internally by func.apply

        var headers = shared.data.rows[0];

        var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
        var PNF = i18n.phonenumbers.PhoneNumberFormat;

        // @TODO hardcoded but should be moved
        var siteUrl = "https://philippines.humanitarianresponse.info";
        var contactUri = "/operational-presence/xml?search_api_views_fulltext=";

        // get data (async from the first phase ?)
        var hr_organizations = JSON.parse(hrlator_api({'api': 'load', 'uri': 'organizations'}));
        var hr_clusters = JSON.parse(hrlator_api({'api': 'load', 'uri': 'clusters'}));
//console.log(hr_organizations);
//console.log(hr_clusters);

        // check validation columns
//        var validation = [];
        var col_firstName = headers.indexOf('First name');
        var col_lastName = headers.indexOf('Last name');
        var col_organization = headers.indexOf('Organization');
        var col_cluster = headers.indexOf('Clusters');
        var col_email = headers.indexOf('Email');
        var col_phone = headers.indexOf('Telephones');
        var col_valid = headers.indexOf('valid')
        var col_comments = headers.indexOf('comments');

        // hic sunt leones
        var i, l;
        for (i=1, l=shared.data.rows.length; i<l; ++i) {
//console.log('ROW: ' + i);
          // clear validation
          shared.data.validation[i] = [];

          // check email
          if (col_email >= 0 && shared.data.rows[i][col_email]) {
//console.log("check email: " + shared.data.rows[i][col_email]);
            // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
            if (!re.exec(shared.data.rows[i][col_email])) {
//              validation[col_email] = { valid: 'danger', comment: 'Email address is invalid'};
              shared.data.validation[i][col_email] = { valid: 'danger', comment: 'Email address is invalid'};
            }
          }

          // validate organization
          // 1 consult_dictionary
          // 2 organization_exists
          // 3 find_organization_by_acronym
          if (col_organization >=0 && shared.data.rows[i][col_organization]) {
            var organization = shared.data.rows[i][col_organization].trim();
            var api_json = hrlator_api({'api': 'contact_organization', 'organization': organization});
            if (jsonResult) {
              shared.data.validation[i][col_organization] = JSON.parse(jsonResult);
            }
          }

          // validate cluster
          // 1 cluster_exists
          // 2 find_cluster
          if (col_cluster >= 0 && shared.data.rows[i][col_cluster]) {
            var clusters = {
              'data':  shared.data.rows[i][col_cluster].replace(/[,]/g,';').split(';'),
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
            shared.data.rows[i][col_cluster] = clusters.checked.join(', ');
            shared.data.validation[i][col_cluster] = {valid: clusters.valid, comment: clusters.comments.join('; ')};

          }

          // validate location
          // 1 find_location_by_name

          // validate phone
          // 1 format_phone
          if (col_phone >= 0 && shared.data.rows[i][col_phone]) {
            // cleanup numbers and split
            // phones = phones.replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '');
            phones = {
              'data': shared.data.rows[i][col_phone].
                replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '').
                split(";"),
              'checked' : [],
              'valid': 'success',
              'comments': []
            }
            //var phonesChecked = [];
            //var phonesComments = [];
            //var phoneValid = true;
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
                  //var phoneE164 = phoneUtil.format(phoneParsed, PNF.E164);
                  //phones.checked.push(phoneE164);
                  phones.checked.push(phoneUtil.format(phoneParsed, PNF.E164));
                }

              }
            });
            shared.data.rows[i][col_phone] = phones.checked.join(', ');
            shared.data.validation[i][col_phone] = {valid: phones.valid, comment: phones.comments.join('; ')};
          }

          // validate first last name
          // 1 determine First name and last name from full name

          // contact exists in DB
          // 1 contact exists
          if (col_lastName >= 0 && col_firstName >=0) {
            var lastName = shared.data.rows[i][col_lastName];
//console.log('last name: ' + lastName);
            if (lastName) {
              var firstName = shared.data.rows[i][col_firstName];
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
                  shared.data.validation[i][col_lastName] = JSON.parse(jsonResult);
                }
              }
              else {
                shared.data.validation[i][col_firstName] = {valid: 'danger', comment: "First Name is empty"};
              }
            }
            else {
              shared.data.validation[i][col_lastName] = {valid: 'danger', comment: "Last Name is empty"};
            }
          }

          // final check
          var valid = 'success';
          var comments = [];
          for (var j in shared.data.validation[i]) {
            valid = ('danger' == shared.data.validation[i][j].valid) ? 'danger' : valid;
            if (shared.data.validation[i][j].comment) {
              comments.push(shared.data.validation[i][j].comment);
            }
          }
          shared.data.rows[i][col_valid] = valid;
          shared.data.rows[i][col_comments] = comments.join('; ');

          // show in ht?
          shared.ht.setDataAtCell(i, col_valid, valid);
          // shared.ht.setDataAtCell(i, col_comments, shared.data.rows[i][col_comments]);
          window.setTimeout(shared.ht.render, 10);

        }

        return shared.nextTask();
    },

    // render data in handsontable
    'handsontable':  function(step) {

        var shared = this; // pick up shared object from this, will be set internally by func.apply

        // check step
        if ('init'==step) {
          shared.data.colHeaders = shared.data.rows[0];
          shared.data.validation = [];
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
      shared.data.rows[1][14] = "danger";
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
