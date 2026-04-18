<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../config/database.php';

try {
    // 1. Fetch all users
    $userQuery = "SELECT id, username, status, points, is_admin FROM users ORDER BY id ASC";
    $userStmt = $conn->prepare($userQuery);
    $userStmt->execute();
    $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch all items (Marketplace + Bidding)
    $itemQuery = "SELECT i.*, u.username as owner_name
                  FROM items i
                  JOIN users u ON i.user_id = u.id
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
