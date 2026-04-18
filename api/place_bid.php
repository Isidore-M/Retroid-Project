<?php
// ... standard headers ...
require_once '../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->item_id) && !empty($data->user_id) && !empty($data->amount)) {
    // 1. Start a Transaction (Crucial for money/XP logic)
    $conn->beginTransaction();

    try {
        // 2. Double check the highest bid again
        $check = $conn->prepare("SELECT MAX(bid_amount) as top FROM bids WHERE item_id = ?");
        $check->execute([$data->item_id]);
        $top = $check->fetch()['top'];

        if ($data->amount <= $top) {
            throw new Exception("Someone outbid you while you were typing!");
        }

        // 3. Insert the new bid
        $stmt = $conn->prepare("INSERT INTO bids (item_id, user_id, bid_amount) VALUES (?, ?, ?)");
        $stmt->execute([$data->item_id, $data->user_id, $data->amount]);

        $conn->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
