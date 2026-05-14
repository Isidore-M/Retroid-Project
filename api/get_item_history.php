<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../config/database.php';

$item_id = isset($_GET['item_id']) ? intval($_GET['item_id']) : 0;

if ($item_id > 0) {
    try {
        $query = "SELECT b.bid_amount, u.username, b.created_at
                  FROM bids b
                  JOIN users u ON b.user_id = u.id
                  WHERE b.item_id = ?
                  ORDER BY b.created_at DESC
                  LIMIT 5";

        $stmt = $conn->prepare($query);
        $stmt->execute([$item_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($history);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    echo json_encode([]);
}
?>
