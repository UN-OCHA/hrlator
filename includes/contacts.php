<?php

require_once dirname(__FILE__)."/hrlator.php";

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

class HRLatorContacts extends HRLator {

  protected $organizations = array();
  protected $clusters = array();
  protected $site_url = "https://philippines.humanitarianresponse.info/";
  
  // Load data with their acronyms

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

  function process($filename) {

    $this->organizations = $this->load_data($this->site_url.'organizations.xml', array('Name', 'Acronym'));

    $this->clusters = $this->load_data($this->site_url.'clusters.xml', array('Name', 'Prefix'));

    $csv = csv_to_array($filename);

    $initial_line = array_keys($csv[0]);

    foreach ($csv as &$line) {
      $line['Comments'] = "";
      $line['valid'] = 'success';
      
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
          $line['valid'] = 'danger';
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
                  $line['valid'] = 'danger';
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
              $line['valid'] = 'danger';
            }
          }
        }
      }
      
      // Locations
      $line['Location'] = $this->replace_separator($line['Location']);
      $line['Location'] = trim($line['Location']);
      $csv_locations = $line['Location'];
      if (!empty($csv_locations)) {
        $array_locations = explode(';', $csv_locations);
        foreach ($array_locations as $location) {
          if (!$this->find_location_by_name($location)) {
            $line['Comments'] .= "Location ".$location." not found; ";
            $line['valid'] = 'danger';
          }
        }
      }
      
      // Emails
      $line['Email'] = $this->replace_separator($line['Email']);
      if (!empty($line['Email']) && !$this->check_email_address($line['Email'])) {
        $line['Comments'] .= "Email address is invalid; ";
        $line['valid'] = 'danger';
      }
      
      // Telephones
      if (!empty($line['Telephones'])) {
        $telephones = $this->format_phone($line['Telephones']);
        $line['Comments'] .= $telephones['Comments'];
        if (!empty($telephones['Comments'])) {
          $line['valid'] = 'danger';
        }
        $line['Telephones'] = $telephones['Phone'];
      }
      
      if (empty($line['First name']) && empty($line['Last name']) && !empty($line['Full name'])) {
        // Try to determine First name and last name from full name
        $line['Full name'] = trim($line['Full name']);
        $full_name = explode(' ', $line['Full name']);
        if (count($full_name) == 2) {
          $line['First name'] = $full_name[0];
          $line['Last name'] = $full_name[1];
          $line['Comments'] = "Separated ".$line['Full name']." into First name: ".$line['First name']." and Last name: ".$line['Last name']."; ";
          $line['valid'] = 'warning';
        }
        else {
          $line['Comments'] = "Could not determine first name and last name; ";
          $line['valid'] = 'danger';
        }
      }
      
      // Trim last name and first name
      $line['First name'] = trim($line['First name']);
      $line['Last name'] = trim($line['Last name']);
      
      // Contact exists in the database ?
      $last_name = $line['Last name'];
      if (empty($last_name)) {
        $line['Comments'] .= "Last Name is empty; ";
        $line['valid'] = 'danger';
      }
      else {
        $contact_exists = $this->contact_exists($line);
        if ($contact_exists) {
          $line['Comments'] .= "Contact already exists in the database. See ".$this->site_url."profile/".$contact_exists;
          $line['valid'] = 'danger';
        }
      }
    }

   return $csv;
  }
}

