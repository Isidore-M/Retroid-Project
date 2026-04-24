<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user_id = $_GET['user_id'] ?? null;

if ($user_id) {
    try {
        // 1. Fetch the 15 most recent notifications
        // We fetch a few extra to ensure the "pixel perfect" scroll looks full
        $query = "SELECT
                    id,
                    user_id,
                    sender_id,
                    item_id,
                    type,
                    message,
                    is_read,
                    created_at
                  FROM notifications
                  WHERE user_id = :uid
                  ORDER BY created_at DESC
                  LIMIT 15";

        $stmt = $conn->prepare($query);
        $stmt->execute(['uid' => $user_id]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Count unread notifications for the red badge
        $countQuery = "SELECT COUNT(*) as unread
                       FROM notifications
                       WHERE user_id = :uid AND is_read = 0";

        $cStmt = $conn->prepare($countQuery);
        $cStmt->execute(['uid' => $user_id]);
        $unreadResult = $cStmt->fetch(PDO::FETCH_ASSOC);

        // Ensure unread_count is an integer for the Angular *ngIf="unreadCount > 0"
        $unreadCount = isset($unreadResult['unread']) ? (int)$unreadResult['unread'] : 0;

        echo json_encode([
            "status" => "success",
            "notifications" => $notifications ? $notifications : [],
            "unread_count" => $unreadCount
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Vault access error: " . $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Identity required to fetch alerts."
    ]);
}
