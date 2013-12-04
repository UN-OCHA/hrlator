<?php

class HRLatorDictionary {
  
  protected $database = NULL;

  public function __construct() {
    try {
      //create or open the database
      $this->database = new SQLiteDatabase('dictionary.sqlite', 0666, $error);
    }
    catch(Exception $e) 
    {
      die($error);
    }
    
    $query = "CREATE TABLE IF NOT EXISTS Dictionary ".
      "(Type TEXT, Initial TEXT, Replacement TEXT, PRIMARY KEY (Type, Initial, Replacement))";
      
    if(!$this->database->queryExec($query, $error)) {
      die($error);
    }
  }
  
  public function add($type, $initial, $replacement) {
    $query = 'INSERT INTO Dictionary (Type, Initial, Replacement)' .
      'VALUES ("'.$type.'", "'.$initial.'", "'.$replacement.'"); ';
    if(!$this->database->queryExec($query, $error)) {
      die($error);
    }
  }
  
  public function find($type, $initial) {
    $query = 'SELECT * FROM Dictionary WHERE Type = "'.$type.'" AND Initial = "'.$initial.'";';
    if($result = $database->query($query, SQLITE_BOTH, $error)) {
      $row = $result->fetch();
      return $row['Replacement'];
    }
    else {
      die($error);
    }
  }
  
}
