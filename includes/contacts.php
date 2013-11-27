<?php

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

class HRContacts {

  protected $organizations = array();
  protected $clusters = array();
  protected $site_url = "https://philippines.humanitarianresponse.info/";
  
  // Load data with their acronyms
  function load_data($file, $fields) {
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

  function find_organization_by_acronym($acronym) {
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

  function organization_exists($name) {
    $organizations = $this->organizations;
    $return = FALSE;
    foreach ($organizations as $organization) {
      if (strcasecmp($organization['Name'], $name) == 0) {
        $return = TRUE;
        break;
      }
    }
    return $return;
  }

  function cluster_exists($name) {
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

  function find_cluster_by_similar_name($name) {
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

  function find_cluster_by_prefix($prefix) {
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

  function find_cluster($name) {
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

  function replace_separator($string) {
    $new_string = str_replace(",", ";", $string);
    $array = explode(";", $new_string);
    foreach ($array as &$element) {
      $element = trim($element);
    }
    $new_string = implode(";", $array);
    return $new_string;
  }

  function contact_exists($line) {
    $url = $this->site_url . "/operational-presence/xml?search_api_views_fulltext=".$line['Last name'];
    $xml = simplexml_load_file($url);
    $number = count($xml->search_api_index_user_profile);
    $matched = FALSE;
    if ($number > 0) {
      // See if we have a matching first name
      foreach ($xml->search_api_index_user_profile as $profile) {
        if ($profile->firstName == $line['First name']) {
          // Exact match
          $matched = $profile->profileId;
          break;
        }
      }
    }
    return $matched;
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
          $number = $phoneUtil->parse($tphone, "PH");
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

  function process($filename) {

    $this->organizations = $this->load_data($this->site_url.'organizations.xml', array('Name', 'Acronym'));

    $this->clusters = $this->load_data($this->site_url.'clusters.xml', array('Name', 'Prefix'));

    $csv = csv_to_array($filename);

    $initial_line = array_keys($csv[0]);

    foreach ($csv as &$line) {
      $line['Comments'] = "";
      
      // Organization
      $org = trim($line['Organization']);
      if (!$this->organization_exists($org)) {
        $name = $this->find_organization_by_acronym($org);
        if (!empty($name)) {
          $line['Organization'] = $name;
          $line['Comments'] .= "Organization found by acronym; ";
        }
        else {
          $line['Comments'] .= "Organization not found; ";
        }
      }
      
      // Clusters
      $line['Clusters'] = $this->replace_separator($line['Clusters']);
      $csv_clusters = $line['Clusters'];
      if (!empty($csv_clusters)) {
        if (!$this->cluster_exists($csv_clusters)) {
          if (strpos($csv_clusters, ";")) {
            $csv_clusters_array = explode(';', $csv_clusters);
            foreach ($csv_clusters_array as &$csv_cluster) {
              if (!$this->cluster_exists($csv_cluster)) {
                $cluster_name = $this->find_cluster($csv_cluster);
                if (!empty($cluster_name['Name'])) {
                  $line['Comments'] .= $cluster_name['Comments'];
                  $csv_cluster = $cluster_name['Name'];
                }
                else {
                  $line['Comments'] .= $cluster_name['Comments'];
                }
              }
              $line['Clusters'] = implode(";", $csv_clusters_array);
            }
          }
          else {
            $cluster_name = $this->find_cluster($csv_clusters);
            if (!empty($cluster_name['Name'])) {
              $line['Comments'] .= $cluster_name['Comments'];
              $line['Clusters'] = $cluster_name['Name'];
            }
            else {
              $line['Comments'] .= $cluster_name['Comments'];
            }
          }
        }
      }
      
      // Emails
      $line['Email'] = $this->replace_separator($line['Email']);
      
      // Telephones
      if (!empty($line['Telephones'])) {
        $telephones = $this->format_phone($line['Telephones']);
        $line['Comments'] .= $telephones['Comments'];
        $line['Telephones'] = $telephones['Phone'];
      }
      
      // Trim last name and first name
      $line['First name'] = trim($line['First name']);
      $line['Last name'] = trim($line['Last name']);
      
      // Contact exists in the database ?
      $last_name = $line['Last name'];
      if (empty($last_name)) {
        $line['Comments'] .= "Last Name is empty; ";
      }
      else {
        $contact_exists = $this->contact_exists($line);
        $contact_exists ? $line['Comments'] .= "Contact already exists in the database. See ".$site_url."profile/".$contact_exists : $line['Comments'] .= "Contact does not exist in database; ";
      }
      
    }

   return $csv;
  }
}

