<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../config/database.php';

try {
    $conn->beginTransaction();

    // 1. Find all items that have expired but are still marked as "is_bidding = 1"
    $expiredStmt = $conn->prepare("
        SELECT id, name, current_bid
        FROM items
        WHERE is_bidding = 1
        AND expiry_time <= NOW()
    ");
    $expiredStmt->execute();
    $expiredItems = $expiredStmt->fetchAll(PDO::FETCH_ASSOC);

    $processedCount = 0;

    foreach ($expiredItems as $item) {
        $itemId = $item['id'];
        $itemName = $item['name'];

        // 2. Get the winner (highest bidder)
        $winnerStmt = $conn->prepare("
            SELECT user_id, bid_amount
            FROM bids
            WHERE item_id = ?
            ORDER BY bid_amount DESC LIMIT 1
        ");
        $winnerStmt->execute([$itemId]);
        $winner = $winnerStmt->fetch(PDO::FETCH_ASSOC);

        if ($winner) {
            $winnerId = $winner['user_id'];

            // Fetch winner's username for the losers' notifications
            $uStmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
            $uStmt->execute([$winnerId]);
            $winnerName = $uStmt->fetchColumn();

            // A. NOTIFY THE WINNER (Rule #4)
            $winMsg = "You won the bid on the $itemName! Claim your rare artifact now.";
            $notifWin = $conn->prepare("
                INSERT INTO notifications (user_id, item_id, type, message, is_read)
                VALUES (?, ?, 'won', ?, 0)
            ");
            $notifWin->execute([$winnerId, $itemId, $winMsg]);

            // B. NOTIFY AND REFUND THE LOSERS (Rule #5)
            // We get all unique bidders EXCEPT the winner
            $losersStmt = $conn->prepare("
                SELECT DISTINCT user_id, MAX(bid_amount) as total_to_refund
                FROM bids
                WHERE item_id = ? AND user_id != ?
                GROUP BY user_id
            ");
            $losersStmt->execute([$itemId, $winnerId]);
            $losers = $losersStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($losers as $loser) {
                // Refund points to wallet
                $refund = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
                $refund->execute([$loser['total_to_refund'], $loser['user_id']]);

                // Send Loser Notification
                $loseMsg = "$winnerName won the bid on $itemName, so your points are back in your wallet.";
                $notifLose = $conn->prepare("
                    INSERT INTO notifications (user_id, item_id, type, message, is_read)
                    VALUES (?, ?, 'refund', ?, 0)
                ");
                $notifLose->execute([$loser['user_id'], $itemId, $loseMsg]);
            }
        }

        // 3. Mark the item as no longer bidding so it doesn't process again
        $closeItem = $conn->prepare("UPDATE items SET is_bidding = 0 WHERE id = ?");
        $closeItem->execute([$itemId]);

        $processedCount++;
    }

    $conn->commit();
    echo json_encode([
        "status" => "success",
        "message" => "Processed $processedCount closed auctions."
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
