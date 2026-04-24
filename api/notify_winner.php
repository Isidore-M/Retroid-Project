<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->item_id)) {
    // 1. Check if we already sent the winner notification for this item
    $check = $conn->prepare("SELECT id FROM notifications WHERE user_id = ? AND item_id = ? AND type = 'won'");
    $check->execute([$data->user_id, $data->item_id]);

    if (!$check->fetch()) {
        // 2. Insert the "Won" notification
        $stmt = $conn->prepare("INSERT INTO notifications (user_id, item_id, type, message, is_read) VALUES (?, ?, 'won', ?, 0)");
        $msg = "You won the bid: " . $data->item_name;
        $stmt->execute([$data->user_id, $data->item_id, $msg]);

        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "exists"]);
    }
}
