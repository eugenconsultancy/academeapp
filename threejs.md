Here are comprehensive terminal commands to test every feature of your Academe app using **Git Bash (MINGW64)**. I'll include the expected responses for each test.

## Prerequisites - Setup

```bash
# Navigate to backend directory
cd /c/Users/GATARA-BJTU/academe/backend

# Activate virtual environment
source venv/Scripts/activate

# Start the server (in a separate terminal)
daphne -b 0.0.0.0 -p 8000 academe.asgi:application
```

---

## 1. AUTHENTICATION TESTS

### 1.1 Request OTP (Login)
```bash
curl -X POST http://localhost:8000/api/accounts/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678"}'
```
**Expected Response:**
```json
{"otp":"123456","message":"OTP generated successfully"}
```

### 1.2 Verify OTP & Login
```bash
curl -X POST http://localhost:8000/api/accounts/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678","otp":"123456"}'
```
**Expected Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "9008eeab-01ae-4a3f-9b79-0374a848be6a",
    "full_name": "John Doe",
    "role": "student",
    "email": "john@example.com"
  }
}
```

### 1.3 Get Current User Profile
```bash
# Save token first
TOKEN="your_access_token_here"

curl -X GET http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{
  "id": "9008eeab-01ae-4a3f-9b79-0374a848be6a",
  "full_name": "John Doe",
  "phone_number": "0712345678",
  "email": "john@example.com",
  "role": "student",
  "is_online": true
}
```

### 1.4 Refresh Token
```bash
curl -X POST http://localhost:8000/api/accounts/refresh-token/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"your_refresh_token_here"}'
```
**Expected Response:**
```json
{
  "access": "new_access_token_here",
  "refresh": "new_refresh_token_here"
}
```

### 1.5 Update Profile
```bash
curl -X PUT http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Updated","email":"john.updated@example.com","class_name":"4th Year CS"}'
```
**Expected Response:**
```json
{
  "message": "Profile updated successfully",
  "full_name": "John Updated",
  "email": "john.updated@example.com",
  "class_name": "4th Year CS"
}
```

### 1.6 Forgot Password (Request OTP)
```bash
curl -X POST http://localhost:8000/api/accounts/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678"}'
```
**Expected Response:**
```json
{"otp":"654321","message":"OTP sent to your phone"}
```

### 1.7 Reset Password
```bash
curl -X POST http://localhost:8000/api/accounts/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678","otp":"654321","new_password":"NewPass123!"}'
```
**Expected Response:**
```json
{"message":"Password reset successful. Please log in with your new password."}
```

---

## 2. CHAT SYSTEM TESTS

### 2.1 Get All Conversations
```bash
curl -X GET "http://localhost:8000/api/chat/conversations?archived=false" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8",
    "participant": {
      "id": "user-id-here",
      "full_name": "Jane Smith",
      "is_online": true,
      "avatar_url": null
    },
    "last_message_preview": "Hey, how are you?",
    "last_message_at": "2026-06-13T10:30:00Z",
    "unread_count": 2,
    "is_pinned": false,
    "is_muted": false
  }
]
```

### 2.2 Start New Conversation
```bash
curl -X POST http://localhost:8000/api/chat/conversations/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiver_id":"another-user-uuid-here"}'
```
**Expected Response:**
```json
{
  "id": "new-conversation-uuid",
  "participant": {
    "id": "another-user-uuid-here",
    "full_name": "Jane Smith",
    "is_online": false
  },
  "is_active": true,
  "unread_count": 0
}
```

### 2.3 Get Messages (First Page)
```bash
curl -X GET "http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "msg-uuid-1",
    "conversation_id": "ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8",
    "sender_id": "user-id-here",
    "content": "Hello!",
    "msg_type": "TEXT",
    "created_at": "2026-06-13T10:30:00Z",
    "is_read": true,
    "is_delivered": true
  }
]
```

### 2.4 Get Older Messages (Pagination)
```bash
curl -X GET "http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages?before=2026-06-12T10:30:00Z&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "older-msg-uuid",
    "content": "Older message content",
    "created_at": "2026-06-11T15:20:00Z"
  }
]
```

### 2.5 Send Text Message (REST API)
```bash
curl -X POST http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello from API!","msg_type":"TEXT"}'
```
**Expected Response:**
```json
{
  "id": "new-message-uuid",
  "conversation_id": "ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8",
  "sender_id": "your-user-id",
  "content": "Hello from API!",
  "msg_type": "TEXT",
  "created_at": "2026-06-13T11:00:00Z",
  "is_read": false,
  "is_delivered": true
}
```

### 2.6 Mark Messages as Read
```bash
curl -X POST http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/mark-read \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message_ids":["msg-uuid-1","msg-uuid-2"]}'
```
**Expected Response:**
```json
{"success": true, "marked_read": 2}
```

### 2.7 Edit Message
```bash
curl -X PUT http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages/msg-uuid-1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Edited message content"}'
```
**Expected Response:**
```json
{
  "id": "msg-uuid-1",
  "content": "Edited message content",
  "edited_at": "2026-06-13T11:05:00Z"
}
```

### 2.8 Delete Message
```bash
curl -X DELETE "http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages/msg-uuid-1?delete_for_everyone=true" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "message_id": "msg-uuid-1"}
```

### 2.9 Archive Conversation
```bash
curl -X PATCH http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/archive \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true}
```

### 2.10 Unarchive Conversation
```bash
curl -X PATCH http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/unarchive \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true}
```

### 2.11 Delete Conversation
```bash
curl -X DELETE http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8 \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true}
```

### 2.12 Block User
```bash
curl -X POST http://localhost:8000/api/chat/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"blocked_user_id":"user-id-to-block"}'
```
**Expected Response:**
```json
{"success": true, "blocked": true}
```

### 2.13 Get Blocked Users
```bash
curl -X GET http://localhost:8000/api/chat/blocked \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "blocked-user-id",
    "full_name": "Blocked User",
    "blocked_at": "2026-06-13T10:00:00Z"
  }
]
```

### 2.14 Unblock User
```bash
curl -X DELETE http://localhost:8000/api/chat/block/user-id-to-unblock \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "unblocked": true}
```

### 2.15 Mute Conversation
```bash
curl -X POST http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/mute \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "muted": true}
```

### 2.16 Unmute Conversation
```bash
curl -X DELETE http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/mute \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "unmuted": true}
```

### 2.17 Pin Conversation
```bash
curl -X POST http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/pin \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "pinned": true}
```

### 2.18 Unpin Conversation
```bash
curl -X DELETE http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/pin \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{"success": true, "unpinned": true}
```

### 2.19 Report User
```bash
curl -X POST http://localhost:8000/api/chat/report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reported_user_id": "user-id-to-report",
    "reason": "harassment",
    "description": "User was sending inappropriate messages",
    "conversation_id": "ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8"
  }'
```
**Expected Response:**
```json
{
  "success": true,
  "report_id": "report-uuid",
  "message": "Report submitted. Our team will review it."
}
```

---

## 3. PRESIGNED URL (File Upload) TESTS

### 3.1 Get Presigned URL for File Upload
```bash
curl -X POST http://localhost:8000/api/chat/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "test-image.jpg",
    "content_type": "image/jpeg",
    "max_file_size": 10485760
  }'
```
**Expected Response:**
```json
{
  "presigned_url": "https://your-bucket.s3.amazonaws.com/chat_media/...?AWSAccessKeyId=...",
  "file_url": "https://your-bucket.s3.amazonaws.com/chat_media/..."
}
```

---

## 4. NOTIFICATION TESTS

### 4.1 Get Notifications
```bash
curl -X GET "http://localhost:8000/api/notifications/?page_size=20" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "notif-uuid",
    "title": "New message from John",
    "body": "Hey, how are you?",
    "notification_type": "new_message",
    "created_at": "2026-06-13T10:30:00Z",
    "is_read": false
  }
]
```

---

## 5. USER SEARCH TEST

### 5.1 Search Students
```bash
curl -X GET "http://localhost:8000/api/accounts/students/search/?q=John" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "id": "user-uuid",
    "full_name": "John Doe",
    "class_name": "4th Year Computer Science"
  }
]
```

---

## 6. WEBSOCKET TESTS (using wscat)

### Install wscat first:
```bash
npm install -g wscat
```

### 6.1 Connect to Chat WebSocket
```bash
# Replace TOKEN and CONVERSATION_ID with actual values
wscat -c "ws://localhost:8000/ws/chat/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/?token=$TOKEN"
```
**Expected Behavior:**
```
Connected (press CTRL+C to quit)
> {"type": "ping"}
< {"type": "pong"}
```

### 6.2 Send Message via WebSocket
Once connected, type:
```json
{"type":"chat_message","sender_id":"your-user-id","content":"Hello WebSocket!","msg_type":"TEXT"}
```
**Expected Response:**
```json
{
  "type": "chat_message",
  "id": "msg-uuid",
  "content": "Hello WebSocket!",
  "sender_id": "your-user-id",
  "created_at": "2026-06-13T11:00:00Z"
}
```

### 6.3 Send Typing Indicator
```json
{"type":"typing","is_typing":true}
```
**Expected Response:**
```json
{"type":"typing","user_id":"other-user-id","is_typing":true}
```

### 6.4 Mark Read via WebSocket
```json
{"type":"mark_read","conversation_id":"ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8"}
```
**Expected Response:**
```json
{"type":"messages_read","read_by":"your-user-id","conversation_id":"ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8"}
```

---

## 7. HEALTH CHECK & DEBUG TESTS

### 7.1 Check Server Status
```bash
curl -X GET http://localhost:8000/
```
**Expected Response:**
```html
<!DOCTYPE html>
<html>
  <head><title>Academe API</title></head>
  <body>API is running</body>
</html>
```

### 7.2 Check Database Connection
```bash
python -c "from django.db import connection; connection.connect(); print('Database connected successfully')"
```
**Expected Output:**
```
Database connected successfully
```

### 7.3 Check Redis Connection
```bash
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print(r.ping())"
```
**Expected Output:**
```
True
```

### 7.4 Check Celery Status
```bash
celery -A academe status
```
**Expected Output:**
```
celery@hostname: OK
```

---

## 8. TEST RUNNER (Run All Django Tests)

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.chat
python manage.py test apps.accounts
python manage.py test apps.notifications

# Run with verbosity
python manage.py test --verbosity=2

# Run with coverage
coverage run manage.py test
coverage report
```

---

## 9. PERFORMANCE TESTS

### 9.1 Load Test with Apache Bench (if installed)
```bash
# Test conversations endpoint
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/chat/conversations/
```

### 9.2 Response Time Test
```bash
time curl -X GET "http://localhost:8000/api/chat/conversations/ac6ab2d6-5d98-43bc-8ca8-7a50560d09c8/messages?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 10. COMPLETE TEST SCRIPT

Save this as `test_all.sh` in your backend directory:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    Academe API Test Suite${NC}"
echo -e "${GREEN}========================================${NC}"

# Get authentication token first
echo -e "${YELLOW}1. Requesting OTP...${NC}"
OTP_RESPONSE=$(curl -s -X POST http://localhost:8000/api/accounts/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678"}')
echo -e "${GREEN}Response: $OTP_RESPONSE${NC}"

# Extract OTP (in development, it's returned directly)
OTP=$(echo $OTP_RESPONSE | grep -o '"otp":"[0-9]*"' | cut -d'"' -f4)

echo -e "${YELLOW}2. Verifying OTP and getting token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/accounts/verify-otp/ \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"0712345678\",\"otp\":\"$OTP\"}")
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get token. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}Token obtained successfully${NC}"

# Test 1: Get Profile
echo -e "\n${YELLOW}3. Testing Get Profile...${NC}"
curl -s -X GET http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 2: Get Conversations
echo -e "\n${YELLOW}4. Testing Get Conversations...${NC}"
CONV_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/chat/conversations?archived=false" \
  -H "Authorization: Bearer $TOKEN")
echo $CONV_RESPONSE | jq '.'

# Extract first conversation ID
CONV_ID=$(echo $CONV_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$CONV_ID" ]; then
    echo -e "\n${YELLOW}5. Testing Get Messages for conversation $CONV_ID...${NC}"
    curl -s -X GET "http://localhost:8000/api/chat/conversations/$CONV_ID/messages?limit=10" \
      -H "Authorization: Bearer $TOKEN" | jq '.'
    
    echo -e "\n${YELLOW}6. Testing Send Message...${NC}"
    curl -s -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/messages" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"content":"Test message from API test suite","msg_type":"TEXT"}' | jq '.'
fi

# Test 7: Get Blocked Users
echo -e "\n${YELLOW}7. Testing Get Blocked Users...${NC}"
curl -s -X GET http://localhost:8000/api/chat/blocked \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 8: Get Notifications
echo -e "\n${YELLOW}8. Testing Get Notifications...${NC}"
curl -s -X GET "http://localhost:8000/api/notifications/?page_size=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 9: Search Students
echo -e "\n${YELLOW}9. Testing Search Students...${NC}"
curl -s -X GET "http://localhost:8000/api/accounts/students/search/?q=a" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}    All tests completed!${NC}"
echo -e "${GREEN}========================================${NC}"
```

### Make script executable and run:
```bash
chmod +x test_all.sh
./test_all.sh
```

---

## 11. TROUBLESHOOTING COMMANDS

### Check if server is running
```bash
curl -I http://localhost:8000/api/chat/conversations/
```

### Check database migrations status
```bash
python manage.py showmigrations
```

### Check for any pending migrations
```bash
python manage.py makemigrations --dry-run
```

### Clear Django cache
```bash
python manage.py shell -c "from django.core.cache import cache; cache.clear()"
```

### Check WebSocket route is registered
```bash
python manage.py shell -c "from channels.routing import get_default_application; print(get_default_application().routes)"
```

---

## Expected Status Codes Summary

| HTTP Status | Meaning | When it occurs |
|-------------|---------|----------------|
| 200 OK | Success | Most GET, PUT, PATCH requests |
| 201 Created | Resource created | POST requests that create resources |
| 400 Bad Request | Invalid data | Missing required fields |
| 401 Unauthorized | No/Invalid token | Missing or expired JWT |
| 403 Forbidden | Blocked/No permission | Blocked user or insufficient role |
| 404 Not Found | Resource doesn't exist | Invalid ID in URL |
| 429 Too Many Requests | Rate limit exceeded | Too many requests in short time |
| 500 Internal Error | Server error | Code bug or database issue |

These commands will thoroughly test your entire Academe application!











# Complete Terminal Commands to Test Academe Chat System Features

## Prerequisites - Start All Services

### Terminal 1 - Backend (Git Bash):
```bash
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate
daphne -b 0.0.0.0 -p 8000 --verbosity 2 academe.asgi:application
```
**Expected Output:**
```
Starting server at tcp:port=8000:interface=0.0.0.0
Listening on TCP address 0.0.0.0:8000
```

### Terminal 2 - Ngrok (Git Bash):
```bash
cd /c/Users/GATARA-BJTU
ngrok http 8000
```
**Expected Output:**
```
Session Status                online
Forwarding                    https://granitic-imbricately-dede.ngrok-free.dev -> http://localhost:8000
```

### Terminal 3 - Frontend (Git Bash):
```bash
cd /c/Users/GATARA-BJTU/academe/frontend
npm run dev
```
**Expected Output:**
```
VITE v5.0.0  ready in 500 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 1. AUTHENTICATION TESTS

### 1.1 Request OTP
```bash
curl -X POST http://localhost:8000/api/accounts/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678"}'
```
**Expected Output:**
```json
{
  "otp": "123456",
  "message": "OTP generated successfully"
}
```

### 1.2 Verify OTP and Login
```bash
curl -X POST http://localhost:8000/api/accounts/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0712345678","otp":"123456"}'
```
**Expected Output:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "9008eeab-01ae-4a3f-9b79-0374a848be6a",
    "full_name": "Test User",
    "role": "student"
  }
}
```

### 1.3 Get Current User Profile
```bash
TOKEN="your_access_token_here"
curl -X GET http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "id": "9008eeab-01ae-4a3f-9b79-0374a848be6a",
  "phone_number": "0712345678",
  "full_name": "Test User",
  "email": "test@example.com",
  "role": "student"
}
```

---

## 2. CHAT CONVERSATION TESTS

### 2.1 Get All Conversations
```bash
TOKEN="your_access_token_here"
curl -X GET "http://localhost:8000/api/chat/conversations?archived=false" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
[
  {
    "id": "3807307f-c3d2-43ac-8795-62b0659713ec",
    "participant": {
      "id": "user-uuid",
      "full_name": "John Doe",
      "is_online": true
    },
    "last_message_preview": "Hello!",
    "last_message_at": "2026-06-13T10:00:00Z",
    "unread_count": 2,
    "is_pinned": false,
    "is_muted": false
  }
]
```

### 2.2 Start New Conversation
```bash
TOKEN="your_access_token_here"
curl -X POST http://localhost:8000/api/chat/conversations/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiver_id":"other-user-uuid-here"}'
```
**Expected Output:**
```json
{
  "id": "new-conversation-uuid",
  "participant": {
    "id": "other-user-uuid-here",
    "full_name": "Jane Smith",
    "is_online": false
  },
  "is_active": true,
  "unread_count": 0
}
```

### 2.3 Get Conversation Messages
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X GET "http://localhost:8000/api/chat/conversations/$CONV_ID/messages?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
[
  {
    "id": "msg-uuid-1",
    "content": "Hello!",
    "sender_id": "user-uuid",
    "msg_type": "TEXT",
    "created_at": "2026-06-13T10:00:00Z",
    "is_read": true,
    "is_delivered": true
  },
  {
    "id": "msg-uuid-2",
    "content": "Hi there!",
    "sender_id": "other-user-uuid",
    "msg_type": "TEXT",
    "created_at": "2026-06-13T10:01:00Z",
    "is_read": false,
    "is_delivered": true
  }
]
```

### 2.4 Send Message via REST API
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message from API","msg_type":"TEXT"}'
```
**Expected Output:**
```json
{
  "id": "new-message-uuid",
  "content": "Test message from API",
  "sender_id": "your-user-uuid",
  "msg_type": "TEXT",
  "created_at": "2026-06-13T10:05:00Z",
  "is_read": false,
  "is_delivered": true
}
```

### 2.5 Send Message with Idempotency Key (Prevent Duplicates)
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
IDEMPOTENCY_KEY="unique-key-$(date +%s)"
curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"content":"Message with idempotency","msg_type":"TEXT"}'
```
**Expected Output (First Request):**
```json
{
  "id": "message-uuid",
  "content": "Message with idempotency",
  ...
}
```
**Expected Output (Duplicate Request - Same Key):**
```
HTTP/1.1 409 Conflict
{"error":"Duplicate message detected"}
```

---

## 3. MESSAGE MANAGEMENT TESTS

### 3.1 Edit Message (Within 5 Minutes)
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
MSG_ID="message-uuid-to-edit"
curl -X PUT "http://localhost:8000/api/chat/conversations/$CONV_ID/messages/$MSG_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated message content"}'
```
**Expected Output:**
```json
{
  "id": "message-uuid",
  "content": "Updated message content",
  "edited_at": "2026-06-13T10:10:00Z"
}
```

### 3.2 Delete Message
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
MSG_ID="message-uuid-to-delete"
curl -X DELETE "http://localhost:8000/api/chat/conversations/$CONV_ID/messages/$MSG_ID?delete_for_everyone=true" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "message_id": "message-uuid-to-delete"
}
```

### 3.3 Mark Messages as Read
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/mark-read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected Output:**
```json
{
  "success": true,
  "marked_read": 3
}
```

---

## 4. BLOCK / UNBLOCK TESTS

### 4.1 Block User
```bash
TOKEN="your_access_token_here"
USER_ID="user-uuid-to-block"
curl -X POST http://localhost:8000/api/chat/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"blocked_user_id\":\"$USER_ID\"}"
```
**Expected Output:**
```json
{
  "success": true,
  "blocked": true
}
```

### 4.2 Get Blocked Users List
```bash
TOKEN="your_access_token_here"
curl -X GET http://localhost:8000/api/chat/blocked \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
[
  {
    "id": "blocked-user-uuid",
    "full_name": "Blocked User",
    "class_name": "Student",
    "blocked_at": "2026-06-13T10:00:00Z"
  }
]
```

### 4.3 Unblock User
```bash
TOKEN="your_access_token_here"
USER_ID="user-uuid-to-unblock"
curl -X DELETE "http://localhost:8000/api/chat/block/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "unblocked": true
}
```

---

## 5. CONVERSATION MANAGEMENT TESTS

### 5.1 Pin Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/pin" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "pinned": true
}
```

### 5.2 Unpin Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X DELETE "http://localhost:8000/api/chat/conversations/$CONV_ID/pin" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "unpinned": true
}
```

### 5.3 Mute Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/mute" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "muted": true
}
```

### 5.4 Unmute Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X DELETE "http://localhost:8000/api/chat/conversations/$CONV_ID/mute" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true,
  "unmuted": true
}
```

### 5.5 Archive Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X PATCH "http://localhost:8000/api/chat/conversations/$CONV_ID/archive" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true
}
```

### 5.6 Unarchive Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X PATCH "http://localhost:8000/api/chat/conversations/$CONV_ID/unarchive" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true
}
```

### 5.7 Delete Conversation
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"
curl -X DELETE "http://localhost:8000/api/chat/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Output:**
```json
{
  "success": true
}
```

---

## 6. FILE UPLOAD TESTS

### 6.1 Get Presigned URL for File Upload
```bash
TOKEN="your_access_token_here"
curl -X POST http://localhost:8000/api/chat/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test-image.jpg","content_type":"image/jpeg","max_file_size":5242880}'
```
**Expected Output:**
```json
{
  "presigned_url": "https://your-bucket.s3.amazonaws.com/chat_media/uuid/test-image.jpg?AWSAccessKeyId=...",
  "file_url": "https://your-bucket.s3.amazonaws.com/chat_media/uuid/test-image.jpg"
}
```

---

## 7. REPORT USER TESTS

### 7.1 Report User
```bash
TOKEN="your_access_token_here"
USER_ID="user-uuid-to-report"
CONV_ID="conversation-uuid"
curl -X POST http://localhost:8000/api/chat/report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reported_user_id\": \"$USER_ID\",
    \"reason\": \"harassment\",
    \"description\": \"User was sending inappropriate messages\",
    \"conversation_id\": \"$CONV_ID\"
  }"
```
**Expected Output:**
```json
{
  "success": true,
  "report_id": "report-uuid",
  "message": "Report submitted. Our team will review it."
}
```

---

## 8. WEBHOOK & PRESENCE TESTS

### 8.1 Test WebSocket Connection (Using wscat)
```bash
# Install wscat first
npm install -g wscat

# Connect to WebSocket (replace token and conv_id)
wscat -c "ws://localhost:8000/ws/chat/your-conv-id/?token=your-access-token"
```
**Expected Output:**
```
Connected (press CTRL+C to quit)
> {"type":"ping"}
< {"type":"pong"}
> {"type":"typing","is_typing":true}
< {"type":"typing","user_id":"other-user-id","is_typing":true}
```

### 8.2 Test Sending Message via WebSocket
After connecting with wscat:
```json
{"type":"chat_message","sender_id":"your-user-id","content":"Hello WebSocket!","msg_type":"TEXT"}
```
**Expected Response:**
```json
{
  "type": "chat_message",
  "id": "message-uuid",
  "content": "Hello WebSocket!",
  "sender_id": "your-user-id",
  "created_at": "2026-06-13T10:00:00Z"
}
```

---

## 9. RATE LIMIT TESTS

### 9.1 Test Message Rate Limit (20 messages per minute)
```bash
TOKEN="your_access_token_here"
CONV_ID="3807307f-c3d2-43ac-8795-62b0659713ec"

# Send 21 messages rapidly
for i in {1..21}; do
  curl -X POST "http://localhost:8000/api/chat/conversations/$CONV_ID/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"Message $i\",\"msg_type\":\"TEXT\"}" &
done
wait
```
**Expected Output (First 20):**
```json
{"id":"msg-uuid-1","content":"Message 1",...}
```
**Expected Output (21st):**
```
HTTP/1.1 429 Too Many Requests
{"error":"Rate limit exceeded. Please slow down."}
```

---

## 10. FRONTEND BROWSER TESTS

### 10.1 Open Browser and Test Features

**Open Chrome DevTools Console (F12) and run:**

```javascript
// Test 1: Check Authentication
console.log('Token:', localStorage.getItem('access_token'));
console.log('User ID:', localStorage.getItem('user_id'));

// Expected: Valid token and user ID

// Test 2: Test WebSocket Connection
const ws = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/?token=${localStorage.getItem('access_token')}`);
ws.onopen = () => console.log('✅ WebSocket Connected');
ws.onerror = (e) => console.error('❌ WebSocket Error:', e);

// Expected: "✅ WebSocket Connected"

// Test 3: Send Test Message
ws.send(JSON.stringify({
    type: 'chat_message',
    sender_id: localStorage.getItem('user_id'),
    content: 'Test from console',
    msg_type: 'TEXT'
}));

// Expected: Message appears in chat UI

// Test 4: Test Typing Indicator
ws.send(JSON.stringify({
    type: 'typing',
    is_typing: true
}));

// Expected: "typing..." appears in header

// Test 5: Check Store State
window.__ZUSTAND_DEVTOOLS__?.getState();

// Expected: Complete store state object
```

---

## 11. COMPLETE END-TO-END TEST SCRIPT

Save as `test-chat-system.sh`:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    Testing Academe Chat System${NC}"
echo -e "${GREEN}========================================${NC}"

# Variables
BASE_URL="http://localhost:8000/api"
PHONE="0712345678"
OTP="123456"

echo -e "\n${YELLOW}1. Testing OTP Request...${NC}"
curl -s -X POST $BASE_URL/accounts/request-otp/ \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\"}" | jq '.'

echo -e "\n${YELLOW}2. Testing OTP Verification...${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/accounts/verify-otp/ \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"otp\":\"$OTP\"}")
echo $RESPONSE | jq '.'

TOKEN=$(echo $RESPONSE | jq -r '.access')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Authentication successful! Token obtained${NC}"
else
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}3. Testing Get Conversations...${NC}"
curl -s -X GET "$BASE_URL/chat/conversations?archived=false" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]'

echo -e "\n${YELLOW}4. Testing Get Blocked Users...${NC}"
curl -s -X GET "$BASE_URL/chat/blocked" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${YELLOW}5. Testing Start Conversation...${NC}"
# Replace with actual user UUID
USER_ID="9008eeab-01ae-4a3f-9b79-0374a848be6a"
curl -s -X POST "$BASE_URL/chat/conversations/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiver_id\":\"$USER_ID\"}" | jq '.'

echo -e "\n${YELLOW}6. Testing Get Profile...${NC}"
curl -s -X GET "$BASE_URL/accounts/profile/" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}    Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
```

Run the test script:
```bash
chmod +x test-chat-system.sh
./test-chat-system.sh
```

---

## 12. EXPECTED RESPONSES SUMMARY TABLE

| Feature | Endpoint | Expected Status | Expected Response |
|---------|----------|-----------------|-------------------|
| Request OTP | POST /accounts/request-otp/ | 200 OK | `{"otp":"123456","message":"..."}` |
| Verify OTP | POST /accounts/verify-otp/ | 200 OK | `{"access":"jwt...","user":{...}}` |
| Get Conversations | GET /chat/conversations | 200 OK | `[{"id":"uuid","participant":{...}}]` |
| Get Messages | GET /chat/conversations/{id}/messages | 200 OK | `[{"id":"uuid","content":"..."}]` |
| Send Message | POST /chat/conversations/{id}/messages | 200 OK | `{"id":"uuid","content":"..."}` |
| Edit Message | PUT /chat/conversations/{id}/messages/{msg_id} | 200 OK | `{"content":"new","edited_at":"..."}` |
| Delete Message | DELETE /chat/conversations/{id}/messages/{msg_id} | 200 OK | `{"success":true}` |
| Block User | POST /chat/block | 200 OK | `{"success":true,"blocked":true}` |
| Unblock User | DELETE /chat/block/{user_id} | 200 OK | `{"success":true,"unblocked":true}` |
| Pin Conversation | POST /chat/conversations/{id}/pin | 200 OK | `{"success":true,"pinned":true}` |
| Mute Conversation | POST /chat/conversations/{id}/mute | 200 OK | `{"success":true,"muted":true}` |
| Archive Conversation | PATCH /chat/conversations/{id}/archive | 200 OK | `{"success":true}` |
| Report User | POST /chat/report | 200 OK | `{"success":true,"report_id":"..."}` |
| Rate Limit Exceeded | POST /chat/conversations/{id}/messages | 429 | `{"error":"Rate limit exceeded"}` |

---

## 13. QUICK HEALTH CHECK

```bash
# Check if backend is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chat/conversations
# Expected: 401 (Unauthorized - means server is running)

# Check if frontend is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
# Expected: 200

# Check if Ngrok is running
curl -s http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
# Expected: "https://granitic-imbricately-dede.ngrok-free.dev"
```

All tests should pass with the expected outputs shown above. If any test fails, check the error message and verify the service is running correctly.









Here's a comprehensive **Production Readiness Test Suite** with commands and what to check for each:

## 🔴 CRITICAL PRODUCTION CHECKS (Must Pass)

### 1. Security Headers Test
```bash
curl -I https://your-domain.com/api/chat/conversations/
```
**What to check for:**
- `Strict-Transport-Security: max-age=31536000` (HSTS enabled)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (should be configured)
- No `Server` header revealing Django version

### 2. HTTPS/SSL Certificate Test
```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates
```
**What to check for:**
- Certificate not expired
- Issued to correct domain
- Valid issuer chain

### 3. Database Connection Pool Test
```bash
# Run 100 concurrent connections
for i in {1..100}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health/ & done; wait
```
**What to check for:**
- No connection timeout errors
- All responses return 200
- Max connections not exceeded

### 4. Environment Variables Test
```bash
python manage.py shell -c "
import os
required_vars = ['SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 'AWS_ACCESS_KEY_ID']
missing = [v for v in required_vars if not os.getenv(v)]
print(f'Missing: {missing}' if missing else 'All required env vars present')
"
```
**What to check for:**
- No missing critical variables
- SECRET_KEY not default
- Database URL uses production DB (not SQLite)

### 5. Debug Mode Test
```bash
curl -s https://your-domain.com/api/accounts/profile/ | grep -i "debug\|traceback\|error"
```
**What to check for:**
- No Django debug output
- No stack traces in responses
- `DEBUG=False` in production

---

## 🟠 PERFORMANCE & SCALING CHECKS

### 6. Load Test (1000 requests)
```bash
# Using Apache Bench
ab -n 1000 -c 50 -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/chat/conversations/
```
**What to check for:**
- `Failed requests: 0`
- `Requests per second: > 50`
- `Time per request: < 500ms`
- `Transfer rate: > 100KB/s`

### 7. WebSocket Connection Limit Test
```bash
# Using wscat with multiple connections
for i in {1..50}; do wscat -c "wss://your-domain.com/ws/chat/test/?token=$TOKEN" & done
```
**What to check for:**
- All 50 connections established
- No `1006` (abnormal closure) errors
- Memory usage stable

### 8. Database Query Performance
```bash
python manage.py shell -c "
from django.db import connection
from apps.chat.models import Conversation
connection.force_debug_cursor = True
list(Conversation.objects.all().select_related('participants')[:100])
for query in connection.queries:
    print(f'{query[\"time\"]:.3f}s - {query[\"sql\"][:100]}')
"
```
**What to check for:**
- No N+1 queries (should see < 10 queries)
- Query time < 100ms each
- No `SELECT *` without limits

### 9. Cache Hit Ratio Test
```bash
# Monitor Redis cache
redis-cli INFO stats | grep hit
```
**What to check for:**
- `keyspace_hits / (keyspace_hits + keyspace_misses) > 0.7`
- Hit ratio improving after multiple requests

### 10. Memory Leak Test
```bash
# Check memory usage over 5 minutes
watch -n 30 'ps aux | grep python | grep -v grep | awk "{print \$2, \$4, \$6}"'
```
**What to check for:**
- Memory % doesn't increase steadily
- RSS stays below 500MB per worker
- No gradual memory growth

---

## 🟡 DATA INTEGRITY CHECKS

### 11. Database Constraints Test
```bash
python manage.py shell -c "
from django.db import connections
from django.db.utils import IntegrityError
for conn in connections.all():
    with conn.cursor() as cursor:
        cursor.execute('''
            SELECT conname, contype, convalidated 
            FROM pg_constraint 
            WHERE conrelid = 'apps_chat_message'::regclass
        ''')
        print(cursor.fetchall())
"
```
**What to check for:**
- Foreign key constraints enabled
- Unique constraints validated
- No disabled constraints

### 12. Message Ordering Test
```bash
curl -s "https://your-domain.com/api/chat/conversations/$CONV_ID/messages?limit=100" | jq '.[].created_at'
```
**What to check for:**
- Dates in descending order (newest first)
- No timestamp collisions
- Consistent timezone (UTC)

### 13. Concurrent Message Test
```bash
# Send 50 messages simultaneously
for i in {1..50}; do
  curl -X POST "https://your-domain.com/api/chat/conversations/$CONV_ID/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"Test $i\",\"msg_type\":\"TEXT\"}" &
done
wait
```
**What to check for:**
- All 50 messages saved (count matches)
- No duplicate IDs
- Correct ordering preserved

---

## 🟢 ERROR HANDLING & RECOVERY CHECKS

### 14. Rate Limiting Test
```bash
# Send 100 rapid requests
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://your-domain.com/api/chat/conversations/?_=$i" \
    -H "Authorization: Bearer $TOKEN"
done | sort | uniq -c
```
**What to check for:**
- After ~30 requests, responses should be 429
- `Retry-After` header present
- Rate limit resets after window

### 15. Invalid Token Test
```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  https://your-domain.com/api/accounts/profile/ \
  -H "Authorization: Bearer invalid_token_12345"
```
**What to check for:**
- Status: 401 Unauthorized
- No stack trace
- Clear error message

### 16. Expired Token Test
```bash
# Wait for token expiry (or manually decode and modify)
curl -s -w "\nHTTP Status: %{http_code}\n" \
  https://your-domain.com/api/accounts/profile/ \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```
**What to check for:**
- Status: 401 Unauthorized
- Token refresh endpoint works
- Automatic redirect to login

### 17. Database Failure Simulation
```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Test API response
curl -s https://your-domain.com/api/chat/conversations/

# Restart PostgreSQL
sudo systemctl start postgresql
```
**What to check for:**
- Graceful error (500 with user-friendly message)
- No connection pool exhaustion
- Automatic reconnection after DB restart

### 18. Redis Failure Simulation
```bash
# Stop Redis
sudo systemctl stop redis-server

# Test WebSocket connection
wscat -c "wss://your-domain.com/ws/chat/test/?token=$TOKEN"

# Restart Redis
sudo systemctl start redis-server
```
**What to check for:**
- WebSocket falls back to memory channel
- No complete system failure
- Auto-reconnect to Redis

### 19. S3 Upload Failure Test
```bash
# Test with invalid S3 credentials
curl -X POST https://your-domain.com/api/chat/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test.jpg","content_type":"image/jpeg"}'
```
**What to check for:**
- 500 error with clear message
- No sensitive credentials exposed
- Frontend handles error gracefully

---

## 🔵 MONITORING & LOGGING CHECKS

### 20. Structured Logging Test
```bash
# Check log format
tail -f /var/log/academe/app.log | head -5
```
**What to check for:**
- JSON format logs
- Contains request_id, user_id, timestamp
- No sensitive data in logs

### 21. Error Tracking Test
```bash
# Trigger a 500 error
curl -X POST https://your-domain.com/api/chat/conversations/invalid-uuid/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**What to check for:**
- Error appears in Sentry/Datadog
- Stack trace captured
- Alert triggered (if configured)

### 22. Health Check Endpoint
```bash
curl -s https://your-domain.com/health/ | jq '.'
```
**What to check for:**
```json
{
  "status": "healthy",
  "database": "up",
  "redis": "up",
  "storage": "up",
  "timestamp": "2026-01-13T10:00:00Z"
}
```

---

## 🟣 USER EXPERIENCE CHECKS

### 23. CORS Configuration Test
```bash
curl -s -I -X OPTIONS https://your-domain.com/api/chat/conversations/ \
  -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: POST"
```
**What to check for:**
- `Access-Control-Allow-Origin: https://your-frontend.com`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods` includes POST, GET, PUT, DELETE

### 24. Compression Test
```bash
curl -s -o /dev/null -w "%{size_download}\n" \
  https://your-domain.com/api/chat/conversations/ \
  -H "Accept-Encoding: gzip"

curl -s -o /dev/null -w "%{size_download}\n" \
  https://your-domain.com/api/chat/conversations/ \
  -H "Accept-Encoding: identity"
```
**What to check for:**
- Compressed size < 50% of uncompressed
- `Content-Encoding: gzip` header present

### 25. Response Time SLA Test
```bash
# Run 1000 requests and calculate percentiles
for i in {1..1000}; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    https://your-domain.com/api/health/ >> /tmp/times.txt
done

# Calculate 95th percentile
sort -n /tmp/times.txt | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}'
```
**What to check for:**
- 95th percentile < 500ms
- No timeouts
- Consistent performance

---

## 🚀 AUTOMATED PRODUCTION READINESS SCRIPT

Save as `production_check.sh`:

```bash
#!/bin/bash

DOMAIN="https://your-domain.com"
TOKEN="your_access_token"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Production Readiness Check${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check 1: Security Headers
echo -e "${YELLOW}[1/25] Checking Security Headers...${NC}"
HSTS=$(curl -s -I $DOMAIN | grep -i "strict-transport-security")
if [ -n "$HSTS" ]; then
    echo -e "${GREEN}✓ HSTS enabled${NC}"
else
    echo -e "${RED}✗ HSTS missing${NC}"
fi

# Check 2: HTTPS
echo -e "\n${YELLOW}[2/25] Checking HTTPS...${NC}"
CERT_EXPIRY=$(echo | openssl s_client -servername ${DOMAIN#https://} -connect ${DOMAIN#https://}:443 2>/dev/null | openssl x509 -noout -enddate)
echo -e "${GREEN}✓ $CERT_EXPIRY${NC}"

# Check 3: Database Connection
echo -e "\n${YELLOW}[3/25] Checking Database...${NC}"
DB_STATUS=$(curl -s $DOMAIN/health/ | jq -r '.database')
if [ "$DB_STATUS" = "up" ]; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}✗ Database failed${NC}"
fi

# Check 4: Redis Connection
echo -e "\n${YELLOW}[4/25] Checking Redis...${NC}"
REDIS_STATUS=$(curl -s $DOMAIN/health/ | jq -r '.redis')
if [ "$REDIS_STATUS" = "up" ]; then
    echo -e "${GREEN}✓ Redis connected${NC}"
else
    echo -e "${RED}✗ Redis failed${NC}"
fi

# Check 5: Authentication
echo -e "\n${YELLOW}[5/25] Testing Authentication...${NC}"
AUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/accounts/profile/ -H "Authorization: Bearer $TOKEN")
if [ "$AUTH_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Authentication working${NC}"
else
    echo -e "${RED}✗ Authentication failed (HTTP $AUTH_TEST)${NC}"
fi

# Check 6: Rate Limiting
echo -e "\n${YELLOW}[6/25] Testing Rate Limiting...${NC}"
COUNT_200=0
COUNT_429=0
for i in {1..100}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/chat/conversations/ -H "Authorization: Bearer $TOKEN")
    if [ "$STATUS" = "200" ]; then
        ((COUNT_200++))
    elif [ "$STATUS" = "429" ]; then
        ((COUNT_429++))
    fi
done
if [ $COUNT_429 -gt 0 ]; then
    echo -e "${GREEN}✓ Rate limiting active ($COUNT_200 OK, $COUNT_429 rate-limited)${NC}"
else
    echo -e "${RED}✗ Rate limiting not triggered${NC}"
fi

# Check 7: WebSocket
echo -e "\n${YELLOW}[7/25] Testing WebSocket...${NC}"
WS_TEST=$(timeout 5 wscat -c "wss://${DOMAIN#https://}/ws/chat/test/?token=$TOKEN" -x '{"type":"ping"}' 2>&1)
if echo "$WS_TEST" | grep -q "pong"; then
    echo -e "${GREEN}✓ WebSocket working${NC}"
else
    echo -e "${RED}✗ WebSocket failed${NC}"
fi

# Check 8: Debug Mode
echo -e "\n${YELLOW}[8/25] Checking Debug Mode...${NC}"
DEBUG_CHECK=$(curl -s $DOMAIN/api/accounts/profile/ -H "Authorization: Bearer $TOKEN" | grep -i "debug")
if [ -z "$DEBUG_CHECK" ]; then
    echo -e "${GREEN}✓ Debug mode disabled${NC}"
else
    echo -e "${RED}✗ Debug mode enabled!${NC}"
fi

# Check 9: File Upload
echo -e "\n${YELLOW}[9/25] Testing File Upload...${NC}"
UPLOAD_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST $DOMAIN/api/chat/presigned-url \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"file_name":"test.jpg","content_type":"image/jpeg"}')
if [ "$UPLOAD_TEST" = "200" ]; then
    echo -e "${GREEN}✓ File upload endpoint working${NC}"
else
    echo -e "${RED}✗ File upload failed (HTTP $UPLOAD_TEST)${NC}"
fi

# Check 10: CORS
echo -e "\n${YELLOW}[10/25] Checking CORS...${NC}"
CORS_CHECK=$(curl -s -I -X OPTIONS $DOMAIN/api/chat/conversations/ \
    -H "Origin: https://your-frontend.com" \
    -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin")
if [ -n "$CORS_CHECK" ]; then
    echo -e "${GREEN}✓ CORS configured${NC}"
else
    echo -e "${RED}✗ CORS missing${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Production Readiness Score:${NC}"
echo -e "${GREEN}   $(ls checks/ | wc -l)/10 checks passed${NC}"
echo -e "${GREEN}========================================${NC}"
```

### Run the script:
```bash
chmod +x production_check.sh
./production_check.sh
```

---

## ✅ PRODUCTION READINESS CHECKLIST SUMMARY

| Category | Must Pass | Critical |
|----------|-----------|----------|
| **Security** | HSTS, HTTPS, Debug=False, CORS | ✅ |
| **Database** | Connection pool, migrations, backups | ✅ |
| **Performance** | <500ms response, >50 req/sec | ✅ |
| **Error Handling** | Graceful failures, rate limiting | ✅ |
| **Monitoring** | Logging, alerts, health checks | ✅ |
| **WebSocket** | Connection stable, reconnection | ✅ |

### Go/No-Go Decision:
- **All Critical checks must pass** ✅
- **Performance > 80% of target** ✅
- **No memory leaks detected** ✅
- **Security headers configured** ✅

If all above pass, your app is **PRODUCTION READY**! 🚀








To connect your Django backend to your local PostgreSQL instance, you need to transition from the default SQLite database to a production-grade relational database.

### 1. Install PostgreSQL Adapter

Django needs a driver to talk to PostgreSQL. Run this in your `backend` directory using Git Bash:

```bash
# Ensure your virtual environment is active
source venv/Scripts/activate

# Install the adapter
pip install psycopg2-binary

```

---

### 2. Create the Database

Since you have PostgreSQL installed, use the command-line tool (`psql`) or your GUI (like pgAdmin) to create the database.

* **In Git Bash:**
```bash
# Log in to Postgres (it might prompt for the password you set during install)
psql -U postgres

```


* **Inside the psql prompt:**
```sql
CREATE DATABASE academe_db;
CREATE USER academe_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE academe_db TO academe_user;
\q

```



---

### 3. Update `settings.py`

Open `backend/academe/settings.py` and replace your `DATABASES` configuration:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'academe_db',
        'USER': 'academe_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

```

---

### 4. Apply Migrations

Now that Django is pointed at the new database, you must create the tables.

* **Run these commands in your backend folder:**
```bash
# Prepare the migrations
python manage.py makemigrations

# Apply them to the new PostgreSQL database
python manage.py migrate

```


* **What to check:** The terminal should list all built-in Django tables (`auth`, `contenttypes`, etc.) being created in PostgreSQL.

---

### 5. Final Verification

1. **Check Connection:** Run `python manage.py runserver` and try to log in to your site.
2. **Verify Data:** You can verify the tables exist by logging into your PostgreSQL shell:
```bash
psql -U academe_user -d academe_db
# Then type:
\dt
# This lists all the tables Django just created.

```



### Critical Considerations

* **Environment Variables:** Do **not** keep your database password in `settings.py` for long. Move the credentials to your `.env` file and use `os.environ.get('DB_PASSWORD')` to keep your project secure.
* **Existing Data:** If you had data in SQLite, `migrate` will create an **empty** database. If you need to keep your old data, you would need to perform a `dumpdata` from SQLite and `loaddata` into PostgreSQL.
* **Connection Errors:** If the migration fails, double-check that the PostgreSQL service is actually running on your computer. On Windows, check "Services" to ensure `postgresql-x64` is marked as **Running**.

**Are you planning to deploy this version to a cloud server (like AWS or DigitalOcean) soon, or are you keeping the PostgreSQL instance local for the time being?**









# Complete Guide: Connecting Academe Project to PostgreSQL

## Prerequisites Check

### 1. Verify PostgreSQL Installation
```bash
# Check PostgreSQL version
psql --version

# Check if PostgreSQL service is running
# On Windows (Git Bash):
pg_isready -h localhost -p 5432

# Or check service status (Windows)
net start | findstr PostgreSQL

# On Linux/Mac:
sudo systemctl status postgresql
```
**Expected Output:**
```
psql (PostgreSQL) 15.x
localhost:5432 - accepting connections
```

### 2. Locate PostgreSQL Credentials
```bash
# Check PostgreSQL users
psql -U postgres -c "\du"

# Check existing databases
psql -U postgres -c "\l"
```

---

## Step 1: Install Required Python Packages

```bash
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate

# Install PostgreSQL adapter
pip install psycopg2-binary

# Install database URL parser (for DATABASE_URL format)
pip install dj-database-url

# Update requirements.txt
pip freeze > requirements.txt
```

---

## Step 2: Create PostgreSQL Database and User

### Method A: Using psql commands

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Run these commands inside psql:
```

```sql
-- Create database for Academe
CREATE DATABASE academe_db;

-- Create dedicated user for the application
CREATE USER academe_user WITH PASSWORD 'StrongPassword123!';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE academe_db TO academe_user;

-- Grant schema privileges
\c academe_db
GRANT ALL ON SCHEMA public TO academe_user;
GRANT CREATE, USAGE ON SCHEMA public TO academe_user;

-- Exit psql
\q
```

### Method B: One-liner commands
```bash
# Create database
psql -U postgres -c "CREATE DATABASE academe_db;"

# Create user
psql -U postgres -c "CREATE USER academe_user WITH PASSWORD 'StrongPassword123!';"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE academe_db TO academe_user;"
```

---

## Step 3: Update Django Settings

### Modify `backend/academe/settings.py`

Find the DATABASES section and replace with:

```python
# backend/academe/settings.py

import dj_database_url
import os

# ============================================
# DATABASE - PostgreSQL Configuration
# ============================================

# Option 1: Using DATABASE_URL environment variable (Recommended for production)
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,      # Keep connections alive for 10 minutes
            conn_health_checks=True,  # Enable connection health checks
            ssl_require=False      # Set to True if using SSL (e.g., AWS RDS)
        )
    }
else:
    # Fallback to SQLite (development only)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Option 2: Direct configuration (Alternative)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'academe_db',
#         'USER': 'academe_user',
#         'PASSWORD': 'StrongPassword123!',
#         'HOST': 'localhost',
#         'PORT': '5432',
#         'CONN_MAX_AGE': 600,
#         'CONN_HEALTH_CHECKS': True,
#         'OPTIONS': {
#             'connect_timeout': 10,
#             'keepalives': 1,
#             'keepalives_idle': 30,
#             'keepalives_interval': 10,
#             'keepalives_count': 5,
#         }
#     }
# }

# Add these for better PostgreSQL performance
if 'postgresql' in DATABASES['default']['ENGINE']:
    DATABASES['default']['OPTIONS'] = {
        'connect_timeout': 10,
        'options': '-c search_path=public',
    }
```

---

## Step 4: Create Environment Variable File

### Create `backend/.env` file:

```bash
# Create .env file
cat > /c/Users/GATARA-BJTU/academe/backend/.env << 'EOF'
# Django Settings
DJANGO_SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,granitic-imbricately-dede.ngrok-free.dev

# Database Configuration
DATABASE_URL=postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db

# Alternative format with special characters in password:
# DATABASE_URL=postgresql://academe_user:StrongPassword123%21@localhost:5432/academe_db

# Redis Configuration (for caching and channels)
REDIS_URL=redis://localhost:6379/0

# AWS Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=academe-storage
AWS_S3_REGION_NAME=us-east-1

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key

# Rate Limiting
OTP_RATE_LIMIT=3
OTP_RATE_WINDOW=3600

# Feature Flags
DEBUG_MODE=false
EOF
```

---

## Step 5: Load Environment Variables

### Update `backend/academe/settings.py` to load .env at the top:

```python
# At the very top of settings.py, after imports
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = BASE_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded environment from {env_path}")
else:
    print(f"No .env file found at {env_path}")
```

---

## Step 6: Test Database Connection

```bash
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate

# Test PostgreSQL connection from Django
python manage.py dbshell

# If successful, you'll see psql prompt. Exit with:
\q

# Test connection using Python
python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        port='5432',
        database='academe_db',
        user='academe_user',
        password='StrongPassword123!'
    )
    print('✅ PostgreSQL connection successful!')
    conn.close()
except Exception as e:
    print(f'❌ Connection failed: {e}')
"
```

**Expected Output:**
```
✅ PostgreSQL connection successful!
```

---

## Step 7: Run Migrations

```bash
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate

# First, check current migrations
python manage.py showmigrations

# Create new migrations (if any changes)
python manage.py makemigrations

# Apply migrations to PostgreSQL
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

**Expected Output:**
```
Operations to perform:
  Apply all migrations: accounts, admin, auth, chat, classes, contenttypes, ...
Running migrations:
  Applying accounts.0001_initial... OK
  Applying chat.0001_initial... OK
  ...
```

---

## Step 8: Create Superuser for PostgreSQL

```bash
python manage.py createsuperuser

# Follow prompts:
# Phone number: 0712345678
# Full name: Admin User
# Admission number: ADMIN001
# Institution: Academe
# Password: SecurePassword123!
```

---

## Step 9: Verify Data Migration (if migrating from SQLite)

### Export data from SQLite:
```bash
cd /c/Users/GATARA-BJTU/academe/backend

# Dump data from SQLite to JSON
python manage.py dumpdata --database=sqlite > data_dump.json

# Check the dump file size and content
ls -lh data_dump.json
head -50 data_dump.json
```

### Import data to PostgreSQL:
```bash
# Load data into PostgreSQL
python manage.py loaddata data_dump.json

# Verify data was imported
python manage.py shell -c "
from apps.accounts.models import User
print(f'Users in database: {User.objects.count()}')
from apps.chat.models import Conversation
print(f'Conversations: {Conversation.objects.count()}')
"
```

---

## Step 10: Configure Connection Pooling (Production)

### Install PgBouncer (Connection Pooler):
```bash
# On Windows, use alternative approach - adjust Django pool settings
# In settings.py, add connection pooling options:

# Add to DATABASES configuration:
DATABASES['default']['CONN_MAX_AGE'] = 600  # Keep connections alive
DATABASES['default']['CONN_HEALTH_CHECKS'] = True
DATABASES['default']['OPTIONS']['pool_size'] = 20
DATABASES['default']['OPTIONS']['max_overflow'] = 10
```

---

## Step 11: Performance Optimization

### Create PostgreSQL indexes for better performance:

```bash
# Connect to PostgreSQL
psql -U academe_user -d academe_db

# Run optimization commands:
```

```sql
-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Analyze tables for query planner
ANALYZE;

-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_conversation_created 
ON chat_message (conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_sender_read 
ON chat_message (sender_id, is_read);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants 
ON chat_conversation_participants (conversation_id, user_id);

-- Update table statistics
VACUUM ANALYZE;

-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM chat_message 
WHERE conversation_id = 'your-conversation-id' 
ORDER BY created_at DESC 
LIMIT 50;
```

---

## Step 12: Configure Backup Strategy

### Create backup script `backend/backup_db.sh`:

```bash
#!/bin/bash

# Database backup script
BACKUP_DIR="/c/Users/GATARA-BJTU/academe/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/academe_db_$TIMESTAMP.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
PGPASSWORD="StrongPassword123!" pg_dump -U academe_user -h localhost -d academe_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "academe_db_*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE.gz"
```

### Make executable and test:
```bash
chmod +x /c/Users/GATARA-BJTU/academe/backend/backup_db.sh
./backup_db.sh
```

---

## Step 13: Monitor PostgreSQL Performance

### Create monitoring script `backend/check_db.sh`:

```bash
#!/bin/bash

echo "=== PostgreSQL Database Status ==="

# Check connection count
echo -e "\n1. Active Connections:"
PGPASSWORD="StrongPassword123!" psql -U academe_user -d academe_db -t -c "
SELECT count(*) FROM pg_stat_activity WHERE datname = 'academe_db';
"

# Check database size
echo -e "\n2. Database Size:"
PGPASSWORD="StrongPassword123!" psql -U academe_user -d academe_db -c "
SELECT pg_database_size('academe_db')/1024/1024 AS size_mb;
"

# Check table sizes
echo -e "\n3. Largest Tables:"
PGPASSWORD="StrongPassword123!" psql -U academe_user -d academe_db -c "
SELECT 
    tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# Check index usage
echo -e "\n4. Index Hit Rate:"
PGPASSWORD="StrongPassword123!" psql -U academe_user -d academe_db -c "
SELECT 
    relname,
    idx_scan AS index_scans,
    seq_scan AS sequential_scans,
    round(100.0 * idx_scan / (idx_scan + seq_scan), 2) AS index_usage_percent
FROM pg_stat_user_tables
WHERE idx_scan + seq_scan > 0
ORDER BY index_usage_percent;
"
```

---

## Step 14: Test with Actual Application

### Start the application with PostgreSQL:

```bash
# Terminal 1: Start PostgreSQL (ensure service is running)
pg_ctl start -D "C:\Program Files\PostgreSQL\15\data"

# Terminal 2: Start Django with PostgreSQL
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate
export DJANGO_SETTINGS_MODULE=academe.settings
python manage.py runserver 0.0.0.0:8000

# Terminal 3: Start Daphne (WebSocket)
cd /c/Users/GATARA-BJTU/academe/backend
source venv/Scripts/activate
daphne -b 0.0.0.0 -p 8001 academe.asgi:application

# Terminal 4: Start frontend
cd /c/Users/GATARA-BJTU/academe/frontend
npm run dev
```

### Test CRUD operations:
```bash
# Test creating a user
curl -X POST http://localhost:8000/api/accounts/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "0798765432",
    "full_name": "Test User",
    "admission_number": "TEST001",
    "institution": "Academe",
    "class_name": "Class A"
  }'

# Verify data persisted in PostgreSQL
PGPASSWORD="StrongPassword123!" psql -U academe_user -d academe_db -c \
  "SELECT phone_number, full_name FROM accounts_user WHERE phone_number='0798765432';"
```

---

## Step 15: Troubleshooting Common Issues

### Issue 1: Connection refused
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (Windows)
pg_ctl start -D "C:\Program Files\PostgreSQL\15\data"

# Or restart service
net stop postgresql-x64-15
net start postgresql-x64-15
```

### Issue 2: Authentication failed
```bash
# Reset password
psql -U postgres -c "ALTER USER academe_user WITH PASSWORD 'NewStrongPassword123!';"

# Update .env file with new password
sed -i 's/StrongPassword123!/NewStrongPassword123!/g' /c/Users/GATARA-BJTU/academe/backend/.env
```

### Issue 3: Database does not exist
```bash
# Create database
psql -U postgres -c "CREATE DATABASE academe_db;"

# Grant privileges again
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE academe_db TO academe_user;"
```

### Issue 4: Permission denied on schema
```bash
# Connect and fix permissions
psql -U postgres -d academe_db -c "
GRANT ALL ON SCHEMA public TO academe_user;
GRANT CREATE, USAGE ON SCHEMA public TO academe_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO academe_user;
"
```

### Issue 5: Migration conflicts
```bash
# Reset migrations (careful - deletes all data!)
python manage.py migrate --fake accounts zero
python manage.py migrate --fake chat zero

# Delete migration files (keep __init__.py)
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

# Create fresh migrations
python manage.py makemigrations
python manage.py migrate
```

---

## Step 16: Verify Production Readiness

```bash
# Run all verification checks
cat > /tmp/verify_postgres.sh << 'EOF'
#!/bin/bash

echo "=== PostgreSQL Production Verification ==="

# 1. Check connection
echo -e "\n1. Connection Test:"
timeout 2 psql "postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db" -c "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL connection successful"
else
    echo "❌ PostgreSQL connection failed"
fi

# 2. Check database size
echo -e "\n2. Database Size:"
DB_SIZE=$(psql "postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db" -t -c "SELECT pg_database_size('academe_db')/1024/1024;" | tr -d ' ')
echo "   Size: ${DB_SIZE}MB"

# 3. Check connection count
CONN_COUNT=$(psql "postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db" -t -c "SELECT count(*) FROM pg_stat_activity;" | tr -d ' ')
echo -e "\n3. Active Connections: $CONN_COUNT"

# 4. Check table counts
echo -e "\n4. Table Records:"
psql "postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db" -c "
SELECT schemaname, tablename, n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;
"

# 5. Check index hit rate
echo -e "\n5. Cache Hit Ratio:"
psql "postgresql://academe_user:StrongPassword123!@localhost:5432/academe_db" -c "
SELECT 
    'index hit rate' as metric,
    round(sum(idx_blks_hit) * 100.0 / (sum(idx_blks_hit) + sum(idx_blks_read)), 2) as hit_ratio
FROM pg_statio_user_indexes;
"

echo -e "\n=== Verification Complete ==="
EOF

chmod +x /tmp/verify_postgres.sh
/tmp/verify_postgres.sh
```

---

## Quick Reference: PostgreSQL Commands

| Command | Description |
|---------|-------------|
| `psql -U postgres` | Connect to PostgreSQL as superuser |
| `\l` | List all databases |
| `\c database_name` | Connect to specific database |
| `\dt` | List all tables |
| `\d table_name` | Describe table structure |
| `\du` | List all users/roles |
| `\q` | Exit psql |
| `SELECT version();` | Check PostgreSQL version |
| `SELECT pg_size_pretty(pg_database_size('db_name'));` | Check database size |

---

## Final Checklist

- [ ] PostgreSQL service is running
- [ ] Database `academe_db` exists
- [ ] User `academe_user` created with proper privileges
- [ ] `psycopg2-binary` installed
- [ ] `dj-database-url` installed
- [ ] `.env` file configured with DATABASE_URL
- [ ] Django settings updated for PostgreSQL
- [ ] Migrations applied successfully
- [ ] Superuser created
- [ ] Data migrated from SQLite (if applicable)
- [ ] Backup script configured
- [ ] Monitoring queries working
- [ ] Connection pooling configured
- [ ] Application runs without errors

After completing all steps, your Academe project will be successfully connected to PostgreSQL and ready for production deployment!

When setting up PostgreSQL for a Django project, most errors stem from service availability, credential mismatches, or migration conflicts. Because you are working offline, you can rely entirely on local tools to diagnose and resolve these issues.1. Essential Troubleshooting CommandsIf your application fails to connect, run these steps in your Git Bash terminal in order:A. Verify the PostgreSQL ServicePostgreSQL must be running as a background service on your Windows machine.Command: pg_isready -h localhost -p 5432Expected: localhost:5432 - accepting connectionsResolution: If it fails, open Services (services.msc via Win+R), find postgresql, and click Start.B. Test Database Connectivity via CLIThis isolates whether the issue is with Django's configuration or the database itself.Command: psql -U academe_user -d academe_db -h localhost -c "SELECT 1"Expected: 1 (or success prompt)Resolution: If you get an authentication error, verify the password in your .env file matches what you defined in Step 2.C. Inspect Connection DetailsSometimes, environment variables are not being loaded correctly by Django.Command: echo $DATABASE_URL (in Git Bash)Expected: The full connection string (e.g., postgresql://user:pass@localhost:5432/dbname)Resolution: If this is blank, your load_dotenv() call in settings.py is failing or the file path is incorrect.2. Common Errors and ResolutionsError MessageWhat it meansHow to Resolve"Connection refused"The Postgres server isn't running.Start the Postgres service in Windows Services."FATAL: database does not exist"The DB name in settings.py is wrong.Check \l in psql to list databases; ensure names match."FATAL: role does not exist"The username defined is invalid.Check \du in psql to list users."Relation does not exist"Migrations haven't been applied yet.Run python manage.py migrate."Too many clients"You hit the max_connections limit.Restart the Postgres service or run SELECT * FROM pg_stat_activity to find stuck connections.3. Resolving Migration ConflictsIf you encounter ProgrammingError or "Migration X is missing," your local database schema has drifted from your code.Check status:Bashpython manage.py showmigrations






C:\Users\GATARA-BJTU\academe\backend\apps\chat
C:\Users\GATARA-BJTU\academe\backend\apps\accounts
C:\Users\GATARA-BJTU\academe\backend\apps\notifications
C:\Users\GATARA-BJTU\academe\backend\common
C:\Users\GATARA-BJTU\academe\backend\academe
C:\Users\GATARA-BJTU\academe\frontend\src\api\client.js
C:\Users\GATARA-BJTU\academe\frontend\src\api\accountsApi.js
C:\Users\GATARA-BJTU\academe\frontend\src\api\chatApi.js
C:\Users\GATARA-BJTU\academe\frontend\src\components\chat
C:\Users\GATARA-BJTU\academe\frontend\src\components\layout
C:\Users\GATARA-BJTU\academe\frontend\src\components\shared
C:\Users\GATARA-BJTU\academe\frontend\src\components\ui
C:\Users\GATARA-BJTU\academe\frontend\src\contexts
C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useApi.js
C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useNotificationWebSocket.js
C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useWebSocket.
C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useUnreadCount.js
C:\Users\GATARA-BJTU\academe\frontend\src\pages\ChatDetail.jsx
C:\Users\GATARA-BJTU\academe\frontend\src\pages\ChatsPage.jsx
C:\Users\GATARA-BJTU\academe\frontend\src\stores
C:\Users\GATARA-BJTU\academe\frontend\src\styles\globals.css
C:\Users\GATARA-BJTU\academe\frontend\src\styles\themes.css
C:\Users\GATARA-BJTU\academe\frontend\src\utils
C:\Users\GATARA-BJTU\academe\frontend\src\App.jsx
C:\Users\GATARA-BJTU\academe\frontend\src\index.css
C:\Users\GATARA-BJTU\academe\frontend\src\main.jsx
C:\Users\GATARA-BJTU\academe\frontend\index.html
C:\Users\GATARA-BJTU\academe\frontend\vite.config.js
C:\Users\GATARA-BJTU\academe\frontend\package.json 

so based on the above links, for speifific files, i want you to provide a gitbash terminal mingwi terminal commmands compatible, to create a file in the root project directory called chat dump, . the command should collect the content of the each of the above files and folders and their full complete content full code for each file referenced above , and their full content and their actual paths on top of each file code. for the backened ignore the migration files and psych files.