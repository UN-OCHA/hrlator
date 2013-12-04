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
      
      // Organizations
      $line['Organizations'] = $this->replace_separator($line['Organizations']);
      $line['Organizations'] = trim($line['Organizations']);
      $csv_organizations = $line['Organizations'];
      if (!empty($csv_organizations)) {
        $array_organizations = explode(';', $csv_organizations);
        foreach ($array_organizations as &$organization) {
          if (!$this->organization_exists($organization)) {
            $name = $this->find_organization_by_acronym($organization);
            if (!empty($name)) {
              $organization = $name;
              $line['Comments'] .= "Organization ".$organization." found by acronym; ";
            }
            else {
              $line['Comments'] .= "Organization ".$organization." not found; ";
              $line['valid'] = 'danger';
            }
          }
        }
        $line['Organizations'] = implode(';', $array_organizations);
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
      $line['Locations'] = $this->replace_separator($line['Locations']);
      $line['Locations'] = trim($line['Locations']);
      $csv_locations = $line['Locations'];
      if (!empty($csv_locations)) {
        $array_locations = explode(';', $csv_locations);
        foreach ($array_locations as $location) {
          if (!$this->find_location_by_pcode($location)) {
            $line['Comments'] .= "Location ".$location." not found; ";
            $line['valid'] = 'danger';
          }
        }
      }
      
      // Status
      $line['Status'] = trim($line['Status']);
      if (!empty($line['Status']) && !in_array($line['Status'], array('Planned', 'Ongoing', 'Completed'))) {
        $line['Comments'] .= 'Status not recognized; ';
        $line['valid'] = 'danger';
      }
      
      // Start date
      if (!empty($line['Start Date']) && strtotime($line['Start Date']) === FALSE) {
        $line['Comments'] .= 'Start date not recognized; ';
        $line['valid'] = 'danger';
      }
      
      // End date
      if (!empty($line['End Date']) && strtotime($line['End Date']) === FALSE) {
        $line['Comments'] .= 'End date not recognized; ';
        $line['valid'] = 'danger';
      }
      
    }

   return $csv;
  }
}

