<?php
// 1. Absolute first lines - no spaces before this!
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle pre-flight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once '../config/database.php';

// 2. Get the data
$content = file_get_contents("php://input");
$decoded = json_decode($content, true);

// 3. Logic
if (!empty($decoded['username']) && !empty($decoded['password'])) {
    $user = $decoded['username'];
    $pass = $decoded['password'];

    // UPDATED QUERY: Included status, block_reason, and is_admin
    $query = "SELECT id, username, password, avatar_id, points, status, block_reason, is_admin FROM users WHERE username = :u LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute(['u' => $user]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verify user exists and password matches
    if ($row && $pass === $row['password']) {
        echo json_encode([
            "status" => "success",
            "message" => "Login successful",
            "user" => [
                "id" => (int)$row['id'],
                "username" => $row['username'],
                "avatar_id" => (int)$row['avatar_id'],
                "points" => (int)$row['points'],
                "status" => $row['status'],             // NEW: Needed for blocking logic
                "block_reason" => $row['block_reason'], // NEW: Needed for block alerts
                "is_admin" => (int)$row['is_admin']     // NEW: Needed for Admin Panel button
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Invalid pseudo or password."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Please provide both username and password."]);
}
