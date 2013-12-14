/**
 * Custom renderer
 */
function hrlatorRenderer(){
  var highlightedRow = null;

  return {
    getRenderFunction: function(dangerCol) {
      return function(instance, td, row, col, prop, value, cellProperties){
        Handsontable.TextRenderer.apply(this, arguments);

        tdcheck = instance.getDataAtCell(row, dangerCol);
//        console.log("R" + row + "C" + col + " (dangerCol:" + dangerCol + "):" + col + ": " + tdcheck);

        if("danger" == tdcheck) {
          td.style['background-color'] = 'pink';
        }
        else if("warning" == tdcheck) {
          td.style['background-color'] = 'yellow';
        }

        return td;
      }
    }
  }
}

/**
 * Export headers and data to CSV
 */
function hrlatorCSV(header, data) {

  // This is to avoid accidentally splitting the actual contents
  tmpColDelim = String.fromCharCode(11), // vertical tab character
  tmpRowDelim = String.fromCharCode(0), // null character

  // actual delimiter characters for CSV format
  colDelim = '","',
  rowDelim = '"\r\n"',

  csv =  '"' + header.join(colDelim) + rowDelim;
  csv = csv + data.map(function (rowObj, index) {
//console.log(rowObj);
      var rowArr = $.map(rowObj, function (value, key) { return value; });
//console.log(rowArr);
      return rowArr.map(function (colVal, jndex) {
          // escape double quotes
          var out = "";
          if (!!colVal) {
            out = colVal.toString();
          }
          return out;
      }).join(tmpColDelim);
  }).join(tmpRowDelim)
      .split(tmpRowDelim).join(rowDelim)
      .split(tmpColDelim).join(colDelim) + '"';

  console.log("CSV");
  console.log(csv);

  // Data URI
  // https://github.com/DrPaulBrewer/html5csv
  // http://stackoverflow.com/questions/17836273/export-javascript-data-to-csv-file-without-server-interaction
  var uri = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

  var a         = document.createElement('a');
  a.href        = 'data:attachment/csv,' + encodeURIComponent(csv);
  a.target      = '_blank';
  a.download    = 'contacts.csv';

  document.body.appendChild(a);
  a.click();


}


$(document).ready(function () {


});

