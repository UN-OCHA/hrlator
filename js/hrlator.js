/**
 * hrlator module pattern
 */
var hrlator = (function () {

  // handsontable
  var ht;
  var _ht_rowLastEdited = -1;
  var _ht_validated = false;

  var htContactsRenderer = function() {
    var highlightedRow = null;

    return {
      getRenderFunction: function() {
        return function(instance, td, row, col, prop, value, cellProperties) {
          Handsontable.TextRenderer.apply(this, arguments);
          tdcheck = instance.getDataAtCell(row, self.data.cols.valid);
          // add class to parent
          $(td).parent().removeClass().addClass("hrlator-" + tdcheck);
          return td;
        }
      }
    }
  };

  // internal variables harcoded
  var _servers = {
    'PH': {serverUrlBase: 'https://philippines.humanitarianresponse.info', countryCode: 'PH'},
//    'SS': {'serverUrlBase': 'southsudan.humanitarianresponse.info'}
  };

  var _serverUrlBase = 'philippines.humanitarianresponse.info';
  var _contactPath = '/operational-presence/xml?search_api_views_fulltext';
  var _countryCode = 'PH';

  var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
  var PNF = i18n.phonenumbers.PhoneNumberFormat;

  var _data;
  var _dictionary, _organizations, _clusters;

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

  // INIT hrlator object
  // - set the country
  // - load data
  var init = function() {

    var deferred = $.Deferred();

    // double check cookie (already done in server side indeed)
    var server = jQuery.cookie('hrlator-server');
    if (!_servers.server) {
      for(var _server in _servers) break;
      server = _server;
    }
    _serverUrlBase = _servers[server].serverUrlBase;
    _countryCode = _servers[server].countryCode;

    self.data.type = hrType;

    // TODO use premise/defer
    // get dictionary from hrlator
    var jqxhrDictionary = $.ajax({
    //  url: 'http://hrlator.humanitarianresponse.info/index.php',
      data: {'api': 'dictionary'},
      success: function(result) {
        self.dictionary = JSON.parse(result);
      },
    });

    // get cluster from server
    var jqxhrClusters = $.ajax({
      url: _serverUrlBase + '/clusters.xml',
      error: function() {
        alert('hrlator init ERROR loading from ' + _serverUrlBase + '/clusters.xml');
      },
      success: function(result) {
        // parse result with jQuery and extract relevant field
        var _clusters = $('taxonomy_term_data', result).map(function () {
          return {Name: $(this).find('Name').text(), Prefix: $(this).find('Prefix').text()};
        }).get();
        self.clusters = _clusters;
      },
    });

    // get organizations from server
    var jqxhrOrganizations = $.ajax({
      url: _serverUrlBase + '/organizations.xml',
      error: function() {
        alert('hrlator init ERROR loading from ' + _serverUrlBase + '/organizations.xml');
      },
      success: function(result) {
        // parse result with jQuery and extract relevant field
        var _organizations = $('taxonomy_term_data', result).map(function () {
          return {Name: $(this).find('Name').text(), Prefix: $(this).find('Acronym').text()};
        }).get();
        self.organizations = _organizations;
      },
    });

    $.when(jqxhrDictionary, jqxhrClusters, jqxhrOrganizations).done(function (jqxhrDictionary, jqxhrClusters, jqxhrOrganizations) {
      self.autoComplete.organization = self.organizations.
        map(function (element) { return element.Name } ).
        concat( self.dictionary.
          filter( function(element) { return (element.Type=='organizations'); }).
          map(function (element) { return element.Initial }));

      self.autoComplete.cluster = self.clusters.
        map(function (element) { return element.Name } ).
        concat( self.clusters.
          map(function (element) { return element.Prefix }));

      deferred.resolve();
    });

    return deferred.promise();

  }

  // new data
  var newData = function(txtType) {
    if (_schema[txtType]) {
      var schema = _schema[txtType];
      self.data.type = txtType;
      self.data.columns = [];
      self.data.validateRow = schema.validateRow;
      schema.columns.
        filter(function(item) { return item.out }).
        forEach(function(item, i) {
          self.data.headers[i] = item.header;
          self.data.cols[item.column] = i;
          self.data.rows[0][i] = "";
          if (self.autoComplete[item.column]) {
            self.data.columns[i] = {type: 'autocomplete', source: self.autoComplete[item.column],  strict: false};
          }
          else {
            self.data.columns[i] = {type: 'text'};
          }
        });
      return txtType;
    }
    else {
      return "";
    }
  }

  // status function
  var showStatus = function(txtStatus, width) {
    $('#hrlator-status span').text(txtStatus);
    $('#hrlator-status').width(width + '%').attr('aria-valuenow', width);
  }

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
      var i = 0;
      while (element = self.clusters[i]) {
        // check the list
        if (element.Name === cluster) {
          clusters.checked[j] = element.Name;
          break;
        }
        // check the prefix
        else if (element.Prefix === cluster) {
          clusters.checked[j] = element.Name;
          clusters.comments[j] = 'Cluster ' + cluster + ' (prefix) replaced by ' + element.Name;
          break;
        }
        // check prefix map
        else if (element.Prefix === prefix_map[cluster]) {
          clusters.checked[j] = element.Name;
          clusters.comments[j] = 'Cluster ' + cluster + ' (mapped to ' + prefix_map[cluster] + ') replaced by ' + element.Name;
          break;
        }
        // check for similarities
        else if (element.Name.indexOf(cluster)>=0) {
          clusters.checked[j] = element.Name;
          clusters.comments[j] = 'Cluster ' + cluster + ' replaced by ' + element.Name;
          // keep looping because this could ba a false positive
        }
        i++;
      }
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
    var i = 0;
    while (element = self.dictionary[i]) {
      if ('organizations' == element.Type && organization.data === element.Initial) {
        organization.checked = element.Replacement;
        organization.comment = 'Organization found in dictionary (' + organization.data + ')';
        break;
      }
      i++;
    }
    if (!organization.checked) {
      i = 0;
      while (element = self.organizations[i]) {
        // 2 organization_exists
        if (organization.data === element.Name) {
          organization.checked = element.Name;
          break;
        }
        // 3 find_organization_by_acronym
        else if (organization.data === element.Acronym) {
          organization.checked = element.Name;
          organization.comment = 'Organization found by acronym (' + organization.data + ')';
          break;
        }
        i++;
      }
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

  // Handsontable row validation (after user leave the edited row)
  var _validateAfterEdit = function () {
    row = self.data.rows[_ht_rowLastEdited];
    self.data.validateRow(row);
    self.ht.render();
  }

  var afterSelectionEnd = function (r, c, r2, c2) {
    if ((_ht_rowLastEdited >= 0) && !_ht_validated && r != _ht_rowLastEdited) {
      self.data.rows[_ht_rowLastEdited][self.data.cols.valid] = 'validating';
      self.ht.render();
      window.setTimeout(_validateAfterEdit(), 100);
    }
  }

  var afterChange = function(change, source) {
    if ('edit'==source) {
      _ht_rowLastEdited = change[0][0];
      self.data.rows[_ht_rowLastEdited][self.data.cols.valid] = 'edited';
      self.ht.render();
      _ht_validated = false;
    }
  };

  // HRLator Activities row validation
  var validateActivitiesRow = function(row) {

    var cols = self.data.cols;
//console.log(row);

    // check empty row
    if (row.join('').length ===0) {
      row[cols.comments] = 'empty';
      return;
    }

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
      $.each(self.dictionary, function(i, element) {
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
        $.each(self.dictionary, function(i, element) {
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

  // HRLator contacts row validation
  var validateContactsRow = function(row) {

    var cols = self.data.cols;
//console.log(row);

    // check empty row
    if (row.join('').length ===0) {
      row[cols.comments] = 'empty';
      return;
    }

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
        data: row[cols.phone].toString().
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

  // contacts headers
  var _schema = {
    contacts: { validateRow: validateContactsRow,
      columns: [
        {column: 'cluster',      out: true,  header: 'Clusters'},
        {column: 'salutation',   out: true,  header: 'Salutation'},
        {column: 'firstName',    out: true,  header: 'First name'},
        {column: 'lastName',     out: true,  header: 'Last name'},
        {column: 'fullName',     out: false, header: 'Full name'},
        {column: 'name',         out: false, header: 'Name'},
        {column: 'email',        out: true,  header: 'Email'},
        {column: 'phone',        out: true,  header: 'Telephones'},
        {column: 'organization', out: true,  header: 'Organization'},
        {column: 'orgType',      out: true,  header: 'Organization Type'},
        {column: 'jobTitle',     out: true,  header: 'Job Title'},
        {column: 'location',     out: true,  header: 'Location'},
        {column: 'coordHub',     out: true,  header: 'Coordination Hub'},
        {column: 'fundings',     out: true,  header: 'Fundings'},
        {column: 'themes',       out: true,  header: 'Theme(s)'},
        {column: 'emergencies',  out: true,  header: 'Emergencies'},
        {column: 'valid',        out: true,  header: 'valid'},
        {column: 'comments',     out: true,  header: 'comments'}
      ],
    },
    activities: { validateRow: validateActivitiesRow,
      columns: [
        {column: 'Organizations', out: true,  header: 'Organizations'},
        {column: 'OrgAcronym',    out: true,  header: 'Organizations Acronym'},
        {column: 'Clusters',      out: true,  header: 'Clusters'},
        {column: 'Locations',     out: true,  header: 'Locations'},
        {column: 'Title',         out: true,  header: 'Title'},
        {column: 'PrimBen',       out: true,  header: 'Primary Beneficiary'},
        {column: 'PrimBenNum',    out: true,  header: 'Number of primary beneficiaries'},
        {column: 'Status',        out: true,  header: 'Status'},
        {column: 'DateStart',     out: true,  header: 'Start Date'},
        {column: 'DateEnd',       out: true,  header: 'End Date'},
        {column: 'valid',         out: true,  header: 'valid'},
        {column: 'comments',      out: true,  header: 'comments'}
      ]
    }
  };

  // public
  var self = {
    // expose functions
    init: init,
    showStatus: showStatus,
    newData: newData,

    // Contacts
    validateContactsRow: validateContactsRow,
    htContactsRenderer: htContactsRenderer,

    // Activities
    validateActivitiesRow: validateActivitiesRow,
    htActivitieRenderer: htContactsRenderer,

    // handsontable live validation
    afterChange: afterChange,
    afterSelectionEnd: afterSelectionEnd,

    // expose and init data
    ht: ht,
    data: {
      rows: [ [] ],
      headers: [],
      cols: {},
      validateRow: ''
    },

    schema: _schema,
    serverUrlBase: _serverUrlBase,
    servers: _servers,
    contactPath: _contactPath,
    countryCode: _countryCode,
    dictionary: [],
    organizations: [],
    clusters: [],
    autoComplete: {
      cluster: [],
      organization: []
    }
  }
  return self;

})();

$(document).ready(function () {

  if (jQuery.cookie('hrlator-server')) {
    $('#settings-server select').val(jQuery.cookie('hrlator-server'));
  }

  $('#settings-server select').change(function() {
    var cc = $(this).val();
    if (hrlator.servers[cc]) {
      hrlator.countryCode = hrlator.servers[cc].countryCode;
      hrlator.serverUrlBase = hrlator.servers[cc].serverUrlBase;
      $.cookie('hrlator-server', hrlator.cc);
    }

  });

});

