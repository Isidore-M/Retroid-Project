<?php
// 1. The Fix: Force PHP to use your local timezone natively
date_default_timezone_set('America/Toronto');

$host = "localhost";
$db_name = "retroid_db";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 2. The Pro-Tip: Sync the MySQL database connection to match!
    // This forces the database to evaluate all timestamps in EDT
    $conn->exec("SET time_zone = '-04:00'");

} catch(PDOException $exception) {
    echo "Connection error: " . $exception->getMessage();
}
?>
