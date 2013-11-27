<?php

require __DIR__ . '/vendor/autoload.php';

/**
 * @link http://gist.github.com/385876
 */
function csv_to_array($filename='', $delimiter=',')
{
    if(!file_exists($filename) || !is_readable($filename))
        return FALSE;

    $header = NULL;
    $data = array();
    if (($handle = fopen($filename, 'r')) !== FALSE)
    {
        while (($row = fgetcsv($handle, 1000, $delimiter)) !== FALSE)
        {
            if(!$header)
                $header = $row;
            else
                $data[] = array_combine($header, $row);
        }
        fclose($handle);
    }
    return $data;
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
  var_dump(csv_to_array($_FILES['csvfile']['tmp_name']));
}
else {
  echo $twig->render('home.twig');
}
