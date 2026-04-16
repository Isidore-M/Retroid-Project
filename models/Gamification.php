<?php
class Gamification {
    private $db;

    public function __construct($database_connection) {
        $this->db = $database_connection;
    }

    public function awardPoints($userId, $actionType) {
        $pointsMap = [
            'first_post' => 50,
            'message_sent' => 5,
            'daily_login' => 10,
            'item_sold' => 100
        ];

        if (array_key_exists($actionType, $pointsMap)) {
            $points = $pointsMap[$actionType];
            $query = "UPDATE users SET points = points + $points WHERE id = $userId";
            return $this->db->query($query);
        }
        return false;
    }
}
?>
