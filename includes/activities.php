<?php

require_once dirname(__FILE__)."/hrlator.php";

class HRLatorActivities extends HRLator {

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
    }

   return $csv;
  }
}

