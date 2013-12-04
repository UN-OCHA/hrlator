<?php

require __DIR__ . '/vendor/autoload.php';
require __DIR__. '/includes/contacts.php';
require __DIR__. '/includes/activities.php';
require __DIR__. '/includes/dictionary.php';

function sanitize_template($template) {
  $return = 'contacts';
  $class = "HRLatorContacts";
  if (!empty($template)) {
    switch ($template) {
      case 'contacts':
        $return = 'contacts';
        $class = 'HRLatorContacts';
        break;
      case 'activities':
        $return = 'activities';
        $class = 'HRLatorActivities';
        break;
      case 'dictionary':
        $return = 'dictionary';
        break;
    }
  }
  return array('template' => $return, 'class' => $class);
}


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
  $template = sanitize_template("");
  if (isset($_GET['template'])) {
    $template = sanitize_template($_GET['template']);
  }
  $class = $template['class'];
  $data = new $class();
  $return = $data->process($_FILES['csvfile']['tmp_name']);
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

elseif (isset($_POST['type'])) {
  $dictionary = new HRLatorDictionary();
  $dictionary->add($_POST['type'], $_POST['initial'], $_POST['replacement']);
  $rows = $dictionary->findAll();
  $parameters['rows'] = $rows;
  echo $twig->render('dictionary.twig', $parameters);
}

else {
  $template = sanitize_template("");
  if (isset($_GET['template'])) {
    $template = sanitize_template($_GET['template']);
  }
  $parameters = array();
  if ($template['template'] == 'dictionary') {
    $dictionary = new HRLatorDictionary();
    $rows = $dictionary->findAll();
    $parameters['rows'] = $rows;
  }
  echo $twig->render($template['template'].'.twig', $parameters);
}
