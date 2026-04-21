<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit;
}

require_once dirname(__FILE__) . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $price = $_POST['price'] ?? 0;
    $currency = $_POST['currency'] ?? 'points';
    $user_id = $_POST['user_id'] ?? null;

    // Capture the is_bidding flag
    $is_bidding = isset($_POST['is_bidding']) ? (int)$_POST['is_bidding'] : 0;

    // NEW: Capture the expiry_time sent from Angular
    // For regular items, this will remain NULL
    $expiry_time = $_POST['expiry_time'] ?? null;

    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {

        $base_dir = dirname(__DIR__);
        $target_dir = $base_dir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'items' . DIRECTORY_SEPARATOR;

        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }

        if (!is_writable($target_dir)) {
            ob_end_clean();
            echo json_encode([
                "status" => "error",
                "message" => "Folder is not writable."
            ]);
            exit;
        }

        $file_extension = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $new_filename = 'item_' . time() . '_' . uniqid() . '.' . $file_extension;
        $target_file = $target_dir . $new_filename;

        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            try {
                /**
                 * UPDATED QUERY:
                 * Now includes the 'expiry_time' column to store the auction deadline.
                 */
                $query = "INSERT INTO items (user_id, name, category, price, currency_type, image_path, is_bidding, expiry_time)
                          VALUES (:uid, :name, :cat, :price, :curr, :path, :is_bid, :expiry)";

                $stmt = $conn->prepare($query);
                $success = $stmt->execute([
                    'uid'    => $user_id,
                    'name'   => $name,
                    'cat'    => $category,
                    'price'  => $price,
                    'curr'   => $currency,
                    'path'   => $new_filename,
                    'is_bid' => $is_bidding,
                    'expiry' => $expiry_time // Maps to the timestamp from Angular
                ]);

                if ($success) {
                    ob_end_clean();
                    echo json_encode([
                        "status" => "success",
                        "message" => "Item listed successfully!",
                        "image" => $new_filename,
                        "expiry" => $expiry_time
                    ]);
                } else {
                    throw new Exception("Database save failed.");
                }
            } catch (Exception $e) {
                ob_end_clean();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            ob_end_clean();
            echo json_encode(["status" => "error", "message" => "Could not move file to destination."]);
        }
    } else {
        ob_end_clean();
        $err_msg = isset($_FILES['image']) ? "PHP Error: " . $_FILES['image']['error'] : "No file found.";
        echo json_encode(["status" => "error", "message" => $err_msg]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
