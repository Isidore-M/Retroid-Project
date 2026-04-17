<?php
// 1. Prevent hidden warnings from breaking the JSON
ob_start();

// 2. Strong CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle pre-flight checks from the browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit;
}

require_once dirname(__FILE__) . '/../config/database.php';

try {
    // 3. Fetch items and join with user table to get the username
    $query = "SELECT items.*, users.username
              FROM items
              JOIN users ON items.user_id = users.id
              ORDER BY items.id DESC"; // Newest items first

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Output clean JSON
    ob_end_clean();
    echo json_encode($items);

} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
