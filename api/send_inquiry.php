<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$data = json_decode(file_get_contents("php://input"));

// Ensure all fields including the message are present
if (!empty($data->sender_id) && !empty($data->owner_id) && !empty($data->item_id) && !empty($data->message)) {
    try {
        $conn->beginTransaction();

        // 1. Fetch Sender Info (Username & Avatar for the notification context)
        $uStmt = $conn->prepare("SELECT username, avatar_id FROM users WHERE id = ?");
        $uStmt->execute([$data->sender_id]);
        $sender = $uStmt->fetch(PDO::FETCH_ASSOC);

        // 2. Fetch Item Name
        $iStmt = $conn->prepare("SELECT name FROM items WHERE id = ?");
        $iStmt->execute([$data->item_id]);
        $item = $iStmt->fetch(PDO::FETCH_ASSOC);

        if (!$sender || !$item) {
            throw new Exception("Required user or item data not found.");
        }

        // --- A. RECORD THE MESSAGE ---
        // This populates the "Messages" tab in the profile
        $msgStmt = $conn->prepare("INSERT INTO messages (sender_id, receiver_id, item_id, message_text)
                                   VALUES (?, ?, ?, ?)");
        $msgStmt->execute([
            $data->sender_id,
            $data->owner_id,
            $data->item_id,
            $data->message
        ]);

        // --- B. CREATE THE NOTIFICATION ---
        // We include sender_id and item_id so the profile can "Deep Link" to the chat
        $notifMsg = "New message from " . $sender['username'] . " regarding " . $item['name'];

        $notif = $conn->prepare("INSERT INTO notifications (user_id, sender_id, item_id, type, message, is_read)
                                 VALUES (:uid, :sid, :iid, 'message', :msg, 0)");

        $notif->execute([
            ':uid' => $data->owner_id, // The person receiving the notification
            ':sid' => $data->sender_id, // The person who sent the message
            ':iid' => $data->item_id,   // The item being discussed
            ':msg' => $notifMsg
        ]);

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Inquiry recorded and notification sent."]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Missing parameters: sender_id, owner_id, item_id, and message are required."]);
}
