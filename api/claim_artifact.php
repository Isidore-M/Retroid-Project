<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$json_data = json_decode(file_get_contents("php://input"), true);
$item_id = $json_data['item_id'] ?? null;
$user_id = $json_data['user_id'] ?? null;

if ($item_id && $user_id) {
    try {
        // 1. Verify this user actually won the artifact
        $verify = $conn->prepare("SELECT highest_bidder_id FROM items WHERE id = ?");
        $verify->execute([$item_id]);
        $owner = $verify->fetchColumn();

        if ($owner == $user_id) {
            // 2. Transfer ownership: change owner to the winner, remove from bidding room, mark as claimed
            $update = $conn->prepare("UPDATE items SET user_id = ?, is_bidding = 0, is_claimed = 1 WHERE id = ?");
            $update->execute([$user_id, $item_id]);

            echo json_encode(["status" => "success", "message" => "Artifact successfully claimed."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Unauthorized: You did not win this auction."]);
        }
    } catch(PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Incomplete request."]);
}
?>
