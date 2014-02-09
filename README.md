HRLator
======================

Translates data sources in HR standard CSV format.


# Requirements
Install Composer (http://getcomposer.org/doc/00-intro.md)

# Install dependencies
php composer.phar install

# Check Permission on data/
SQLite3 needs a writable file, chown or chmod the directory so that
either the database file and the parent directory are writeable by Apache

# JS Libraries
* Handsontable - http://handsontable.com/demo/ajax.html
* libphonenumber - http://code.google.com/p/libphonenumber
  Compiled http://stackoverflow.com/questions/18678031/how-to-host-the-google-libphonenumber-locally
* datajs - http://www.datejs.com
  debug version from http://code.google.com/p/datejs/
  [98cd4af] patched in return values
* prefixfree - http://leaverou.github.io/prefixfree
  add data-noprefix for remote css
* jquery cookies - https://github.com/carhartl/jquery-cookie
* csv.js - https://github.com/gkindel/CSV-JS
* xls.js - https://github.com/SheetJS/js-xls

* html5csv - https://github.com/DrPaulBrewer/html5csv

# TODO
* use cache for ajax requests
* check if ajaxQueue is needed (http://learn.jquery.com/effects/uses-of-queue-and-dequeue/)
