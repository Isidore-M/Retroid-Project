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

    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {

        // 1. IMPROVED PATH LOGIC
        // We go up one level from 'api' to root, then into 'public/items'
        $base_dir = dirname(__DIR__);
        $target_dir = $base_dir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'items' . DIRECTORY_SEPARATOR;

        // 2. AUTO-CREATE & PERMISSION CHECK
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }

        if (!is_writable($target_dir)) {
            ob_end_clean();
            echo json_encode([
                "status" => "error",
                "message" => "Folder is not writable. Manual fix: Right-click 'public' folder > Properties > Uncheck Read-only.",
                "path_attempted" => $target_dir
            ]);
            exit;
        }

        $file_extension = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $new_filename = 'item_' . time() . '_' . uniqid() . '.' . $file_extension;
        $target_file = $target_dir . $new_filename;

        // 3. ATTEMPT MOVE
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            try {
                $query = "INSERT INTO items (user_id, name, category, price, currency_type, image_path)
                          VALUES (:uid, :name, :cat, :price, :curr, :path)";

                $stmt = $conn->prepare($query);
                $success = $stmt->execute([
                    'uid'   => $user_id,
                    'name'  => $name,
                    'cat'   => $category,
                    'price' => $price,
                    'curr'  => $currency,
                    'path'  => $new_filename
                ]);

                if ($success) {
                    ob_end_clean();
                    echo json_encode([
                        "status" => "success",
                        "message" => "Item listed!",
                        "image" => $new_filename
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
            // Provide more detail if move_uploaded_file fails
            echo json_encode([
                "status" => "error",
                "message" => "Could not move file to destination.",
                "debug_path" => $target_file
            ]);
        }
    } else {
        ob_end_clean();
        $err_msg = isset($_FILES['image']) ? "PHP Upload Error Code: " . $_FILES['image']['error'] : "No file found in request.";
        echo json_encode(["status" => "error", "message" => $err_msg]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
