# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# Academe - Student-Only Ecosystem

A comprehensive mobile and web application for student community management, featuring found items recovery, announcements, opportunities, attendance tracking, and more.

## Tech Stack

- **Backend**: Django Ninja (Python)
- **Frontend**: React + Vite (JavaScript)
- **Mobile**: Capacitor wrapper
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Celery
- **Storage**: AWS S3
- **Notifications**: Firebase Cloud Messaging
- **Payments**: M-Pesa (Safaricom)

## Features

- 🔐 Phone OTP Authentication
- 📦 Found Items with Image Blur & Escrow Payments
- 📢 Class & Campus Announcements
- 💼 Opportunities Board
- 📚 Attendance Tracking (Offline-capable)
- 🔍 Unified Search
- 🌓 Dark/Light Theme
- ♿ Accessibility Features
- 📱 PWA + Mobile App

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone repository
git clone <repository-url>
cd academe

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend setup
cd ../frontend
npm install
npm run dev






issues to fix for the project:::

00 12
[16/May/2026 00:45:26] "GET /api/opportunities/unread-count/ HTTP/1.1" 200 12
[16/May/2026 00:46:26] "GET /api/opportunities/unread-count/ HTTP/1.1" 200 12
[16/May/2026 00:47:26] "GET /api/opportunities/unread-count/ HTTP/1.1" 200 12
Not Found: /api/opportunities/f07f2376-e7d4-4bc3-ac7b-9fcf7d1cde3e/report/
[16/May/2026 00:48:01] "POST /api/opportunities/f07f2376-e7d4-4bc3-ac7b-9fcf7d1cde3e/report/ HTTP/1.1" 404 10449
[16/May/2026 00:48:11] "GET /api/found-items/items/? HTTP/1.1" 200 1431
[16/May/2026 00:48:26] "GET /api/opportunities/unread-count/ HTTP/1.1" 200 12
[16/May/2026 00:48:53] "GET /api/found-items/items/b04d2695-df13-46dc-b98a-7dedfe3044f3/ HTTP/1.1" 200 337
[16/May/2026 00:48:54] "POST /api/found-items/items/b04d2695-df13-46dc-b98a-7dedfe3044f3/claim/ HTTP/1.1" 200 163
Not Found: /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/
[16/May/2026 00:49:03] "POST /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/ HTTP/1.1" 404 58
Not Found: /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/
[16/May/2026 00:49:05] "POST /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/ HTTP/1.1" 404 58
Not Found: /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/
[16/May/2026 00:49:05] "POST /api/found-items/claims/b04d2695-df13-46dc-b98a-7dedfe3044f3/submit-evidence/ HTTP/1.1" 404 58


16/May/2026 00:52:45] "GET /api/opportunities/unread-count/ HTTP/1.1" 200 12
[16/May/2026 00:53:02] "GET /admin/ HTTP/1.1" 200 65396
[16/May/2026 00:53:02] "GET /static/vendor/fontawesome-free/css/all.min.css HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/vendor/adminlte/css/adminlte.min.css HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/vendor/bootswatch/slate/bootstrap.min.css HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/jazzmin/css/main.css HTTP/1.1" 304 0[16/May/2026 00:53:02] "GET /static/vendor/adminlte/img/AdminLTELogo.png HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/admin/js/vendor/jquery/jquery.js HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/vendor/bootstrap/js/bootstrap.min.js HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/jazzmin/js/main.js HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/vendor/adminlte/js/adminlte.min.js HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/jazzmin/js/ui-builder.js HTTP/1.1" 304 0
[16/May/2026 00:53:02] "GET /static/vendor/bootswatch/darkly/bootstrap.min.css HTTP/1.1" 304 0
[16/May/2026 00:53:03] "GET /static/vendor/fontawesome-free/webfonts/fa-solid-900.woff2 HTTP/1.1" 304 0
[16/May/2026 00:53:03] "GET /static/vendor/fontawesome-free/webfonts/fa-regular-400.woff2 HTTP/1.1" 304 0
the annoucment page is blank completly
also the profile update for image, upon uploading the image, it doesnt appear on the user interface despite saying successfully updated.