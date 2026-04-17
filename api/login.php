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
if (isset($decoded['username']) && isset($decoded['password'])) {
    $user = $decoded['username'];
    $pass = $decoded['password'];

    $query = "SELECT * FROM users WHERE username = :u LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute(['u' => $user]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && $pass == $row['password']) {
        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $row['id'],
                "username" => $row['username'],
                "points" => $row['points']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Invalid credentials. Check your SQL table!"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "PHP received empty data", "raw_received" => $content]);
}
