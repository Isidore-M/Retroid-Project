<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include_once '../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->username) && !empty($data->password)) {
    // Check if user exists
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$data->username]);

    if($check->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["message" => "Pseudo already taken!"]);
        exit;
    }

    // Insert new user with 50 "Welcome" points
    $query = "INSERT INTO users (username, password, avatar_id, points) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($query);

    if($stmt->execute([$data->username, $data->password, $data->avatar_id, 50])) {
        echo json_encode(["message" => "Registration successful!"]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Server error during registration"]);
    }
}
?>
