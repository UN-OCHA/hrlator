<?php

require __DIR__ . '/vendor/autoload.php';
require __DIR__. '/includes/contacts.php';


/* Load Twig */
$twig = new Twig_Environment(new Twig_Loader_Filesystem(__DIR__ . '/templates/'));

$twig->addGlobal('baseurl', $_SERVER['SCRIPT_NAME']);

/* Parse installed.json to get versions */
$versionInfo = json_decode(file_get_contents(__DIR__ . '/vendor/composer/installed.json'), true);

$versionDetails = array();

foreach ($versionInfo as $r) {
    $versionDetails[$r['name']] = array(
        'version' => $r['version'],
        'actual' => $r['dist']['reference']
    );
}

$twig->addGlobal('version', $versionDetails);

$twig->addFunction('get_class', new Twig_Function_Function('get_class'));

if (isset($_FILES['csvfile'])) {
  $contacts = new HRLatorContacts();
  $return = $contacts->process($_FILES['csvfile']['tmp_name']);
  $initial_line = array_keys($return[0]);
  $fp = fopen('./data/'.$_FILES['csvfile']['name'], 'w');

  fputcsv($fp, $initial_line);

  foreach ($return as $cline) {
      fputcsv($fp, $cline);
  }

  fclose($fp);
  echo $twig->render('data.twig', array(
    'header' => $initial_line,
    'rows' => $return,
    'file_link' => './data/'.$_FILES['csvfile']['name'],
  ));
}
else {
  $template = 'contacts';
  if (isset($_GET['template'])) {
    switch ($_GET['template'])) {
      case 'contacts':
        $template = 'contacts';
        break;
      case 'activities':
        $template = 'activities';
        break;
    }
  }
  echo $twig->render($template.'.twig');
}
