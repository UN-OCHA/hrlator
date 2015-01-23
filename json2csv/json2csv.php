<?php

if (!isset($_GET['api_path'])) {
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>Convert HR.info API to CSV</title>
	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css">
</head>
<body>
	<h1>Convert HR.info API to CSV files</h1>
	<p>This utility allows you to convert any data returned by the Humanitarianresponse.info API into CSV files. Just enter the path in the text input below and click on "Generate File".</p>
        <form method="GET">
	  <div class="form-group">
	    <label for="api_path">API path</label>
	    <input type="text" class="form-control" id="api_path" name="api_path" placeholder="Enter path to API" aria-describedby="helpBlock">
	    <span id="helpBlock" class="help-block">Enter the path to the API that you want to convert to CSV. For example, if you want to convert global clusters, enter "/api/v1.0/global_clusters" (make sure you start with a /).</span>
	  </div>
	  <input type="submit" value="Generate File" />
        </form>
</body>
</html>
<?php
}
else {
  // Download json in an array
  $path = 'http://www.humanitarianresponse.info' . $_GET['api_path'];
  $raw = file_get_contents($path);
  $data = json_decode($raw);
  $api_data = $data->data;
  while (isset($data->next)) {
    $raw = file_get_contents($data->next->href);
    $data = json_decode($raw);
    foreach ($data->data as $item) {
      $api_data[] = $item;
    }
  }
  // Set the headers we need for this to work
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename=data.csv');
  $out = fopen('php://output', 'w');
  $first_item = $api_data[0];
  $headers = array_keys((array)$first_item);
  fputcsv($out, $headers);
  foreach ($api_data as $line) {
    $array_line = (array)$line;
    foreach ($array_line as &$item) {
      $item = json2csv_get_item($item);
    }
    fputcsv($out, $array_line);
  }
  fclose($out);
}

function json2csv_get_item($item) {
  if (gettype($item) == 'object') {
    return $item->label;
  }
  elseif (gettype($item) == 'array') {
    $tmp = '[';
    $first = TRUE;
    foreach ($item as $item_item) {
      if ($first != TRUE) {
        $tmp .= ',';
      }
      else {
        $first = FALSE;
      }
      $tmp .= '"'.json2csv_get_item($item_item).'"';
    }
    $tmp .= ']';
    return $tmp;
  }
  else {
    return $item;
  }
}
  
