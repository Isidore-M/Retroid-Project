<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Get Text Data
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $price = $_POST['price'] ?? 0;
    $currency = $_POST['currency'] ?? 'points';
    $user_id = $_POST['user_id'] ?? null;

    // 2. Handle Image Upload
    if (isset($_FILES['image'])) {
        $target_dir = "../public/items/";
        // Generate unique filename to avoid overwriting
        $file_extension = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $new_filename = uniqid() . '.' . $file_extension;
        $target_file = $target_dir . $new_filename;

        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            // 3. Save to Database
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
                echo json_encode(["status" => "success", "message" => "Item listed successfully!"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Database save failed."]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Image upload failed."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "No image received."]);
    }
}
