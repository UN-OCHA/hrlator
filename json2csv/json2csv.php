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
	<script src="http://code.jquery.com/jquery-1.11.0.min.js"></script>
	<script type="text/javascript" src="json2csv.js"></script>
</head>
<body>
	<h1>Convert HR.info API to CSV files</h1>
	<p>This utility allows you to convert any data returned by the Humanitarianresponse.info API into CSV files. Just enter the path in the text input below and click on "Generate File".</p>
	<div class="form-group">
		<label for="api_path">API path</label>
		<input type="text" class="form-control" id="api_path" placeholder="Enter path to API" aria-describedby="helpBlock">
		<span id="helpBlock" class="help-block">Enter the path to the API that you want to convert to CSV. For example, if you want to convert global clusters, enter "/api/v1.0/global_clusters" (make sure you start with a /).</span>
	</div>
	<button class="btn btn-default">Generate File</button>
</body>
</html>
<?php
}
else {
  // Download json in an array
  $path = 'http://www.humanitarianresponse.info' . $_GET['api_path'];
  $raw = file_get_contents($path);
  $data = json_decode($raw);
  print_r($data);
}

