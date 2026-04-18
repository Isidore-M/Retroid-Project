<?php
ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); ob_end_clean(); exit;
}

require_once dirname(__FILE__) . '/../config/database.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->username)) {
    try {
        $query = "UPDATE users SET username = :username WHERE id = :id";
        $stmt = $conn->prepare($query);

        if ($stmt->execute(['username' => $data->username, 'id' => $data->user_id])) {
            ob_end_clean();
            echo json_encode(["status" => "success", "message" => "Profile updated!"]);
        } else {
            throw new Exception("Update failed.");
        }
    } catch (Exception $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Incomplete data."]);
}
