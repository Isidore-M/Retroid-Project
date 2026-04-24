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

// Grab the user ID from the URL parameter (Angular is sending ?user_id=X)
$current_user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

try {
    // We select i.* but manually OVERRIDE the 'likes' field with the subquery count
    $query = "SELECT i.*, u.username,
              (SELECT COUNT(*) FROM item_likes WHERE item_id = i.id) as likes,
              (SELECT COUNT(*) FROM item_likes WHERE item_id = i.id AND user_id = :uid) as is_liked
              FROM items i
              JOIN users u ON i.user_id = u.id
              ORDER BY i.id DESC";

    $stmt = $conn->prepare($query);
    $stmt->execute(['uid' => $current_user_id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($items);
}


catch (PDOException $e) {
    if (ob_get_length()) ob_end_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>
