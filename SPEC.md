# InstaGle Bot - Technical Specification

## 1. Project Overview

**Project Name:** InstaGle  
**Type:** Anonymous Random Chat Bot for Instagram DM  
**Core Functionality:** Acts as a proxy bridge between two random online users in Instagram DMs, enabling anonymous text, image, and voice note exchanges without revealing identities.  
**Target Users:** Arabic-speaking Instagram users seeking anonymous random conversations.  
**Infrastructure:** Node.js backend with Express, MongoDB database, Instagram Graph API integration.

---

## 2. Core Design Principles

### 2.1 Strict Core Restrictions

| Rule | Description |
|------|-------------|
| **No Matching System** | No filters, categories, or interest matching. Single universal queue with 100% random matching based on queue order. |
| **Anti-Link Protection** | STRICTLY forbidden: `http://`, `https://`, `www.`, domain endings (`.com`, `.net`, `.org`), `@usernames`. Blocked messages show Arabic warning. |
| **Follower Gate** | Users must follow the Instagram page before accessing the queue system. |

### 2.2 Supported Languages

| Language | Code | Default |
|----------|------|---------|
| Arabic (Modern Standard + Moroccan Darija) | `ar` | ✅ Yes |
| English | `en` | Fallback |

---

## 3. User States & Session Management

### 3.1 State Machine

```
┌─────────┐    start     ┌────────┐    paired    ┌───────────┐
│  IDLE   │ ──────────►  │ QUEUED │ ──────────► │  CHATTING │
└─────────┘              └────────┘              └───────────┘
     ▲                       │                       │
     │                       │ cancel                │ stop/next/report
     │                       ▼                       ▼
     │                  ┌────────┐              ┌─────────┐
     └──────────────────│  IDLE  │◄────────────│  IDLE   │
                        └────────┘             └─────────┘
                              │
                              │ 3 strikes/24h
                              ▼
                         ┌─────────┐
                         │ BANNED  │
                         └─────────┘
                              │
                              │ 48h later
                              ▼
                          ┌────────┐
                          │  IDLE  │
                          └────────┘
```

### 3.2 State Definitions

| State | Description |
|-------|-------------|
| `IDLE` | User is at main menu, can start chat or change settings |
| `QUEUED` | User is waiting in global pool for a partner |
| `CHATTING` | User is actively paired with another user |
| `BANNED` | User is temporarily blocked (48h) due to 3+ reports in 24h |

---

## 4. Workflow & UX Specification

### 4.1 Onboarding Flow

**Trigger:** User sends any DM to the bot (e.g., "Hi", "ابدأ")

**Step 1: Follower Check**
```
IF user.follows_page === false:
    → Send: "مرحباً! للتفاعل مع البوت، يرجى متابعة الحساب أولاً 👆"
    → Show: [Follow Button]
    → BLOCK until follows
```

**Step 2: Main Menu (Arabic - Default)**
```
Welcome Message:
"مرحباً بك في **InstaGle**! المنصة رقم #1 للدردشة العشوائية والسرية على إنستغرام. 💬"

Button Layout:
[🎲 ابدأ الدردشة] [🌐 تغيير اللغة] [ℹ️ كيف يعمل؟]
```

### 4.2 Queue Flow

**User clicks "🎲 ابدأ الدردشة":**
```
1. Set user.state = 'QUEUED'
2. Add to global queue (MongoDB)
3. Send: "جاري البحث عن شخص عشوائي... انتظر لحظة ⏳"
4. Show: [❌ إلغاء البحث]
```

**Cancel Queue:**
```
User clicks "❌ إلغاء البحث":
→ Remove from queue
→ Set user.state = 'IDLE'
→ Send: "تم إلغاء البحث. العودة للقائمة الرئيسية"
```

### 4.3 Matching Flow

**Automatic Pairing Logic:**
```
1. When user joins queue, check if queue.length >= 2
2. Pop first 2 users from queue
3. Create Session with user1_id, user2_id
4. Set both users' state = 'CHATTING'
5. Send to both:
   "🎉 تم العثور على شخص! يمكنكما التحدث الآن بكل سرية وأمان. هوّيتكما مجهولة تماماً."
6. Show persistent buttons:
   [⏩ التالي] [🛑 إيقاف] [🚨 تبليغ]
```

### 4.4 Active Chat Session

**Message Types Supported:**
- Text messages
- Images (photos sent as attachments)
- Voice notes (audio attachments)

**Forwarding Logic:**
```
User A sends message:
→ Capture payload
→ Check for links (regex)
→ IF link detected:
    → Block message
    → Send warning to User A (Arabic)
    → DO NOT forward to User B
→ IF clean:
    → Forward message to User B using Instagram API
    → Log message in MongoDB
```

**Persistent Controls (Quick Reply Buttons):**
| Button | Action | Result |
|--------|--------|--------|
| `⏩ التالي` | Leave current chat, find new partner | Disconnect, re-queue |
| `🛑 إيقاف` | End chat, return to main menu | Disconnect, state = IDLE |
| `🚨 تبليغ` | Report user for bad behavior | Disconnect, add strike |

### 4.5 Report System

**Flow:**
```
User clicks "🚨 تبليغ":
1. Disconnect current chat immediately
2. Add 1 strike to reported_user.strikes[]
3. IF reported_user.strikes.length >= 3 within 24h:
    → Set reported_user.state = 'BANNED'
    → Set reported_user.ban_until = now + 48h
    → Send to reported_user:
      "⚠️ تم حظر حسابك مؤقتاً لمدة 48 ساعة بسبب تلقي تبليغات متعددة عن سلوك غير لائق."
4. Send confirmation to reporter:
   "✅ تم تلقي تبليغك بنجاح. شكراً لمساعدتنا في الحفاظ على بيئة آمنة."
5. Both users return to IDLE state
```

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Database | MongoDB |
| ODM | Mongoose 7.x |
| API Integration | Instagram Graph API / Meta Messenger Platform |
| Testing | Jest + Supertest |
| Containerization | Docker + Docker Compose |

### 5.2 Project Structure

```
/workspace/project/instagle/
├── src/
│   ├── config/
│   │   ├── index.js           # Environment config loader
│   │   └── database.js        # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User schema & state management
│   │   ├── Session.js          # Chat session schema
│   │   ├── Message.js          # Message log schema
│   │   └── Report.js           # Report/strike tracking
│   ├── services/
│   │   ├── instagram.js        # Instagram Graph API wrapper
│   │   ├── queue.js           # Global queue management
│   │   ├── matcher.js         # Random pairing logic
│   │   ├── messageHandler.js   # Message processing & forwarding
│   │   ├── linkFilter.js       # Anti-link regex filter
│   │   └── translator.js       # i18n string management
│   ├── routes/
│   │   ├── webhook.js         # Instagram webhook endpoints
│   │   └── health.js          # Health check endpoint
│   ├── middleware/
│   │   ├── verifyWebhook.js    # Meta webhook verification
│   │   └── rateLimiter.js      # Rate limiting
│   ├── utils/
│   │   ├── constants.js        # Bot states, config constants
│   │   └── helpers.js          # Utility functions
│   └── app.js                  # Express app setup
├── tests/
│   ├── services/
│   │   ├── linkFilter.test.js
│   │   ├── matcher.test.js
│   │   └── queue.test.js
│   └── routes/
│       └── webhook.test.js
├── scripts/
│   └── setup.sh               # Environment setup script
├── .env.example                # Environment template
├── .gitignore
├── package.json
├── docker-compose.yml
├── Dockerfile
├── SPEC.md
└── README.md
```

### 5.3 Database Schemas

#### User Schema
```javascript
{
  instagram_id: String,          // Instagram user ID (unique)
  username: String,
  state: Enum['IDLE', 'QUEUED', 'CHATTING', 'BANNED'],
  language: String,              // 'ar' | 'en'
  strikes: [{
    reported_by: String,         // User ID who reported
    timestamp: Date
  }],
  ban_until: Date,
  current_session_id: ObjectId,  // Reference to Session
  created_at: Date,
  updated_at: Date
}
```

#### Session Schema
```javascript
{
  user_a_id: ObjectId,           // Reference to User
  user_b_id: ObjectId,           // Reference to User
  started_at: Date,
  ended_at: Date,
  ended_by: String,              // 'user_a' | 'user_b' | 'system'
  status: Enum['ACTIVE', 'ENDED']
}
```

#### Message Schema
```javascript
{
  session_id: ObjectId,
  sender_id: ObjectId,
  recipient_id: ObjectId,
  type: Enum['text', 'image', 'audio', 'video'],
  content: String,               // Text or media URL
  blocked: Boolean,              // Link filter triggered
  created_at: Date
}
```

#### Report Schema
```javascript
{
  reporter_id: ObjectId,
  reported_id: ObjectId,
  session_id: ObjectId,
  reason: String,
  created_at: Date
}
```

---

## 6. API Specification

### 6.1 Instagram Webhook Events

| Event | Endpoint | Description |
|-------|----------|-------------|
| `messages` | POST `/webhook` | Incoming DM events |
| `verify` | GET `/webhook` | Webhook verification for Meta |

### 6.2 Message Types Handled

| Type | Field | Description |
|------|-------|-------------|
| Text | `text` | Plain text messages |
| Image | `attachments[0].type === 'image'` | Photo attachments |
| Audio | `attachments[0].type === 'audio'` | Voice notes |

### 6.3 Outgoing Message Format

```javascript
// Send via Instagram Send API
{
  recipient: { id: USER_INSTAGRAM_ID },
  message: {
    text: "Message content" // OR
    attachment: {
      type: "image" | "audio",
      payload: { url: "MEDIA_URL" }
    }
  }
}
```

---

## 7. Link Filter Specification

### 7.1 Regex Patterns

```javascript
const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,                    // http://, https://
  /www\.[^\s]+/gi,                          // www.
  /[\w.-]+\.(com|net|org|io|co|gov|edu)[^\s]*/gi,  // Domain endings
  /@[a-zA-Z0-9_]+/g,                        // @usernames
  /t\.me\/[^\s]+/gi,                        // Telegram
  /wa\.me\/[^\s]+/gi,                       // WhatsApp
  /discord\.gg\/[^\s]+/gi                   // Discord invites
];
```

### 7.2 Warning Message (Arabic)

```
⚠️ "عذراً، مشاركة الروابط أو الحسابات ممنوعة تماماً داخل المحادثة للحفاظ على الأمان والسرية!"
```

---

## 8. Translation System

### 8.1 String Storage Structure

```javascript
const strings = {
  ar: {
    welcome: "مرحباً بك في **InstaGle**! المنصة رقم #1 للدردشة العشوائية والسرية على إنستغرام. 💬",
    not_following: "مرحباً! للتفاعل مع البوت، يرجى متابعة الحساب أولاً 👆",
    searching: "جاري البحث عن شخص عشوائي... انتظر لحظة ⏳",
    found_partner: "🎉 تم العثور على شخص! يمكنكما التحدث الآن بكل سرية وأمان. هوّيتكما مجهولة تماماً.",
    link_warning: "⚠️ عذراً، مشاركة الروابط أو الحسابات ممنوعة تماماً داخل المحادثة للحفاظ على الأمان والسرية!",
    banned: "⚠️ تم حظر حسابك مؤقتاً لمدة 48 ساعة بسبب تلقي تبليغات متعددة عن سلوك غير لائق.",
    report_confirm: "✅ تم تلقي تبليغك بنجاح. شكراً لمساعدتنا في الحفاظ على بيئة آمنة.",
    disconnected: "🔌 تم قطع الاتصال. العودة للقائمة الرئيسية.",
    // Buttons
    start_chat: "🎲 ابدأ الدردشة",
    change_language: "🌐 تغيير اللغة",
    how_it_works: "ℹ️ كيف يعمل؟",
    cancel_search: "❌ إلغاء البحث",
    next: "⏩ التالي",
    stop: "🛑 إيقاف",
    report: "🚨 تبليغ"
  },
  en: {
    welcome: "Welcome to **InstaGle**! The #1 platform for random and anonymous chat on Instagram. 💬",
    not_following: "Hello! To interact with the bot, please follow the account first 👆",
    searching: "Searching for a random person... please wait ⏳",
    found_partner: "🎉 Match found! You can now talk freely and safely. Your identity is completely anonymous.",
    link_warning: "⚠️ Sorry, sharing links or accounts is strictly forbidden in chat to maintain safety and privacy!",
    banned: "⚠️ Your account has been temporarily banned for 48 hours due to multiple reports of inappropriate behavior.",
    report_confirm: "✅ Your report has been received. Thank you for helping us maintain a safe environment.",
    disconnected: "🔌 Disconnected. Returning to main menu.",
    // Buttons
    start_chat: "🎲 Start Chat",
    change_language: "🌐 Change Language",
    how_it_works: "ℹ️ How it works?",
    cancel_search: "❌ Cancel Search",
    next: "⏩ Next",
    stop: "🛑 Stop",
    report: "🚨 Report"
  }
};
```

---

## 9. Error Handling

### 9.1 Error Types & Responses

| Error Type | HTTP Code | Action |
|------------|-----------|--------|
| Invalid webhook signature | 403 | Reject request |
| User not found | 404 | Create new user record |
| Rate limit exceeded | 429 | Retry after delay |
| Instagram API error | 500 | Log error, retry with backoff |
| Database connection error | 503 | Health check fails |

### 9.2 Retry Strategy

```javascript
// Exponential backoff for API calls
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 10000   // 10 seconds
};
```

---

## 10. Security Considerations

1. **Webhook Verification:** All webhook requests must be verified using Meta's signature validation
2. **Rate Limiting:** Max 30 messages per minute per user
3. **Link Blocking:** Client-side AND server-side validation
4. **Ban Enforcement:** Automatic ban after 3 strikes in 24 hours
5. **Environment Variables:** All secrets stored in `.env`, never committed to git

---

## 11. Acceptance Criteria

- [ ] User can send DM and receive welcome message in Arabic
- [ ] Follower check blocks non-followers with prompt to follow
- [ ] Queue system works with "Start Chat" and "Cancel Search" buttons
- [ ] Random matching pairs two users when queue has >= 2 users
- [ ] Both users see "Match found" message with persistent control buttons
- [ ] Text, image, and voice note messages are forwarded correctly
- [ ] Links are blocked with Arabic warning message
- [ ] Report system adds strikes and triggers ban at 3 strikes
- [ ] Banned users see ban message for 48 hours
- [ ] Language can be changed via button (stores per user)
- [ ] All states (IDLE, QUEUED, CHATTING, BANNED) work correctly
- [ ] Docker deployment works with `docker-compose up`
- [ ] Unit tests pass for link filter, matcher, and queue services