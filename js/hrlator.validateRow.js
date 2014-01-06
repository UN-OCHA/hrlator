/**
 * HRLator contacts row validation
 */
function fancyLoop(i) {
  

}


function validateContactsRow() {
  var shared = this;
  var headers = shared.data.colHeaders;
  var data = shared.data;
  var rows = data.rows;
  var cols = data.cols;
  var rowToValidate = shared.rowToValidate;
  var hrlator = shared.hrlator;

  var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
  var PNF = i18n.phonenumbers.PhoneNumberFormat;

console.log('row: ' + shared.rowToValidate);
console.log(shared.data.rows[shared.rowToValidate]);

  if (rowToValidate < rows.length) {

    // clear validation
    data.validation[rowToValidate] = [];

    // check email
    // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    if (cols.email >= 0 && rows[rowToValidate][cols.email]) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
      if (!re.exec(rows[rowToValidate][cols.email])) {
        data.validation[rowToValidate][cols.email] = { valid: 'danger', comment: 'Email address is invalid'};
      }
    }

    // validate organization
    // 1 consult_dictionary
    // 2 organization_exists
    // 3 find_organization_by_acronym
    if (cols.organization >=0 && rows[rowToValidate][cols.organization]) {
      var organization = data.rows[rowToValidate][cols.organization].trim();
      var api_json = hrlator_api({'api': 'contact_organization', 'organization': organization});
      if (jsonResult) {
        data.validation[rowToValidate][cols.organization] = JSON.parse(jsonResult);
      }
    }

    // validate cluster
    // 1 cluster_exists
    // 2 find_cluster
    if (cols.cluster >= 0 && rows[rowToValidate][cols.cluster]) {
      var clusters = {
        'data':  rows[rowToValidate][cols.cluster].replace(/[,]/g,';').split(';'),
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
      rows[rowToValidate][cols.cluster] = clusters.checked.join('; ');
      data.validation[rowToValidate][cols.cluster] = {valid: clusters.valid, comment: clusters.comments.join('; ')};

    }

    // validate location
    // 1 find_location_by_name
    if (cols.location >= 0 && rows[rowToValidate][cols.location]) {
      locations = {
        'data':  rows[rowToValidate][cols.location].replace(/[,]/g,';').split(';'),
        'checked' : [],
        'valid': 'success',
        'comments': []
      };
      $.each(locations.data, function(j, location) {
        location = location.trim();
        if (location.length) {
          var api_json = hrlator_api({'api': 'location_by_name', 'location': location});
          if (jsonResult) {
            data.validation[rowToValidate][cols.location] = JSON.parse(jsonResult);
          }
        }
      });
    }

    // validate phone
    // 1 format_phone
    if (cols.phone >= 0 && rows[rowToValidate][cols.phone]) {
      // cleanup numbers and split
      // phones = phones.replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '');
      phones = {
        'data': rows[rowToValidate][cols.phone].
          replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '').
          split(";"),
        'checked' : [],
        'valid': 'success',
        'comments': []
      }
      $.each(phones.data, function(j, phone) {
        phone = phone.trim();
        if (phone.length) {

          var phoneParsed = phoneUtil.parse(phone, shared.hrlator.countryCode);
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
      rows[rowToValidate][cols.phone] = phones.checked.join(', ');
      data.validation[rowToValidate][cols.phone] = {valid: phones.valid, comment: phones.comments.join('; ')};
    }

    // validate first last name
    // 1 determine First name and last name from full name

    // contact exists in DB
    // 1 contact exists
    if (cols.lastName >= 0 && cols.firstName >= 0) {
      var lastName = data.rows[rowToValidate][cols.lastName];
//console.log('last name: ' + lastName);
      if (lastName) {
        var firstName = rows[rowToValidate][cols.firstName];
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
            data.validation[rowToValidate][cols.lastName] = JSON.parse(jsonResult);
          }
        }
        else {
          data.validation[rowToValidate][cols.firstName] = {valid: 'danger', comment: "First Name is empty"};
        }
      }
      else {
        data.validation[rowToValidate][cols.lastName] = {valid: 'danger', comment: "Last Name is empty"};
      }
    }


    // Ok, let's check the row
    var valid = 'success';
    var comments = [];
    for (var j in data.validation[rowToValidate]) {
      valid = ('danger' == data.validation[rowToValidate][j].valid) ? 'danger' : valid;
      if (data.validation[rowToValidate][j].comment) {
        comments.push(data.validation[rowToValidate][j].comment);
      }
    }
    rows[rowToValidate][cols.valid] = valid;
    rows[rowToValidate][cols.comments] = comments.join('; ');

    // OK let's do the next line
    shared.ht.setDataAtCell(rowToValidate-1, cols.valid, valid);
    shared.ht.render();
    shared.rowToValidate++;
    $(".htCore tbody tr:nth-child(" + shared.rowToValidate +")").toggleClass( "blink");

    // http://robinwinslow.co.uk/2012/03/13/javascript-closures-passing-an-object-context-to-a-callback-function/
    // Call the callback function after 1 second
    window.setTimeout((function(caller) { return function() { caller.validateContactsRow(); } })(shared), 100);
//    $(".htCore tbody tr:nth-child(" + (shared.rowToValidate-1) +")").toggleClass( "blink");
  }
  else {
    $(".htCore tbody tr:nth-child(" + shared.rowToValidate +")").toggleClass( "blink");
    return 'zut';
  }
}



