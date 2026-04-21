<?php
// ... standard headers ...
require_once '../config/database.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->item_id) && !empty($data->user_id) && !empty($data->amount)) {
    try {
        $conn->beginTransaction();

        // 1. Check current highest bid
        $stmt = $conn->prepare("SELECT MAX(bid_amount) as top FROM bids WHERE item_id = ?");
        $stmt->execute([$data->item_id]);
        $row = $stmt->fetch();
        $current_top = $row['top'] ?? 0;

        if ($data->amount <= $current_top) {
            throw new Exception("You were outbid! Refresh and try again.");
        }

        // 2. Insert the bid
        $insert = $conn->prepare("INSERT INTO bids (item_id, user_id, bid_amount) VALUES (?, ?, ?)");
        $insert->execute([$data->item_id, $data->user_id, $data->amount]);

        // 3. Optional: Deduct XP immediately or at the end?
        // Usually, in auctions, we only deduct when the auction ENDS.
        // For Retroid, let's keep it simple: Record the bid, deduct only if they win.

        $conn->commit();
        echo json_encode(["status" => "success"]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
