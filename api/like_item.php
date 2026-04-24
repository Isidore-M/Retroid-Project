<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

require_once dirname(__FILE__) . '/../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->item_id) && !empty($data->user_id)) {
    $item_id = (int)$data->item_id;
    $user_id = (int)$data->user_id;

    // 1. Check current status
    $check = $conn->prepare("SELECT id FROM item_likes WHERE item_id = ? AND user_id = ?");
    $check->execute([$item_id, $user_id]);
    $alreadyLiked = $check->fetch();

    if ($alreadyLiked) {
        // UNLIKE
        $conn->prepare("DELETE FROM item_likes WHERE item_id = ? AND user_id = ?")->execute([$item_id, $user_id]);
        $conn->prepare("UPDATE items SET likes = GREATEST(0, likes - 1) WHERE id = ?")->execute([$item_id]);
        $status = "unliked";
    } else {
        // LIKE
        $conn->prepare("INSERT INTO item_likes (item_id, user_id) VALUES (?, ?)")->execute([$item_id, $user_id]);
        $conn->prepare("UPDATE items SET likes = likes + 1 WHERE id = ?")->execute([$item_id]);
        $status = "liked";

        // 2. Try Notification (wrapped in its own try-catch so it doesn't kill the Like)
        try {
            $itemQuery = $conn->prepare("SELECT user_id as owner_id, name FROM items WHERE id = ?");
            $itemQuery->execute([$item_id]);
            $item = $itemQuery->fetch(PDO::FETCH_ASSOC);

            $userQuery = $conn->prepare("SELECT username FROM users WHERE id = ?");
            $userQuery->execute([$user_id]);
            $liker = $userQuery->fetch(PDO::FETCH_ASSOC);

            if ($item && $liker && $item['owner_id'] != $user_id) {
                $msg = $liker['username'] . " liked your item: " . $item['name'];
                $notif = $conn->prepare("INSERT INTO notifications (user_id, sender_id, item_id, type, message, is_read) VALUES (?, ?, ?, 'like', ?, 0)");
                $notif->execute([$item['owner_id'], $user_id, $item_id, $msg]);
            }
        } catch (Exception $e) {
            // Silently fail notification so the LIKE still works
        }
    }

    // 3. Final Count
    $count = $conn->prepare("SELECT COUNT(*) FROM item_likes WHERE item_id = ?");
    $count->execute([$item_id]);
    $newCount = $count->fetchColumn();

    echo json_encode([
        "status" => "success",
        "action" => $status,
        "new_count" => (int)$newCount
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Missing IDs"]);
}
