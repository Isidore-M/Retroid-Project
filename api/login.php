<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if(!empty($data->username) && !empty($data->password)) {

    $query = "SELECT id, username, password, avatar_id, points FROM users WHERE username = ? LIMIT 0,1";
    $stmt = $conn->prepare($query);
    $stmt->execute([$data->username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // In a real app, use password_verify($data->password, $user['password'])
    // For now, we'll check plain text if you haven't hashed them yet
    if($user && ($data->password == $user['password'])) {

        // Gamification: Award 10 points for daily login
        // (You could add logic here to only award this once per 24 hours)
        $updatePoints = "UPDATE users SET points = points + 10 WHERE id = ?";
        $upd = $conn->prepare($updatePoints);
        $upd->execute([$user['id']]);

        http_response_code(200);
        echo json_encode([
            "message" => "Login successful",
            "user" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "avatar_id" => $user['avatar_id'],
                "points" => $user['points'] + 10 // Reflecting the bonus
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Invalid username or password."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data."]);
}
?>
