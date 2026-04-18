<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once dirname(__FILE__) . '/../config/database.php';

try {
    // 1. Fetch All Users
    $userQuery = "SELECT id, username, email, points, status, block_reason, is_admin FROM users ORDER BY id DESC";
    $userStmt = $conn->prepare($userQuery);
    $userStmt->execute();
    $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch All Items (Marketplace + Bidding Room)
    $itemQuery = "SELECT i.*, u.username as owner_name
                  FROM items i
                  LEFT JOIN users u ON i.user_id = u.id
                  ORDER BY i.id DESC";
    $itemStmt = $conn->prepare($itemQuery);
    $itemStmt->execute();
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => [
            "users" => $users,
            "items" => $items
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
