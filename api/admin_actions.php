<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$json_data = json_decode(file_get_contents("php://input"), true);
$item_id = $json_data['item_id'] ?? $_POST['item_id'] ?? null;

if (!empty($item_id)) {
    try {
        // 1. Delete bids (We know this table exists)
        try {
            $stmt1 = $conn->prepare("DELETE FROM bids WHERE item_id = ?");
            $stmt1->execute([$item_id]);
        } catch(PDOException $e) { /* Ignore if table missing */ }

        // 2. Delete notifications
        try {
            $stmt2 = $conn->prepare("DELETE FROM notifications WHERE item_id = ?");
            $stmt2->execute([$item_id]);
        } catch(PDOException $e) { /* Ignore if table missing */ }

        // REMOVED the 'likes' query entirely since the table doesn't exist.

        // 3. NOW delete the actual artifact
        $stmtItem = $conn->prepare("DELETE FROM items WHERE id = ?");
        $stmtItem->execute([$item_id]);

        if ($stmtItem->rowCount() > 0) {
            echo json_encode(["status" => "success", "message" => "Artifact and all associated records successfully destroyed."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Artifact not found in database."]);
        }
    } catch(PDOException $e) {
        // This will now only catch critical errors related to the items table itself
        echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Incomplete request: No item_id received by the server."]);
}
?>
