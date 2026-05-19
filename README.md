Retroid Marketplace & Auction Platform

<img src="/landing.jpg" width="800" alt="Retroid Marketplace Interface">

# Retroid Marketplace & Auction Platform

I-Overview
Retroid is a full-stack web application designed as a specialized marketplace and live auction platform for retro gaming artifacts and collectibles. The system operates on a custom currency ecosystem (XP/Points) and features a dual-interface architecture: a user-facing dashboard for browsing and bidding, and a comprehensive Admin Control Center for system oversight and inventory management.

Architecture & Tech Stack
Frontend: Angular (v17+), TypeScript, Bootstrap (for modal and grid structures), Custom CSS.

Backend: PHP (v8.x natively supported), PDO for database interactions.

Database: MySQL.

Architecture Pattern: RESTful API communication with optimistic UI updating on the client side.

#Live demo

<video src="/Retroid-Demo.mov" width="800" controls></video>

Core Features
1. The Bidding Chamber (Live Auctions)
Real-Time Auction Logic: Server-validated bidding system with precise expiration timers synced to local timezones (EDT/EST) to prevent desync race conditions.

Optimistic UI Updates: Instantaneous bid reflection on the client side to eliminate perceived latency, supported by background polling for ultimate state truth.

Live Feed Terminal: A dynamically updating transaction history log displayed on individual artifact cards.

Capacity Management: Hard-coded limitation of 3 active auctions at any given time to drive scarcity.

2. Marketplace
Standard Listings: Static item listings categorized by type (Consoles, Games, Collectibles).

Multi-Image Processing: Custom handling for up to 3 high-resolution images per listing, compiled into comma-separated strings for database storage and split on the frontend for rendering.

3. Admin Control Center
User Oversight: Complete view of the user base with administrative actions to issue system bans or restore access.

Inventory Deployment: A dedicated deployment form for injecting new artifacts directly into the Bidding Chamber or standard market, including custom expiry configurations.

Data Sanitization: Hard deletion capabilities for purging invalid or expired database entries.

Installation & Setup Environment
Prerequisites
Node.js & npm: Required for the Angular CLI and frontend dependencies.

Angular CLI: Install globally via npm install -g @angular/cli.

Local Web Server: XAMPP, MAMP, or an equivalent Apache/MySQL stack for the backend environment.

Backend Setup (PHP/MySQL)
Navigate to your local server's public directory (e.g., htdocs for XAMPP).

Create a folder named retroid and place the backend PHP files within it.

Ensure the /public/items/ directory exists and possesses write permissions (0777) for image uploads.

Open your MySQL management tool (e.g., phpMyAdmin) and create a database named retroid_db.

Import your SQL schema to generate the users, items, and bids tables.

Verify that config/database.php has the correct local timezone set (e.g., date_default_timezone_set('America/Toronto');) and proper PDO credentials.

Frontend Setup (Angular)
Navigate to the frontend project root in your terminal.

Execute npm install to download all required dependencies.

Verify that your Angular environment files or API services are pointing to your local PHP server (e.g., http://localhost/retroid/api/).

Execute ng serve to compile the application and start the development server.

Access the application via http://localhost:4200.

API Endpoint Structure
The application relies on several distinct PHP endpoints to manage data flow:

get_bidding_items.php: Retrieves active auctions, joining the users table to fetch the current highest bidder's username.

post_item.php: Handles multipart form data, processing array-based file uploads (images[]) and standard text payloads.

place_bid.php: Validates user XP balances, checks time expiration, processes the bid, and deducts the appropriate currency.

admin_actions.php: Secure endpoints for blocking users or deleting inventory items.

Known Constraints & Considerations
File Upload Limits: Ensure your php.ini file has an adequate upload_max_filesize and post_max_size (recommended 20MB+) to support multi-image uploads from modern devices.

Security: The current iteration relies on local storage for user session management. For a production environment, this should be upgraded to JWT (JSON Web Tokens) and secure, HTTP-only cookies.





II-Retroid User Manual: Platform Operations & Navigation

Overview
Welcome to Retroid. This manual is designed to guide users through the primary functions of the platform, including acquiring artifacts, participating in live auctions, and securely communicating with other collectors.

1. Navigating the Standard Marketplace
The standard marketplace operates as a static catalog where users can browse retro consoles, games, and collectibles listed by other community members.

Browsing Artifacts: Artifacts are displayed in a grid format. Each card provides a high-level summary, including the item name, seller handle, and the asking price in XP (Experience Points).

Viewing Details: Selecting an artifact opens its full profile. Listings support up to three high-resolution images. Users can cycle through these images to inspect the condition of the hardware, boxes, or manuals.

Categories & Filtering: Items are classified by strict categories (Consoles, Games, Collectibles) to streamline navigation and allow precise searching within the vault.

2. Direct Communications (Secure Messaging)
Retroid facilitates peer-to-peer connections to encourage a thriving collector community. If a user is interested in a standard marketplace item, they can initiate direct communication with the seller.

Initiating Contact: When viewing a standard artifact, users can select the "Contact Seller" action. This opens a secure, private communication channel with the owner.

Negotiations and Inquiries: The messaging system is utilized to request additional photos, verify the operational status of hardware, or negotiate the XP price before committing to a transaction.

Inbox Management: Users have access to a centralized inbox to track ongoing negotiations and coordinate with multiple sellers or buyers simultaneously.

Security & Oversight: To maintain a professional environment, all communications are subject to community guidelines. Users have the ability to report inappropriate behavior, and administrators retain the authority to restrict messaging privileges or issue platform bans.

3. The Bidding Chamber (Live Auctions)
High-value, rare artifacts are deployed directly into the Bidding Chamber. This section of the platform operates on strict time limits and real-time competition.

Entering an Auction: Selecting an active auction displays the artifact's details, the current leading bid, and the exact countdown timer.

Placing a Bid: Users must enter a bid higher than the current lead. Bids are instantly validated against the user's available XP balance. If funds are sufficient, the bid is registered, and the required XP is temporarily held.

The Live Feed: The Bidding Terminal on each artifact card acts as a live transaction log. It permanently displays the username and bid amount of all participants in real time.

Auction Conclusion: When the countdown reaches zero, the system automatically locks the artifact. The interface will immediately transition to a closed state, displaying a victory prompt verifying the highest bidder. The held XP is permanently deducted from the winner, and the artifact ownership is transferred.

4. Account & Currency Management
All transactions within Retroid are powered by our proprietary digital currency, XP.

Monitoring Balances: Your current XP balance is consistently displayed in the navigation interface and within the bidding modal to ensure transparency before committing to a purchase.

Insufficient Funds: The system strictly prohibits negative balances. Attempting to place a bid or purchase an item without the requisite XP will trigger a system block until the account is sufficiently funded.
