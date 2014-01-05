<?php

require_once (__DIR__ . '/vendor/autoload.php');
require_once (__DIR__. '/includes/contacts.php');
require_once (__DIR__. '/includes/activities.php');
require_once (__DIR__. '/includes/dictionary.php');

function sanitize_template($template) {
  $return = 'home';
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

// API call
if (isset($_GET['api'])) {
  switch ($_GET['api']) {

    case 'load':
      // available uri: organizations, clusters
      $fields = array(
        'organizations' =>  array('Name', 'Acronym'),
        'clusters' => array('Name', 'Prefix')
      );
      if ( isset($fields[$_GET['uri']]) ) {
        $hrlator = new HRLatorContacts();
        $url = $hrlator->site_url . $_GET['uri'] . '.xml';
        $out = $hrlator->load_data($url, $fields[$_GET['uri']]);
      }
      else {
        $out = array('err' => 'load needs a valuid uri: ' . implode(', ', array_keys($fields)));
      }
      break;

    case 'location_by_name':
      if ( $location = $_GET['location'] ) {
        $hrlator = new HRLatorContacts();
        if ($hrlator->find_location_by_name($location)) {
          $out = array('valid' => 'success');
        }
        else {
          $out = array('valid' => 'danger', 'comment' => "Location $location not found");
        }
      }
      else {
        $out = array('err' => 'location by name require a location');
      }
      break;

    case 'dictionary':
      $dictionary = new HRLatorDictionary();
      $out = $dictionary->findAll();
      break;

    case 'contact_exist':
      if ( ($line['Last name'] = $_GET['last_name']) && ($line['First name'] = $_GET['first_name']) ) {
        $data = new HRLatorContacts();
        $contact_exists = $data->contact_exists($line);
        if ($contact_exists) {
          $out = array(
            'valid' => 'danger',
            'comment' => 'Contact already exists in the database. See ' . $data->site_url . 'profile/' . $contact_exists
          );
        }
        else {
          $out = array('valid' => 'success');
        }
      }
      else {
        $out = array('err' => 'last_name and first_name nowhere to be found');
      }
      break;

    case 'contact_organization':
      $out = array('valid' => 'success');
      if ($org = $_GET['organization']) {
        $data = new HRLatorContacts();
        $data->organizations = $data->load_data($data->site_url.'organizations.xml', array('Name', 'Acronym'));
error_log("ORG: $org");
        $org_dictionary = $data->consult_dictionary('organizations', $org);
        if (!empty($org_dictionary)) {
          $org = $org_dictionary;
        }
error_log("org_dictionary: $org_dictionary");
        if (!$data->organization_exists($org)) {
          $org_acronym = $data->find_organization_by_acronym($org);
          if (!empty($org_acronym)) {
            $out = array(
              'organization' => $org_acronym,
              'comment' => 'Organization found by acronym',
            );
          }
          else {
            $out = array(
              'valid' => 'danger',
              'comment' => 'Organization not found',
            );
          }
        }
      }
      break;

    default:
      $out = array('version' => '0.1');
  }
  echo json_encode($out);
}

// data loaded
elseif (isset($_FILES['csvfile'])) {
  $template = sanitize_template("");
  if (isset($_GET['template'])) {
    $template = sanitize_template($_GET['template']);
  }
  $class = $template['class'];
  $data = new $class();
  $return = $data->process($_FILES['csvfile']['tmp_name']);
  $initial_line = array_keys($return[0]);

  // save to file
  $fp = fopen('./data/'.$_FILES['csvfile']['name'], 'w');
  fputcsv($fp, $initial_line);

  foreach ($return as $cline) {
      fputcsv($fp, $cline);
  }
  fclose($fp);

  // render
  $data = json_encode($return);
  $colHeaders = json_encode($initial_line);
  $colDanger =  array_search('valid', $initial_line);;

  echo $twig->render('data.twig', array(
    'template' => $template['template'],
    'header' => $initial_line,
    'colHeaders' => $colHeaders,
    'rows' => $return,
    'data' => $data,
    'colDanger' => $colDanger,
    'file_link' => './data/'.$_FILES['csvfile']['name'],
  ));
}

// dictionary post
elseif (isset($_POST['type'])) {
  $dictionary = new HRLatorDictionary();
  if (isset($_POST['replacement'])) {
    $dictionary->add($_POST['type'], $_POST['initial'], $_POST['replacement']);
  }
  else {
    $dictionary->delete($_POST['type'], $_POST['initial']);
  }
error_log("ADD replacement: " . $_POST['type'] . " - " . $_POST['initial'] . " -" . $_POST['replacement']);
  $rows = $dictionary->findAll();
  $parameters['rows'] = $rows;
  echo $twig->render('dictionary.twig', $parameters);
}

// no POST/GET
else {
  $template = sanitize_template("");
error_log("template: ". $template['template']);
  if (isset($_GET['template'])) {
    $template = sanitize_template($_GET['template']);
  }
  $parameters = array();
  if ($template['template'] == 'dictionary') {
    $dictionary = new HRLatorDictionary();
    $rows = $dictionary->findAll();
    $parameters['rows'] = $rows;
  }
  elseif ($template['template'] == 'home') {
    $data = new HRLatorContacts();
    $parameters['organizations'] = json_encode($data->load_data($data->site_url.'organizations.xml', array('Name', 'Acronym')));
    $parameters['clusters'] = json_encode($data->load_data($data->site_url.'clusters.xml', array('Name', 'Prefix')));
  }

  echo $twig->render($template['template'].'.twig', $parameters);
}
