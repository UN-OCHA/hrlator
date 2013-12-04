<?php

class HRLatorDictionaryDB extends SQLite3
{
    function __construct()
    {
        $this->open('dictionary.sqlite');
    }
}

class HRLatorDictionary {
  
  protected $database = NULL;

  public function __construct() {
    //create or open the database
    $this->database = new HRLatorDictionaryDB();
    
    $query = "CREATE TABLE IF NOT EXISTS Dictionary ".
      "(Type TEXT, Initial TEXT, Replacement TEXT, PRIMARY KEY (Type, Initial, Replacement))";
      
    $this->database->exec($query);
  }
  
  public function add($type, $initial, $replacement) {
    $query = 'INSERT INTO Dictionary (Type, Initial, Replacement)' .
      'VALUES ("'.$type.'", "'.$initial.'", "'.$replacement.'"); ';
    $this->database->exec($query);
  }
  
  public function find($type, $initial) {
    $query = 'SELECT * FROM Dictionary WHERE Type = "'.$type.'" AND Initial = "'.$initial.'";';
    if($result = $this->database->query($query)) {
      $row = $result->fetchArray();
      return $row['Replacement'];
    }
    else {
      return "";
    }
  }
  
}
