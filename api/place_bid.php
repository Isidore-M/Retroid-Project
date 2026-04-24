<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->item_id) && !empty($data->user_id) && !empty($data->amount)) {
    try {
        $conn->beginTransaction();

        // 1. Fetch item & owner details
        $timeStmt = $conn->prepare("SELECT name, user_id as owner_id, expiry_time, current_bid, price FROM items WHERE id = ? FOR UPDATE");
        $timeStmt->execute([$data->item_id]);
        $item = $timeStmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            throw new Exception("Artifact not found in the chamber.");
        }

        if ($item['expiry_time'] && strtotime($item['expiry_time']) < time()) {
            throw new Exception("The auction has ended! The artifact is no longer available.");
        }

        // 2. Verify the new bidder
        $userStmt = $conn->prepare("SELECT points, username FROM users WHERE id = ?");
        $userStmt->execute([$data->user_id]);
        $bidder = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$bidder || $bidder['points'] < $data->amount) {
            throw new Exception("Insufficient XP balance in your vault.");
        }

        // 3. Enforce higher bids
        $current_top = $item['current_bid'] ?? $item['price'];
        if ($data->amount <= $current_top) {
            throw new Exception("Your bid must be higher than the current lead.");
        }

        // --- 4. REFUND & NOTIFY PREVIOUS HIGHEST BIDDER ---
        $prevBidStmt = $conn->prepare("SELECT user_id, bid_amount FROM bids WHERE item_id = ? ORDER BY bid_amount DESC LIMIT 1");
        $prevBidStmt->execute([$data->item_id]);
        $prevBid = $prevBidStmt->fetch(PDO::FETCH_ASSOC);

        if ($prevBid && $prevBid['user_id'] != $data->user_id) {
            // Refund points logic
            $refundStmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $refundStmt->execute([$prevBid['bid_amount'], $prevBid['user_id']]);

            // SEND NOTIFICATION: Outbid Alert
            $notifOutbid = $conn->prepare("INSERT INTO notifications (user_id, sender_id, item_id, type, message, is_read)
                                         VALUES (:uid, :sid, :iid, 'outbid', :msg, 0)");

            $outbidMsg = "You were outbid on " . $item['name'] . "! " . $prevBid['bid_amount'] . " XP has been returned.";

            $notifOutbid->execute([
                ':uid' => $prevBid['user_id'],
                ':sid' => $data->user_id,
                ':iid' => $data->item_id,
                ':msg' => $outbidMsg
            ]);
        }

        // 5. Record the new bid
        $insertBid = $conn->prepare("INSERT INTO bids (item_id, user_id, bid_amount) VALUES (?, ?, ?)");
        $insertBid->execute([$data->item_id, $data->user_id, $data->amount]);

        // 6. Update the item's lead
        $updateItem = $conn->prepare("UPDATE items SET current_bid = ? WHERE id = ?");
        $updateItem->execute([$data->amount, $data->item_id]);

        // 7. Deduct XP from new leader
        $updateUser = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $updateUser->execute([$data->amount, $data->user_id]);

        // --- 8. NOTIFY THE ITEM OWNER ---
        if ($item['owner_id'] != $data->user_id) {
            $notifOwner = $conn->prepare("INSERT INTO notifications (user_id, sender_id, item_id, type, message, is_read)
                                        VALUES (:uid, :sid, :iid, 'bid', :msg, 0)");

            $ownerMsg = $bidder['username'] . " placed a " . $data->amount . " XP bid on your item: " . $item['name'];

            $notifOwner->execute([
                ':uid' => $item['owner_id'],
                ':sid' => $data->user_id,
                ':iid' => $data->item_id,
                ':msg' => $ownerMsg
            ]);
        }

        $conn->commit();
        echo json_encode([
            "status" => "success",
            "message" => "Your bid has been registered!",
            "new_balance" => $bidder['points'] - $data->amount
        ]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) { $conn->rollBack(); }
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Incomplete request data."]);
}
