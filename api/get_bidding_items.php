<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../config/database.php';

try {
    // Added i.description to the query
    $query = "SELECT i.*, i.description,
              (SELECT MAX(bid_amount) FROM bids WHERE item_id = i.id) as current_bid,
              (SELECT u.username FROM bids b JOIN users u ON b.user_id = u.id
               WHERE b.item_id = i.id ORDER BY b.bid_amount DESC LIMIT 1) as highest_bidder
              FROM items i
              WHERE i.is_bidding = 1
              ORDER BY i.expiry_time ASC";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($results);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
