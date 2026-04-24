<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$user_id = $_GET['user_id'] ?? null;

if ($user_id) {
    try {
        // Fetch the latest message from each unique conversation partner
        $query = "SELECT m.*, u.username as partner_name, i.name as item_name, i.image_path
                  FROM messages m
                  JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
                  JOIN items i ON m.item_id = i.id
                  WHERE (m.sender_id = :uid OR m.receiver_id = :uid)
                  AND u.id != :uid
                  GROUP BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id), m.item_id
                  ORDER BY m.created_at DESC";

        $stmt = $conn->prepare($query);
        $stmt->execute(['uid' => $user_id]);
        $chats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["status" => "success", "chats" => $chats]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
