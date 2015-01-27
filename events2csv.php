<?php

if (!isset($_GET['from'])) {

$last_monday = date('Y-m-d', strtotime('last monday'));
$next_monday = date('Y-m-d', strtotime('next monday'));
$op_data = get_api_data('http://www.humanitarianresponse.info/api/v1.0/operations');

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>Convert HR.info Events to CSV</title>
	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css">
        <link rel="stylesheet" href="datepicker/css/datepicker.css">
        <script type="text/javascript" src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
        <script type="text/javascript" src="datepicker/js/bootstrap-datepicker.js"></script>
	<script>
		$(function(){
			$('.datepicker').datepicker({
				'format':'yyyy-mm-dd',
			});
		});
	</script>
</head>
<body>
	<h1>Convert HR.info Events to CSV files</h1>
	<p>This utility allows you to convert events returned by the Humanitarianresponse.info API into CSV files. Just fill in the form below and click on "Generate File".</p>
        <form method="GET">
	  <div class="form-group">
            <label for="from">From:</label>
            <div class="input-append date" id="dp3" data-date="<?php echo $last_monday; ?>" data-date-format="yyyy-mm-dd">
              <input class="span2 datepicker" size="16" name="from" type="text" value="<?php echo $last_monday; ?>">
            </div>
            <label for="to">To:</label>
            <div class="input-append date" id="dp3" data-date="<?php echo $next_monday; ?>" data-date-format="yyyy-mm-dd">
              <input class="span2 datepicker" size="16" name="to" type="text" value="<?php echo $next_monday; ?>">
            </div>
            <label for="operation">Operation:</label>
            <div>
              <select name="operation">
                <?php
                foreach ($op_data as $operation) {
                  echo '<option value="'.$operation->id.'">'.$operation->label.'</option>';
                }
                ?>
              </select>
            </div>
	  </div>
	  <input type="submit" value="Generate File" />
        </form>
</body>
</html>
<?php
}
else {
  // Download json in an array
  $path = 'http://www.humanitarianresponse.info/api/v1.0/events?filter[operation]='.$_GET['operation'].'&filter[date][value][0]='.$_GET['from'].'&filter[date][value][1]='.$_GET['to'].'&filter[date][operator]="BETWEEN"';
  $api_data = get_api_data($path);
  // Set the headers we need for this to work
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename=events.csv');
  $out = fopen('php://output', 'w');
  $headers = array('Date', 'Hour', 'Description');
  fputcsv($out, $headers);
  $lines = array();
  foreach ($api_data as $line) {
    $events = json2csv_get_events($line, $_GET['from'], $_GET['to']);
    foreach ($events as $event) {
      $lines[] = $event;
    }
  }
  // Reorder by date
  usort($lines, 'compare_events');
  foreach($lines as $line) {
    fputcsv($out, $line);
  }
  fclose($out);
}

function json2csv_get_events($item, $from, $to) {
  $returns = array();
  $ftime = strtotime($from);
  $ttime = strtotime($to);
  foreach ($item->date as $date) {
    $dtime = strtotime($date->{'value'});
    if ($dtime >= $ftime && $dtime <= $ttime) {
      $explode = explode(' ', $date->{'value'});
      $returns[] = array($explode[0], $explode[1], $item->label);
    }
  }
  return $returns;
}

function compare_events($a, $b) {
  $atime = strtotime($a[0]);
  $btime = strtotime($b[0]);
  if ($atime == $btime) {
    $ahour = strtotime('1970-01-01 '.$a[1]);
    $bhour = strtotime('1970-01-01 '.$b[1]);
    if ($ahour == $bhour) {
      return 0;
    }
    return ($ahour < $bhour) ? -1 : 1;
  }
  return ($atime < $btime) ? -1 : 1;
}

function get_api_data($path) {
  $api_data = array();
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
  return $api_data;
}
