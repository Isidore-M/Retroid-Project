<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once dirname(__FILE__) . '/../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->action) && !empty($data->user_id)) {
    try {
        if ($data->action === 'block') {
            $reason = !empty($data->reason) ? $data->reason : "Violation of community guidelines.";

            // 1. Update User Status
            $query = "UPDATE users SET status = 'blocked', block_reason = :reason WHERE id = :id";
            $stmt = $conn->prepare($query);
            $stmt->execute(['reason' => $reason, 'id' => $data->user_id]);

            // 2. Send System Notification to the User
            $notifQuery = "INSERT INTO notifications (user_id, message, type)
                           VALUES (:user_id, :message, 'system_alert')";
            $notifStmt = $conn->prepare($notifQuery);
            $notifStmt->execute([
                'user_id' => $data->user_id,
                'message' => "Your account has been restricted. Reason: " . $reason
            ]);

            echo json_encode(["status" => "success", "message" => "User has been blocked."]);
        }

        if ($data->action === 'unblock') {
            $query = "UPDATE users SET status = 'active', block_reason = NULL WHERE id = :id";
            $stmt = $conn->prepare($query);
            $stmt->execute(['id' => $data->user_id]);
            echo json_encode(["status" => "success", "message" => "User restored."]);
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Incomplete request."]);
}
?>
