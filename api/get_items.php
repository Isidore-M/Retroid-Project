<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include_once '../config/database.php';

// Fetch items ordered by likes for the "Most Popular" section
$query = "SELECT items.*, users.username FROM items
          JOIN users ON items.user_id = users.id
          ORDER BY items.likes DESC LIMIT 10";

$stmt = $conn->prepare($query);
$stmt->execute();
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($items);
