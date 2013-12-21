
/**
 * Push data in handsontable
 */
var extension = {
    'handsontable':  function(step) {

        var shared = this; // pick up shared object from this, will be set internally by func.apply
        // the rows of data are in shared.data.rows
        // this code assumes shared.data.rows[0] is a header row, and later rows are numeric data
/*
        var newrows = [shared.data.rows[0].slice(0)]; // copy old header row
        var i,l,j,k,newrow,r0,r1;
        for(i=2,l=shared.data.rows.length;i<l;++i){
            newrow = [];
            r0 = shared.data.rows[i-1];
            r1 = shared.data.rows[i];
            for(j=0,k=r0.length;j<k;++j) newrow[j]=r1[j]-r0[j]
            newrows.push(newrow);
        }
        shared.data.rows = newrows;
*/
        var data = shared.data.rows;
        var colHeaders = shared.data.rows[0];
        data.shift();

        $('div#hottable').handsontable({
          data: data,
/*
          cells: function (row, col, prop) {
            var cellProperties = {};
//            cellProperties.renderer = rowRenderer.getRenderFunction(colDanger);
            return cellProperties;
          },
*/
          minSpareRows: 1,
          height: 600,
          colHeaders: colHeaders,
          contextMenu: true,
          manualColumnResize: true
        });

// console.log('zonkers:' + step);
        return shared.nextTask();
    }
};

CSV.extend(extension); // attach to list of known middleware

$(document).ready(function () {
  CSV.begin('#csvfile').
    call( function(){ alert("pre handsontable") }).
    handsontable('read').
    call( function(){ alert("post handsontable") }).
    appendCol('valid',
      function(i, row, shared) {
        console.log("ROW: " + i);
        console.log(row);
        return 'succes';
      },
      false).
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
