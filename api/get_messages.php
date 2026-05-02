<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

$user_id = $_GET['user_id'] ?? null;

if ($user_id) {
    try {
        /**
         * This query does a few important things for the Profile UI:
         * 1. It finds the latest message in every unique conversation (User A + User B + Item X).
         * 2. It joins the 'users' table to get the OTHER person's name and avatar.
         * 3. It joins the 'items' table so we know which product they are talking about.
         */
        $query = "SELECT
                    m.id,
                    m.sender_id,
                    m.receiver_id,
                    m.item_id,
                    m.message_text,
                    m.created_at,
                    u.username as partner_name,
                    u.avatar_id as partner_avatar,
                    i.name as item_name,
                    i.image_path as item_image
                  FROM messages m
                  INNER JOIN (
                      /* Get the ID of the latest message for each conversation group */
                      SELECT MAX(id) as max_id
                      FROM messages
                      WHERE sender_id = :uid OR receiver_id = :uid
                      GROUP BY
                        LEAST(sender_id, receiver_id),
                        GREATEST(sender_id, receiver_id),
                        item_id
                  ) latest ON m.id = latest.max_id
                  /* Join the user who is NOT the current logged-in user */
                  JOIN users u ON (
                      (m.sender_id = u.id AND m.sender_id != :uid) OR
                      (m.receiver_id = u.id AND m.receiver_id != :uid)
                  )
                  JOIN items i ON m.item_id = i.id
                  ORDER BY m.created_at DESC";

        $stmt = $conn->prepare($query);
        $stmt->execute(['uid' => $user_id]);
        $chats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success",
            "chats" => $chats
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "status" => "error",
            "message" => $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "User ID is required."
    ]);
}
