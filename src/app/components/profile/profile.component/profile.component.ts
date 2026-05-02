import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router'; // 👈 Added ActivatedRoute
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../../services/item';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any;

  // Data Arrays
  myItems: any[] = [];
  likedItems: any[] = [];

  // --- NEW: Message Center Data ---
  chatList: any[] = [];
  activeMessages: any[] = [];
  selectedChat: any = null;
  replyText: string = '';

  // Form State
  editUsername: string = '';

  // UI State - 👈 Updated to include 'messages' and 'biddings'
  activeTab: 'info' | 'listings' | 'notifications' | 'messages' | 'biddings' = 'info';

  constructor(
    private router: Router,
    private route: ActivatedRoute, // 👈 Added for notification deep-linking
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {}

ngOnInit() {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    this.user = JSON.parse(savedUser);
    this.editUsername = this.user.username;
    this.loadProfileData();

    // 1. Load the inbox first
    this.itemService.getChatList(this.user.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.chatList = res.chats;

          // 2. NOW check the URL parameters
          this.route.queryParams.subscribe(params => {
            if (params['tab'] === 'messages') {
              this.activeTab = 'messages';

              // 3. If we have a partnerId, find and select that chat automatically
              if (params['partnerId'] && params['itemId']) {
                const autoChat = this.chatList.find(c =>
                  (c.sender_id == params['partnerId'] || c.receiver_id == params['partnerId']) &&
                  c.item_id == params['itemId']
                );

                if (autoChat) {
                  this.selectChat(autoChat);
                }
              }
            }
          });
          this.cdr.detectChanges();
        }
      }
    });
  }
}

  // --- NEW: Message Center Methods ---
  loadInbox() {
    this.itemService.getChatList(this.user.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.chatList = res.chats;
          this.cdr.detectChanges();
        }
      }
    });
  }

  selectChat(chat: any) {
    this.selectedChat = chat;
    this.loadConversation();
  }

  loadConversation() {
    if (!this.selectedChat) return;
    const partnerId = (this.selectedChat.sender_id == this.user.id)
                      ? this.selectedChat.receiver_id : this.selectedChat.sender_id;

    this.itemService.getChatHistory(this.user.id, partnerId, this.selectedChat.item_id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.activeMessages = res.messages;
          this.cdr.detectChanges();
        }
      }
    });
  }

  sendReply() {
    if (!this.replyText.trim() || !this.selectedChat) return;
    const partnerId = (this.selectedChat.sender_id == this.user.id)
                      ? this.selectedChat.receiver_id : this.selectedChat.sender_id;

    this.itemService.sendMessageInquiry(this.user.id, partnerId, this.selectedChat.item_id, this.replyText).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.activeMessages.push({
            sender_id: this.user.id,
            message_text: this.replyText,
            created_at: new Date().toISOString()
          });
          this.replyText = '';
          this.cdr.detectChanges();
        }
      }
    });
  }

  // --- EXISTING METHODS (Untouched) ---
  loadProfileData() {
    this.itemService.getUserProfile(this.user.id).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.myItems = res.my_items;
          this.likedItems = res.liked_items.map((item: any) => ({
            ...item,
            isLiked: true
          }));
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Error loading profile:", err)
    });
  }

  saveInfo() {
    if (!this.editUsername.trim() || this.editUsername === this.user.username) {
      return;
    }
    this.itemService.updateUserInfo(this.user.id, this.editUsername).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.user.username = this.editUsername;
          localStorage.setItem('user', JSON.stringify(this.user));
          alert("Profile updated!");
          this.cdr.detectChanges();
        }
      }
    });
  }

  updatePassword() { console.log("Password update triggered"); }

  // 👈 Updated type here to match new tab list
 setTab(tab: 'info' | 'listings' | 'notifications' | 'messages' | 'biddings', event?: Event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log("Tab clicked:", tab); // Check your F12 console for this!
  this.activeTab = tab;

  if (tab === 'messages') {
    this.loadInbox();
  }

  this.cdr.detectChanges();
}

  triggerBannerUpload() { console.log("Banner edit clicked!"); }
  triggerAvatarUpload() { console.log("Avatar edit clicked!"); }
  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
