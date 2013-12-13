  function hrlatorRenderer(){
    var highlightedRow = null;

    return {
      getRenderFunction: function(dangerCol) {
        return function(instance, td, row, col, prop, value, cellProperties){
          Handsontable.TextRenderer.apply(this, arguments);

          tdcheck = instance.getDataAtCell(row, dangerCol);
          console.log("R" + row + "C" + col + " (dangerCol:" + dangerCol + "):" + col + ": " + tdcheck);

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

$(document).ready(function () {


});
