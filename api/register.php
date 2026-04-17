<?php
// 1. Set headers for Cross-Origin Resource Sharing (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// 2. Handle the Pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once '../config/database.php';

// 3. Get the raw POST data from the Angular request
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {

    // 4. Check if the username is already in the database
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$data->username]);

    if ($check->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["message" => "This pseudo is already taken!"]);
        exit;
    }

    // 5. Prepare the data for insertion
    $username = $data->username;
    $password = $data->password; // Consider using password_hash($data->password, PASSWORD_DEFAULT) for real security
    $avatar_id = !empty($data->avatar_id) ? $data->avatar_id : 1;
    $starting_points = 50; // Your welcome bonus

    // 6. Insert new user
    $query = "INSERT INTO users (username, password, avatar_id, points) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($query);

    if ($stmt->execute([$username, $password, $avatar_id, $starting_points])) {

        // 7. GET THE NEW USER ID (Crucial for the Auto-Login session)
        $new_user_id = $conn->lastInsertId();

        // 8. Return the user object so Angular can save it to localStorage immediately
        http_response_code(201); // 201 Created
        echo json_encode([
            "message" => "Registration successful!",
            "user" => [
                "id" => $new_user_id,
                "username" => $username,
                "avatar_id" => $avatar_id,
                "points" => $starting_points
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Database error: Could not complete registration."]);
    }
} else {
    // 9. Handle incomplete data
    http_response_code(400);
    echo json_encode(["message" => "Please fill in all required fields."]);
}
?>
