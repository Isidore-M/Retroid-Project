<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->sender_id) && !empty($data->owner_id) && !empty($data->item_id)) {
    try {
        $conn->beginTransaction();

        // 1. Fetch Sender Username
        $uStmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
        $uStmt->execute([$data->sender_id]);
        $sender = $uStmt->fetch(PDO::FETCH_ASSOC);

        // 2. Fetch Item Name
        $iStmt = $conn->prepare("SELECT name FROM items WHERE id = ?");
        $iStmt->execute([$data->item_id]);
        $item = $iStmt->fetch(PDO::FETCH_ASSOC);

        // 3. Create the Notification Message
        // Format: "You have a new message from [username] regarding [item]"
        $notifMsg = "New message from " . $sender['username'] . " regarding " . $item['name'];

        $notif = $conn->prepare("INSERT INTO notifications (user_id, sender_id, item_id, type, message, is_read)
                                 VALUES (:uid, :sid, :iid, 'message', :msg, 0)");

        $notif->execute([
            ':uid' => $data->owner_id,
            ':sid' => $data->sender_id,
            ':iid' => $data->item_id,
            ':msg' => $notifMsg
        ]);

        $conn->commit();
        echo json_encode(["status" => "success"]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
