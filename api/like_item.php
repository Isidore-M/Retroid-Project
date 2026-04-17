<?php
ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); ob_end_clean(); exit;
}

require_once dirname(__FILE__) . '/../config/database.php';
$data = json_decode(file_get_contents("php://input"));

$user_id = $data->user_id ?? null;
$item_id = $data->item_id ?? null;

if ($user_id && $item_id) {
    try {
        // 1. Check if the user already liked this item
        $check = $conn->prepare("SELECT * FROM item_likes WHERE user_id = :uid AND item_id = :iid");
        $check->execute(['uid' => $user_id, 'iid' => $item_id]);

        if ($check->rowCount() > 0) {
            // UNLIKE: Remove the record and subtract 1 from the item
            $conn->prepare("DELETE FROM item_likes WHERE user_id = :uid AND item_id = :iid")->execute(['uid' => $user_id, 'iid' => $item_id]);
            $conn->prepare("UPDATE items SET likes = likes - 1 WHERE id = :iid")->execute(['iid' => $item_id]);
            $action = 'unliked';
        } else {
            // LIKE: Add the record and add 1 to the item
            $conn->prepare("INSERT INTO item_likes (user_id, item_id) VALUES (:uid, :iid)")->execute(['uid' => $user_id, 'iid' => $item_id]);
            $conn->prepare("UPDATE items SET likes = likes + 1 WHERE id = :iid")->execute(['iid' => $item_id]);
            $action = 'liked';
        }

        ob_end_clean();
        echo json_encode(["status" => "success", "action" => $action]);
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Missing user or item ID."]);
}
