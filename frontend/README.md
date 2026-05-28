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




    For further information visit https://errors.pydantic.dev/2.13/v/missing
Internal Server Error: /found-items/items/010d669a-835d-4fdf-9647-46812a071bbb/claim-status/
[27/May/2026 14:54:55] "GET /found-items/items/010d669a-835d-4fdf-9647-46812a071bbb/claim-status/ HTTP/1.1" 500 1283
2 validation errors for NinjaResponseSchema
response.requires_security
  Field required [type=missing, input_value=<DjangoGetter: {'claim_id..., 'next_step': 'claim'}>, input_type=DjangoGetter]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
response.requires_payment
  Field required [type=missing, input_value=<DjangoGetter: {'claim_id..., 'next_step': 'claim'}>, input_type=DjangoGetter]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
Traceback (most recent call last):
  File "C:\Users\GATARA-BJTU\academe\backend\venv\Lib\site-packages\ninja\operation.py", line 219, in run
    return self._result_to_response(request, result, temporal_response)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\GATARA-BJTU\academe\backend\venv\Lib\site-packages\ninja\operation.py", line 422, in _result_to_response
    validated_object = response_model.model_validate(
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\GATARA-BJTU\academe\backend\venv\Lib\site-packages\pydantic\main.py", line 732, in model_validate
    return cls.__pydantic_validator__.validate_python(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
pydantic_core._pydantic_core.ValidationError: 2 validation errors for NinjaResponseSchema
response.requires_security
  Field required [type=missing, input_value=<DjangoGetter: {'claim_id..., 'next_step': 'claim'}>, input_type=DjangoGetter]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
response.requires_payment
  Field required [type=missing, input_value=<DjangoGetter: {'claim_id..., 'next_step': 'claim'}>, input_type=DjangoGetter]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
Internal Server Error: /found-items/items/010d669a-835d-4fdf-9647-46812a071bbb/claim-status/
[27/May/2026 14:54:55] "GET /found-items/items/010d669a-835d-4fdf-9647-46812a071bbb/claim-status/ HTTP/1.1" 500 1283

governance stats needs to be enhance in terms of colors and backgrounds 


s/items/8717b760-dcb4-4ea0-9cb2-bbd7fcb45dfa/claim/ HTTP/1.1" 200 0
[27/May/2026 15:10:31] "POST /found-items/items/8717b760-dcb4-4ea0-9cb2-bbd7fcb45dfa/claim/ HTTP/1.1" 201 511
[27/May/2026 15:10:41] "OPTIONS /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/ HTTP/1.1" 200 0
Bad Request: /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/
[27/May/2026 15:10:41] "POST /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/ HTTP/1.1" 400 65
Bad Request: /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/
[27/May/2026 15:10:42] "POST /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/ HTTP/1.1" 400 65
[27/May/2026 15:10:44] "HEAD /api/health/ HTTP/1.1" 200 0
[27/May/2026 15:10:44] "HEAD /api/health/ HTTP/1.1" 200 0
Bad Request: /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/
[27/May/2026 15:10:46] "POST /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/ HTTP/1.1" 400 65
Bad Request: /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/
[27/May/2026 15:10:47] "POST /found-items/claims/407fdac5-60cb-4006-af22-a8391f53d5e2/submit-evidence/ HTTP/1.1" 400 65
[27/May/2026 15:10:48] "HEAD /api/health/ HTTP/1.1" 200 0]


also the skeleton loader is vertically orintnted occupiying on the central location , so instead i want it occuy the full screen and load animating object or designed to be appealing and intuitive. also the skeleton loader should have appealing designs and looks. 


for the navabr as seen, there are missing references to fontselector , also look at its appearance as potrayed in the attached image. it should have its own intutive backgrounds and background button colors ntuive and different for different features. 

for the below C:\Users\GATARA-BJTU\academe\frontend\src\services\attendanceService.js there is reference to academics app in the bacend which i dont have , so the features should be added modified based on an already existing app. 

create content for the bakend .env file(im providing the settings file for insights to guide you in crafting the .env)

since my api file is using the name client.js instead of axios.js, however, in my file
there is reference as below,using the axios file that dont exist as i have only client.js so should i modify the section or the settings will pick from the client.js despite rference to axios.js as shown below
: 
// ═══════════════════════════════════════════════════════════════
// 2. Refresh-specific instance to avoid circular interceptor triggers
// ═══════════════════════════════════════════════════════════════
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ═══════════════════════════════════════════════════════════════
// 3. Main client instance
// ═══════════════════════════════════════════════════════════════
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});



also ths fle is referencing the backend academic app which is not part of my project, rather i have the classes app C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useAttendance.js;; with the models being referenced here. 