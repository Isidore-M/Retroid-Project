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
    $expiry_time = $_POST['expiry_time'] ?? null;

    // Capture description and rarity
    $description = $_POST['description'] ?? '';
    $rarity = $_POST['rarity'] ?? 'Common';

    // =========================================================================
    // STRICT 3-ITEM LIMIT CHECK FOR THE BIDDING CHAMBER
    // =========================================================================
    if ($is_bidding === 1) {
        try {
            $checkStmt = $conn->query("SELECT COUNT(*) FROM items WHERE is_bidding = 1");
            $biddingCount = $checkStmt->fetchColumn();

            if ($biddingCount >= 3) {
                ob_end_clean();
                echo json_encode([
                    "status" => "error",
                    "message" => "CHAMBER FULL: Maximum of 3 artifacts allowed. Remove an active auction first."
                ]);
                exit;
            }
        } catch (PDOException $e) {
            ob_end_clean();
            echo json_encode(["status" => "error", "message" => "Database error during capacity check."]);
            exit;
        }
    }
    // =========================================================================

    // --- NEW: MULTI-IMAGE UPLOAD LOGIC ---
    // Check if the 'images' array exists in the payload
    if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {

        $base_dir = dirname(__DIR__);
        $target_dir = $base_dir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'items' . DIRECTORY_SEPARATOR;

        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }

        if (!is_writable($target_dir)) {
            ob_end_clean();
            echo json_encode(["status" => "error", "message" => "Folder is not writable."]);
            exit;
        }

        $uploaded_filenames = [];
        $file_count = count($_FILES['images']['name']);

        // Loop through all uploaded files (Max 3 as a safety net)
        $limit = min($file_count, 3);

        for ($i = 0; $i < $limit; $i++) {
            if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                $file_extension = pathinfo($_FILES["images"]["name"][$i], PATHINFO_EXTENSION);
                // Create a unique name for EACH image
                $new_filename = 'item_' . time() . '_' . uniqid() . '.' . $file_extension;
                $target_file = $target_dir . $new_filename;

                if (move_uploaded_file($_FILES["images"]["tmp_name"][$i], $target_file)) {
                    $uploaded_filenames[] = $new_filename; // Add to our success array
                }
            }
        }

        // If at least one file was successfully uploaded
        if (count($uploaded_filenames) > 0) {

            // Join the array into a comma-separated string! (e.g., "img1.jpg,img2.jpg")
            $image_paths_string = implode(',', $uploaded_filenames);

            try {
                $query = "INSERT INTO items (user_id, name, description, rarity, category, price, currency_type, image_path, is_bidding, expiry_time)
                          VALUES (:uid, :name, :desc, :rarity, :cat, :price, :curr, :path, :is_bid, :expiry)";

                $stmt = $conn->prepare($query);
                $success = $stmt->execute([
                    'uid'    => $user_id,
                    'name'   => $name,
                    'desc'   => $description,
                    'rarity' => $rarity,
                    'cat'    => $category,
                    'price'  => $price,
                    'curr'   => $currency,
                    'path'   => $image_paths_string, // <-- Save the string of all images here
                    'is_bid' => $is_bidding,
                    'expiry' => $expiry_time
                ]);

                if ($success) {
                    ob_end_clean();
                    echo json_encode([
                        "status" => "success",
                        "message" => "Item listed successfully!",
                        "images" => $image_paths_string,
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
            echo json_encode(["status" => "error", "message" => "Could not move any files to destination."]);
        }
    } else {
        ob_end_clean();
        echo json_encode(["status" => "error", "message" => "No files found. Make sure you select at least one image."]);
    }
} else {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>
