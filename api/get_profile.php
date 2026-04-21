<?php
ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); ob_end_clean(); exit;
}

require_once dirname(__FILE__) . '/../config/database.php';

$user_id = $_GET['user_id'] ?? null;

if ($user_id) {
    try {
        // 1. Fetch User Stats (Points, Admin Status, Account Status)
        // This is CRITICAL for keeping the XP pill and Admin tabs visible
        $user_query = "SELECT id, username, points, is_admin, status FROM users WHERE id = :uid";
        $stmt_user = $conn->prepare($user_query);
        $stmt_user->execute(['uid' => $user_id]);
        $user_stats = $stmt_user->fetch(PDO::FETCH_ASSOC);

        if (!$user_stats) {
            throw new Exception("User not found.");
        }

        // 2. Fetch items posted by this user
        $my_items_query = "SELECT * FROM items WHERE user_id = :uid ORDER BY id DESC";
        $stmt1 = $conn->prepare($my_items_query);
        $stmt1->execute(['uid' => $user_id]);
        $my_items = $stmt1->fetchAll(PDO::FETCH_ASSOC);

        // 3. Fetch items liked by this user
        $liked_items_query = "
            SELECT items.*, users.username as owner_name
            FROM items
            JOIN item_likes ON items.id = item_likes.item_id
            JOIN users ON items.user_id = users.id
            WHERE item_likes.user_id = :uid
            ORDER BY item_likes.item_id DESC";
        $stmt2 = $conn->prepare($liked_items_query);
        $stmt2->execute(['uid' => $user_id]);
        $liked_items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // 4. Return the combined "God View" of the user's current session
        ob_end_clean();
        echo json_encode([
            "status" => "success",
            "user" => $user_stats, // NEW: Returns points and admin flag
            "my_items" => $my_items,
            "liked_items" => $liked_items
        ]);

    } catch (Exception $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Missing User ID."]);
}
