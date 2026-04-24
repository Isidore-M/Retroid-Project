<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$user_id = $_GET['user_id'] ?? null;
$partner_id = $_GET['partner_id'] ?? null;
$item_id = $_GET['item_id'] ?? null;

if ($user_id && $partner_id && $item_id) {
    try {
        // Fetch all messages between these two users regarding this specific item
        $query = "SELECT * FROM messages
                  WHERE item_id = :iid
                  AND (
                      (sender_id = :uid AND receiver_id = :pid)
                      OR
                      (sender_id = :pid AND receiver_id = :uid)
                  )
                  ORDER BY created_at ASC";

        $stmt = $conn->prepare($query);
        $stmt->execute([
            'iid' => $item_id,
            'uid' => $user_id,
            'pid' => $partner_id
        ]);

        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success",
            "messages" => $messages
        ]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Missing required parameters."]);
}
