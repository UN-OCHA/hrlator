/**
 * hrlator module pattern
 */
var hrlator = (function () {

  // handsontable
  var ht;
  var _ht_rowLastEdited = null;
  var _ht_validated = false;

  var htContactsRenderer = function() {
    var highlightedRow = null;

    return {
      getRenderFunction: function(dangerCol) {
        return function(instance, td, row, col, prop, value, cellProperties) {
          Handsontable.TextRenderer.apply(this, arguments);
          tdcheck = instance.getDataAtCell(row, dangerCol);
          // add class to parent
          $(td).parent().removeClass().addClass("hrlator-" + tdcheck);
          return td;
        }
      }
    }
  };

  // status function
  var showStatus = function(txtStatus, width) {
    $('#hrlator-status span').text(txtStatus);
    $('#hrlator-status').width(width + '%').attr('aria-valuenow', width);
  }

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

  // default states
  var StatusDefaults = ['planned', 'ongoing', 'completed'];

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

  // validate cluster
  // 1 cluster_exists
  // 2 find_cluster
  function validateCluster(row, cols_cluster) {
    var clusters = {
      data:  row[cols_cluster].replace(/[,]/g,';').split(';'),
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
    row[cols_cluster] = clusters.checked.join('; ');

    return {valid: clusters.valid, comment: clusters.comments.join('; ')};

  }


  // regexp for email
  // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
  var reEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;

  // validate organization
  // 1 consult_dictionary
  // 2 organization_exists
  // 3 find_organization_by_acronym
  function validateOrganization(row, cols_organization) {

    var organization = {
       data: row[cols_organization].trim(),
       checked: '',
       valid: 'success',
       comment: ''
    }

    // 1 consult dictionary
    $.each(hr_dictionary, function(i, element) {
      if ('organizations' == element.Type && organization.data === element.Initial) {
         organization.checked = element.Replacement.toLowerCase();
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

    row[cols_organization] = organization.checked;

    return {valid: organization.valid, comment: organization.comment};
  }

  function validateDate(row, cols_date, colName) {

    var date = {
       data: row[cols_date].trim().replace(/\W/g,'/'),
       checked: '',
       valid: 'success',
       comment: ''
    }

    var countSep = date.data.split('/').length - 1;
    var dataParsed = Date.parse(date.data);

    if (dataParsed) {
      date.valid = 'alert';
      // date is OK
      if (countSep == 2) {
        date.checked = dataParsed.toString("yyyy/MM/dd");
        date.valid = 'success';
      }
      // date in the form '15/nov' or 'dec 2014'
      else if (countSep == 1) {
        if (!dataParsed.config.day) {
          date.checked = date.data;
          date.comment = colName + ' is incomplete';
        }
        else {
          date.checked = dataParsed.toString("yyyy/MM/dd");
          date.comment = colName + ' valid date parsed from "' + date.data + '"';
        }
      }
      // date in the form 'december'
      else {
        date.checked = date.data;
        date.comment = colName + ' is incomplete';
      }
    }
    else {
      date.valid = 'danger';
      date.checked = date.data;
      date.comment = colName + ' not recognized';
    }

    row[cols_date] = date.checked;
    return {valid: date.valid, comment: date.comment};

  }

  // INIT
  var init = function() {
      self.dictionary = _dictionary = hr_dictionary;
      self.organizations = _organizations = hr_organizations;
      self.clusters = _clusters = hr_clusters;
  };

  // activities row validation after editing
  var _validateActivitiesAfterEdit = function () {
    row = self.activities.rows[_ht_rowLastEdited];
    validateActivitiesRow(row);
    hrlator.ht.render();
  }

  var afterSelectionEndActivities = function (r, c, r2, c2) {
    if (_ht_rowLastEdited && !_ht_validated && r != _ht_rowLastEdited) {
      self.activities.rows[_ht_rowLastEdited][self.activities.cols.valid] = 'validating';
      self.ht.render();
      window.setTimeout(_validateActivitiesAfterEdit(), 100);
    }
  }

  var afterChangeActivities = function(change, source) {
    if ('edit'==source) {
      _ht_rowLastEdited = change[0][0];
      self.activities.rows[_ht_rowLastEdited][self.activities.cols.valid] = 'edited';
      self.ht.render();
      _ht_validated = false;
    }
  };

  // HRLator Activities row validation
  var validateActivitiesRow = function(row) {

    // check empty row
    if (row.join('').length ===0) {
      row[cols.comments] = 'empty';
      return;
    }

    var cols = self.activities.cols;
console.log(row);

    // clear validation
    validation = [];

    // validate organization
    if (cols.Organizations >=0 && row[cols.Organizations]) {
      validation[cols.Organizations] = validateOrganization(row, cols.Organizations);
    }

    // validate cluster
    if (cols.Clusters >= 0 && row[cols.Clusters]) {
      validation[cols.Clusters] = validateCluster(row, cols.Clusters);
    }

    // Primary Beneficiary
    if (cols.PrimBen >= 0 && row[cols.PrimBen].toString().trim()) {

      var PrimBen = {
        data: row[cols.PrimBen].toString().trim(),
        checked: '',
        valid: 'success',
        comment: ''
      }
      // default
      PrimBen.checked = PrimBen.data;

      // 1 consult dictionary
      $.each(hr_dictionary, function(i, element) {
        if ('population_types' == element.Type && PrimBen.data === element.Initial) {
           PrimBen.checked = element.Replacement;
           PrimBen.comment = 'Primary Beneficiary found in dictionary (' + PrimBen.data + ')';
           return false;
        }
      });

      //validation[cols.PrimBen] = {valid: 'success', comment: 'checked'};
      validation[cols.PrimBen] = {valid: PrimBen.valid, comment: PrimBen.comment};

    }

    // Status
    if (cols.Status >= 0 && row[cols.Status]) {
      var Status = {
        data: row[cols.Status].trim().toLowerCase(),
        checked: '',
        valid: 'success',
        comment: ''
      }

      if (StatusDefaults.indexOf(Status.data) >= 0) {
        Status.checked = Status.data;
      }
      else {
        $.each(hr_dictionary, function(i, element) {
          if ('activity_status' == element.Type && Status.data === element.Initial.toLowerCase()) {
            Status.checked = element.Replacement;
            return false
          }
        });
        if (!Status.checked) {
          Status.valid = 'danger';
          Status.checked = Status.data;
          Status.comment = 'Status not recognized';
        }
      }

      row[cols.Status] = Status.checked;
      validation[cols.Status] = {valid: Status.valid, comment: Status.comment};
    }

    // Date
    if (cols.DateStart >= 0 && row[cols.DateStart].trim()) {
      validation[cols.DateStart] = validateDate(row, cols.DateStart, 'Start date');
    }
    if (cols.DateEnd >= 0 && row[cols.DateEnd].trim()) {
      validation[cols.DateEnd] = validateDate(row, cols.DateEnd, 'End date');
    }

    // Ok, let's check the row
    var valid = 'success';
    var comments = [];
    for (var j in validation) {
      if (valid != 'danger') {
        valid = (validation[j].valid != 'success') ? validation[j].valid : valid;
      }
      if (validation[j].comment) {
        comments.push(validation[j].comment);
      }
    }
    row[cols.valid] = valid;
    row[cols.comments] = comments.join('; ');

    _ht_validated = true;

    return valid;
  }

  // contact row validation after editing
  var _validateContactsAfterEdit = function () {
    row = self.contacts.rows[_ht_rowLastEdited];
    validateContactsRow(row);
    hrlator.ht.render();
  }

  var afterSelectionEndContacts = function (r, c, r2, c2) {
    if (_ht_rowLastEdited && !_ht_validated && r != _ht_rowLastEdited) {
      self.contacts.rows[_ht_rowLastEdited][self.contacts.cols.valid] = 'validating';
      self.ht.render();
      window.setTimeout(_validateContactsAfterEdit(), 100);
    }
  }

  var afterChangeContacts = function(change, source) {
    if ('edit'==source) {
      _ht_rowLastEdited = change[0][0];
      self.contacts.rows[_ht_rowLastEdited][self.contacts.cols.valid] = 'edited';
      self.ht.render();
      _ht_validated = false;
    }
  };

  // HRLator contacts row validation
  var validateContactsRow = function(row) {

    // check empty row
    if (row.join('').length ===0) {
      row[cols.comments] = 'empty';
      return;
    }

    var cols = self.contacts.cols;
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
    if (cols.organization >=0 && row[cols.organization]) {
      validation[cols.organization] = validateOrganization(row, cols.organization);
    }

    // validate cluster
    if (cols.cluster >= 0 && row[cols.cluster]) {
      validation[cols.cluster] = validateCluster(row, cols.cluster);
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
          validation[cols.fullName] = {valid: 'danger', comment: 'Could not determine first name and last name from ' + fullName};
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
      if (lastName) {
        var firstName = row[cols.firstName];
        if (firstName) {
          var api_data = {'api': 'contact_exist', 'last_name': lastName, 'first_name': firstName};
          $.ajax({
            data: api_data,
            success: function(result) {
              jsonResult = result;
            },
            async: false
          });
          if (jsonResult) {
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

    _ht_validated = true;

    return valid;

  }

  // public
  var self = {
    // expose functions
    init: init,
    status: showStatus,

    validateContactsRow: validateContactsRow,
    afterChangeContacts: afterChangeContacts,
    afterSelectionEndContacts: afterSelectionEndContacts,
    htContactsRenderer: htContactsRenderer,

    validateActivitiesRow: validateActivitiesRow,
    afterChangeActivities: afterChangeActivities,
    afterSelectionEndActivities: afterSelectionEndActivities,
    htActivitieRenderer: htContactsRenderer,

    // expose data
    ht: ht,
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


