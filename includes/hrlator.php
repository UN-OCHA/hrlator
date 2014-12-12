<?php

require_once __DIR__.'/dictionary.php';
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
        while (($row = fgetcsv($handle, 10000, $delimiter)) !== FALSE)
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

abstract class HRLator {

  protected $dictionary = NULL;
  public $organizations = array();
  public $clusters = array();
  public $site_url = "http://dev1.humanitarianresponse.info/";
  protected $country = 'PH';
  protected $servers = array(
    'PH' => array('site_url' => 'http://philippines.humanitarianresponse.info'),
//    'SS' => array('site_url' => 'http://southsudan.humanitarianresponse.info')
  );

  public function __construct() {

    if (isset($_COOKIE['hrlator-server']) && array_key_exists($_COOKIE['hrlator-server'], $this->servers)) {
      $country = $_COOKIE['hrlator-server'];
    }
    else {
      reset($this->servers);
      $country = key($this->servers);
      $_COOKIE['hrlator-server'] = $country;
    }
    $this->set_country($country);

    $this->dictionary = new HRLatorDictionary();
  }

  public function consult_dictionary($type, $initial) {
    return $this->dictionary->find($type, $initial);
  }

  public function set_country($country) {
error_log("function set_country($country)");
    if ($country && isset($this->servers[$country])) {
      $this->site_url = $this->servers[$country]['site_url'] . '/';
      setcookie('hrlator-server', $country, time() + (86400* 7));
      $this->country = $country;
    }
    else {
      $country = $this->country;
    }
    return $this->servers[$country];
  }

  public function load_data($file, $fields) {
error_log("load_data: $file");
    $xml = simplexml_load_file($file);
    $final_data = array();
    foreach ($xml->taxonomy_term_data as $data) {
      $tmp = array();
      foreach ($fields as $field) {
        $tmp[$field] = (string)$data->{$field};
      }
       $final_data[] = $tmp;
    }
    return $final_data;
  }

  public function find_organization_by_acronym($acronym) {
    $organizations = $this->organizations;
    $name = '';
    foreach ($organizations as $organization) {
      if ($organization['Acronym'] == $acronym) {
        $name = $organization['Name'];
        break;
      }
    }
    return $name;
  }

  public function find_organization_by_name($name) {
    $organizations = $this->organizations;
    $return = FALSE;
    foreach ($organizations as $organization) {
      if (strcasecmp($organization['Name'], $name) == 0) {
        $return = $organization;
        break;
      }
    }
    return $return;
  }

  public function organization_exists($name) {
    if ($this->find_organization_by_name($name) !== FALSE) {
      return TRUE;
    }
    else {
      return FALSE;
    }
  }

  protected function cluster_exists($name) {
    $clusters = $this->clusters;
    $return = FALSE;
    foreach ($clusters as $cluster) {
      if ($cluster['Name'] == $name) {
        $return = TRUE;
        break;
      }
    }
    return $return;
  }

  protected function find_cluster_by_similar_name($name) {
    $clusters = $this->clusters;
    $final = "";
    foreach ($clusters as $cluster) {
      if (stripos($cluster['Name'], $name) !== FALSE) {
        $final = $cluster['Name'];
        break;
      }
    }
    return $final;
  }

  protected function find_cluster_by_prefix($prefix) {
    $clusters = $this->clusters;
    $other_prefixes = array(
      'CCCM' => 'CM',
      'WASH' => 'W',
      'NFI' => 'ES',
      'ETC' => 'ET',
      'FSAC' => 'FS',
      'Shelter' => 'ES',
      'Food' => 'FS',
      'EDU' => 'E',
    );
    $prefix = str_ireplace(array_keys($other_prefixes), array_values($other_prefixes), $prefix);
    $name = '';
    foreach ($clusters as $cluster) {
      if ($cluster['Prefix'] == $prefix) {
        $name = $cluster['Name'];
        break;
      }
    }
    return $name;
  }

  protected function find_cluster($name) {
    $cluster_name = '';
    $comments = '';
    if (!$this->cluster_exists($name)) {
      $cluster_name = $this->find_cluster_by_similar_name($name);
      if (empty($cluster_name)) {
        $cluster_name = $this->find_cluster_by_prefix($name);
        if (empty($cluster_name)) {
          $comments .= "Cluster $name not found; ";
        }
        else {
          $comments .= "Cluster $name replaced by $cluster_name; ";
        }
      }
      else {
        $comments .= "Cluster $name replaced by $cluster_name; ";
      }
    }
    else {
      $cluster_name = $name;
    }
    $return = array(
      'Name' => $cluster_name,
      'Comments' => $comments
    );
    return $return;
  }

  protected function replace_separator($string) {
    $new_string = str_replace(array(",","/"), ";", $string);
    $array = explode(";", $new_string);
    foreach ($array as &$element) {
      $element = trim($element);
    }
    $new_string = implode(";", $array);
    return $new_string;
  }
  
  function format_phone($phone) {
    $comments = "";
    $phoneUtil = \libphonenumber\PhoneNumberUtil::getInstance();
    $phone = $this->replace_separator($phone);
    $phone = str_replace('-', ' ', $phone);
    $phone = preg_replace('/[^0-9+(); ]/', '', $phone); 
    $phones = explode(';', $phone);
    foreach ($phones as &$tphone) {
      $tphone = trim($tphone);
      try {
          $number = $phoneUtil->parse($tphone, $this->country);
          $isValid = $phoneUtil->isValidNumber($number);
          if ($isValid) {
            $tphone = $phoneUtil->format($number, \libphonenumber\PhoneNumberFormat::E164);
          }
          else {
            $comments .= "Phone number $tphone is invalid; ";
          }
      } catch (\libphonenumber\NumberParseException $e) {
          $comments .= "Could not recognize phone number ".$tphone."; ";
      }
    }
    $phone = implode(';', $phones);
    $return = array(
      'Comments' => $comments,
      'Phone' => $phone,
    );
    return $return;
  }
  
  function check_email_address($email) {
    // First, we check that there's one @ symbol, 
    // and that the lengths are right.
    if (!ereg("^[^@]{1,64}@[^@]{1,255}$", $email)) {
      // Email invalid because wrong number of characters 
      // in one section or wrong number of @ symbols.
      return false;
    }
    // Split it into sections to make life easier
    $email_array = explode("@", $email);
    $local_array = explode(".", $email_array[0]);
    for ($i = 0; $i < sizeof($local_array); $i++) {
      if
  (!ereg("^(([A-Za-z0-9!#$%&'*+/=?^_`{|}~-][A-Za-z0-9!#$%&
  ↪'*+/=?^_`{|}~\.-]{0,63})|(\"[^(\\|\")]{0,62}\"))$",
  $local_array[$i])) {
        return false;
      }
    }
    // Check if domain is IP. If not, 
    // it should be valid domain name
    if (!ereg("^\[?[0-9\.]+\]?$", $email_array[1])) {
      $domain_array = explode(".", $email_array[1]);
      if (sizeof($domain_array) < 2) {
          return false; // Not enough parts to domain
      }
      for ($i = 0; $i < sizeof($domain_array); $i++) {
        if
  (!ereg("^(([A-Za-z0-9][A-Za-z0-9-]{0,61}[A-Za-z0-9])|
  ↪([A-Za-z0-9]+))$",
  $domain_array[$i])) {
          return false;
        }
      }
    }
    return true;
  }
  
  public function find_location_by_name($name) {
    $url = $this->site_url . "/locations/xml?name=".$name;
    $xml = simplexml_load_file($url);
    $number = count($xml->taxonomy_term_data);
    $matched = FALSE;
    if ($number > 0) {
      // See if we have a matching location name
      foreach ($xml->taxonomy_term_data as $location) {
        if (strcasecmp($location->Name, $name) == 0) {
          // Exact match
          $matched = TRUE;
          break;
        }
      }
    }
    return $matched;
  }
  
  function find_location_by_pcode($pcode) {
    $url = $this->site_url . "/locations/xml?field_location_pcode_value=".$pcode;
    $xml = simplexml_load_file($url);
    $number = count($xml->taxonomy_term_data);
    $matched = FALSE;
    if ($number > 0) {
      // See if we have a matching location name
      foreach ($xml->taxonomy_term_data as $location) {
        if (strcasecmp($location->Pcode, $pcode) == 0) {
          // Exact match
          $matched = TRUE;
          break;
        }
      }
    }
    return $matched;
  }
}
