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

        // 1. Check if the Auction is still live (Time Check)
        $timeStmt = $conn->prepare("SELECT expiry_time, current_bid, price FROM items WHERE id = ? FOR UPDATE");
        $timeStmt->execute([$data->item_id]);
        $item = $timeStmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            throw new Exception("Artifact not found in the chamber.");
        }

        if ($item['expiry_time'] && strtotime($item['expiry_time']) < time()) {
            throw new Exception("The auction has ended! The artifact is no longer available.");
        }

        // 2. Verify the new bidder has enough points
        $userStmt = $conn->prepare("SELECT points FROM users WHERE id = ?");
        $userStmt->execute([$data->user_id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || $user['points'] < $data->amount) {
            throw new Exception("Insufficient XP balance in your vault.");
        }

        // 3. Prevent self-outbidding & enforce higher bids
        $current_top = $item['current_bid'] ?? $item['price'];
        if ($data->amount <= $current_top) {
            throw new Exception("Your bid must be higher than the current lead.");
        }

        // --- 4. REFUND PREVIOUS HIGHEST BIDDER ---
        // Find the most recent bid for this item
        $prevBidStmt = $conn->prepare("SELECT user_id, bid_amount FROM bids WHERE item_id = ? ORDER BY bid_amount DESC LIMIT 1");
        $prevBidStmt->execute([$data->item_id]);
        $prevBid = $prevBidStmt->fetch(PDO::FETCH_ASSOC);

        if ($prevBid) {
            // Only refund if the previous bidder isn't the current user (just in case)
            $refundStmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $refundStmt->execute([$prevBid['bid_amount'], $prevBid['user_id']]);
        }

        // 5. Record the new bid in history
        $insertBid = $conn->prepare("INSERT INTO bids (item_id, user_id, bid_amount) VALUES (?, ?, ?)");
        $insertBid->execute([$data->item_id, $data->user_id, $data->amount]);

        // 6. Update the item's lead data
        $updateItem = $conn->prepare("UPDATE items SET current_bid = ? WHERE id = ?");
        $updateItem->execute([$data->amount, $data->item_id]);

        // 7. Deduct XP from the NEW leader
        $updateUser = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $updateUser->execute([$data->amount, $data->user_id]);

        $conn->commit();
        echo json_encode([
            "status" => "success",
            "message" => "Your bid has been registered!",
            "new_balance" => $user['points'] - $data->amount
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Incomplete request data."]);
}
