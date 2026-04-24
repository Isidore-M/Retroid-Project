import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ItemService } from '../../services/item';
import { CommonModule } from '@angular/common'; // Fixes [ngClass] and pipes
import { FormsModule } from '@angular/forms';   // Fixes [(ngModel)]

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './messages.html', // Pointing to your messages.html file
  styleUrls: ['./messages.css']    // Pointing to your messages.css file
})
export class MessagesComponent implements OnInit {
  user: any;
  chatList: any[] = [];
  activeMessages: any[] = [];
  selectedChat: any = null;
  replyText: string = '';

  constructor(
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {
    const savedUser = localStorage.getItem('user');
    this.user = savedUser ? JSON.parse(savedUser) : {};
  }

  ngOnInit(): void {
    if (this.user?.id) {
      this.loadInbox();
    }
  }

  // 1. Fetch all unique conversations for the user
  loadInbox() {
    this.itemService.getChatList(this.user.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.chatList = res.chats;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Could not load inbox", err)
    });
  }

  // 2. When a user clicks a chat in the sidebar
  selectChat(chat: any) {
    this.selectedChat = chat;
    this.loadConversation();
  }

  // 3. Fetch the full history between you and the partner for that item
  loadConversation() {
    if (!this.selectedChat) return;

    // Determine partner ID
    const partnerId = (this.selectedChat.sender_id == this.user.id)
                      ? this.selectedChat.receiver_id
                      : this.selectedChat.sender_id;

    this.itemService.getChatHistory(this.user.id, partnerId, this.selectedChat.item_id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.activeMessages = res.messages;
          this.scrollToBottom();
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Could not load chat history", err)
    });
  }

  // 4. Send a reply back
  sendReply() {
  console.log("Send button clicked!"); 

  if (!this.replyText.trim() || !this.selectedChat) {
    console.log("Validation failed: text empty or no chat selected");
    return;
  }

  // Determine partner ID correctly
  const partnerId = (this.selectedChat.sender_id == this.user.id)
                    ? this.selectedChat.receiver_id
                    : this.selectedChat.sender_id;

  const payload = {
    sender_id: this.user.id,
    owner_id: partnerId,
    item_id: this.selectedChat.item_id,
    message: this.replyText
  };

  console.log("Sending payload:", payload); // Check this in F12 console

  this.itemService.sendMessageInquiry(payload.sender_id, payload.owner_id, payload.item_id, payload.message).subscribe({
    next: (res: any) => {
      console.log("Response from server:", res);
      if (res.status === 'success') {
        this.activeMessages.push({
          sender_id: this.user.id,
          message_text: this.replyText,
          created_at: new Date().toISOString()
        });
        this.replyText = '';
        this.scrollToBottom();
        this.cdr.detectChanges();
      }
    },
    error: (err) => console.error("API Error:", err)
  });
}

  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.message-bubbles');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}
