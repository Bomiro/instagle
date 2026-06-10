# InstaGle Bot

Anonymous random chat bot for Instagram DM. Acts as a proxy bridge between two random users in Instagram DMs.

## Features

- 🎲 **Random Matching**: 100% random pairing from universal queue
- 🔒 **Anti-Link Protection**: Blocks URLs, domains, and @usernames
- 👥 **Follower Gate**: Only followers can access the bot
- 🌐 **Bilingual**: Arabic (default) and English support
- 🚨 **Report System**: Strike-based moderation with auto-ban
- 📱 **Media Support**: Text, images, and voice notes

## Requirements

- Node.js 18+
- MongoDB 6+
- Instagram Business Account
- Meta Developer Account (for API access)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start MongoDB:**
```bash
docker run -d -p 27017:27017 --name instagle-mongo mongo:latest
```

4. **Start the bot:**
```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `INSTAGRAM_APP_ID` | Meta App ID | Yes |
| `INSTAGRAM_APP_SECRET` | Meta App Secret | Yes |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | Page access token | Yes |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | IG Business account ID | Yes |
| `WEBHOOK_VERIFY_TOKEN` | Webhook verification token | No |
| `APP_SECRET` | App secret for signature verification | Yes |

## Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Bot info |
| `/health` | GET | Health check with stats |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe |
| `/webhook` | GET | Webhook verification |
| `/webhook` | POST | Incoming DM events |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User A    │────▶│  Instagram  │────▶│   Webhook   │
│   (DM)      │◀────│    API      │◀────│   Handler   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          ▼                          │
                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
                    │  │   Queue     │  │   Matcher   │  │   Message   │  │
                    │  │   Service   │  │   Service   │  │   Handler   │  │
                    │  └─────────────┘  └─────────────┘  └─────────────┘  │
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          ▼                          │
                    │                   ┌─────────────┐                   │
                    │                   │   MongoDB   │                   │
                    │                   └─────────────┘                   │
                    └─────────────────────────────────────────────────────┘
```

## License

MIT

# gh
commit 2667b0de21e791bcb8b1db298b7b6a11c0953d50 
Date:   Wed Jun 10 13:47:35 2026 +0000

    2min

commit 0129a377dd90f8b46e9a1b79b7f2c491415f9ef9
Date:   Wed Jun 10 13:41:37 2026 +0000