/**
 * hrlator module pattern
 */
var hrlator = (function () {

  // handsontable
  var ht;

  // internal variables harcoded
  var _siteUrl = 'https://philippines.humanitarianresponse.info';
  var _contactUri = '/operational-presence/xml?search_api_views_fulltext';
  var _countryCode = 'PH';

  var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
  var PNF = i18n.phonenumbers.PhoneNumberFormat;

  var _data;
  var _dictionary;
  var _organizations;
  var _clusters;

  // cluster prefix map
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

  // regexp for email
  // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
  var reEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;

  var init = function() {
      self.dictionary = _dictionary = hr_dictionary;
      self.organizations = _organizations = hr_organizations;
      self.clusters = _clusters = hr_clusters;
  };

    // HRLator contacts row validation
  var validateContactsRow = function(row) {
    var rows = self.data.rows;
    var cols = self.data.cols;
console.log(row);

    // clear validation
    validation = [];

    // check email
    if (cols.email >= 0 && row[cols.email]) {
      // check for multiple emails (and raise an error in case)
      var countAt = row[cols.email].split("@").length - 1;
      // no @ in the line => error
      if (countAt == 0) {
        validation[cols.email] = { valid: 'danger', comment: 'Email address is invalid'};
      }
      // more than one address > error
      else if (countAt > 1) {
        validation[cols.email] = { valid: 'danger', comment: 'Only one email address is allowed'};
      }
      // regexp check
      else if (!reEmail.exec(row[cols.email])) {
        validation[cols.email] = { valid: 'danger', comment: 'Email address is invalid'};
      }
    }

    // validate organization
    // 1 consult_dictionary
    // 2 organization_exists
    // 3 find_organization_by_acronym
    if (cols.organization >=0 && row[cols.organization]) {
      var organization = {
         data: row[cols.organization].trim(),
         checked: '',
         valid: 'success',
         comment: ''
      }

      // 1 consult dictionary
      $.each(hr_dictionary, function(i, element) {
        if ('organizations' == element.Type && organization.data === element.Initial) {
           organization.checked = element.Replacement;
           organization.comment = 'Organization found in dictionary (' + organization.data + ')';
           return false;
        }
      });
      if (!organization.checked) {
        $.each(hr_organizations, function(i, element) {

          // 2 organization_exists
          if (organization.data === element.Name) {
            organization.checked = element.Name;
            return false;
          }

          // 3 find_organization_by_acronym
          else if (organization.data === element.Acronym) {
            organization.checked = element.Name;
            organization.comment = 'Organization found by acronym (' + organization.data + ')';
            return false;
          }
        });
      }
      if (!organization.checked) {
        organization.checked = organization.data;
        organization.comment = 'Organization not found';
        organization.valid = 'danger';
      }

      row[cols.organization] = organization.checked;
      validation[cols.organization] = {valid: organization.valid, comment: organization.comment};
    }

    // validate cluster
    // 1 cluster_exists
    // 2 find_cluster
    if (cols.cluster >= 0 && row[cols.cluster]) {
      var clusters = {
        data:  row[cols.cluster].replace(/[,]/g,';').split(';'),
        checked: [],
        valid: 'success',
        comments: []
      }
      $.each(clusters.data, function(j, cluster) {
        cluster = cluster.trim();
        $.each(hr_clusters, function(i, element) {
          // check the list
          if (element.Name === cluster) {
            clusters.checked[j] = element.Name;
            return false
          }
          // check the prefix
          else if (element.Prefix === cluster) {
            clusters.checked[j] = element.Name;
            clusters.comments[j] = 'Cluster ' + cluster + ' (prefix) replaced by ' + element.Name;
            return false;
          }
          // check prefix map
          else if (element.Prefix === prefix_map[cluster]) {
            clusters.checked[j] = element.Name;
            clusters.comments[j] = 'Cluster ' + cluster + ' (mapped to ' + prefix_map[cluster] + ') replaced by ' + element.Name;
            return false;
          }
          // check for similarities
          else if (element.Name.indexOf(cluster)>=0) {
            clusters.checked[j] = element.Name;
            clusters.comments[j] = 'Cluster ' + cluster + ' replaced by ' + element.Name;
            // keep looping because this could ba a false positive
          }

        });
        if (!clusters.checked[j]) {
           clusters.checked[j] = cluster;
           clusters.valid = 'danger';
           clusters.comments.push('Cluster ' + cluster + ' not found');
        }
      });
      row[cols.cluster] = clusters.checked.join('; ');
      validation[cols.cluster] = {valid: clusters.valid, comment: clusters.comments.join('; ')};

    }

    // validate location
    // 1 find_location_by_name
    if (cols.location >= 0 && row[cols.location]) {
      locations = {
        data:  row[cols.location].replace(/[,]/g,';').split(';'),
        checked: [],
        valid: 'success',
        comments: []
      };
      $.each(locations.data, function(j, location) {
        location = location.trim();
        if (location.length) {
          var api_json = hrlator_api({'api': 'location_by_name', 'location': location});
          if (jsonResult) {
            validation[cols.location] = JSON.parse(jsonResult);
          }
        }
      });
    }

    // validate phone
    // 1 format_phone
    if (cols.phone >= 0 && row[cols.phone]) {
      // cleanup numbers and split
      // phones = phones.replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '');
      phones = {
        data: row[cols.phone].
          replace(/[,\/]/g,';').replace(/-/g,' ').replace(/[^0-9+(); ]/, '').
          split(";"),
        checked: [],
        valid: 'success',
        comments: []
      }
      $.each(phones.data, function(j, phone) {
        phone = phone.trim();
        if (phone.length) {

          var phoneParsed = phoneUtil.parse(phone, hrlator.countryCode);
          if (!phoneUtil.isValidNumber(phoneParsed)) {
            phones.comments.push("Phone number " + phone + " is invalid");
            phones.checked.push(phone);
            phones.valid = 'danger';
          }
          else {
            phones.checked.push(phoneUtil.format(phoneParsed, PNF.INTERNATIONAL));
          }

        }
      });
      row[cols.phone] = phones.checked.join('; ');
      validation[cols.phone] = {valid: phones.valid, comment: phones.comments.join('; ')};
    }

    // validate first last name
    // 1 determine First name and last name from full name
    if (cols.fullName >= 0 || cols.name >= 0) {
      // check if already edited!
      if ((row[cols.lastName].length + row[cols.firstName].length) == 0) {
        var fullName = (cols.fullName >= 0) ? row[cols.fullName] : row[cols.name];
        var names = fullName.trim().split(' ');
        if (names.length != 2) {
          validation[cols.fullName] = {valid: 'danger', comment: 'Could not determine first name and last name from ' + names};
        }
        else {
          row[cols.firstName] = names[0];
          row[cols.lastName] = names[1];
          validation[cols.fullName] = {
            valid: 'success',
            comment: 'Separated ' + fullName + ' into First name: ' + names[0] + ' and Last name: ' + names[1]};
        }
      }
    }

    // contact exists in DB
    // 1 contact exists
    if (cols.lastName >= 0 && cols.firstName >= 0) {
      var lastName = row[cols.lastName];
//console.log('last name: ' + lastName);
      if (lastName) {
        var firstName = row[cols.firstName];
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
            validation[cols.lastName] = JSON.parse(jsonResult);
          }
        }
        else {
          validation[cols.firstName] = {valid: 'danger', comment: "First Name is empty"};
        }
      }
      else {
        validation[cols.lastName] = {valid: 'danger', comment: "Last Name is empty"};
      }
    }

    // Ok, let's check the row
    var valid = 'success';
    var comments = [];
    for (var j in validation) {
      valid = ('danger' == validation[j].valid) ? 'danger' : valid;
      if (validation[j].comment) {
        comments.push(validation[j].comment);
      }
    }
    row[cols.valid] = valid;
    row[cols.comments] = comments.join('; ');

    return valid;

  }

  // public
  var self = {
    // expose functions
    init: init,
    validateContactsRow: validateContactsRow,

    // expose data
    data: [],
    siteUrl: _siteUrl,
    contactUri: _contactUri,
    countryCode: _countryCode,
    dictionary: [],
    organizations: [],
    clusters: []
  }
  return self;

})();


