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

also the profile update for image, upon uploading the image, it doesnt appear on the user interface despite saying successfully updated.


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






































































npm install @capacitor/cli @capacitor/core @capacitor/android
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@2.6.3: Rimraf versions prior to v4 are no longer supported
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated boolean@3.2.0: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated source-map@0.8.0-beta.0: The work that was done in this beta branch won't be included in future versions
npm warn deprecated glob@11.1.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated three-mesh-bvh@0.7.8: Deprecated due to three.js version incompatibility. Please use v0.8.0, instead.
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 1150 packages, and audited 1151 packages in 22m

250 packages are looking for funding
  run `npm fund` for details

7 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.








npm install --legacy-peer-deps
$ npm install --legacy-peer-deps

> academe-frontend@1.0.0 prepare
> husky install

husky - install command is DEPRECATED

removed 13 packages, and audited 1138 packages in 11s

250 packages are looking for funding
  run `npm fund` for details

6 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm run build
npm run build

> academe-frontend@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 1363 modules transformed.
Circular chunk: vendor -> vendor-core -> vendor. Please adjust the manual chunk logic for these chunks.
[plugin:vite:reporter] [plugin vite:reporter] 
(!) C:/Users/GATARA-BJTU/academe/frontend/src/api/client.js is dynamically imported by C:/Users/GATARA-BJTU/academe/frontend/src/utils/storage.js but also statically imported by C:/Users/GATARA-BJTU/academe/frontend/src/api/accountsApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/announcementsApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/blogApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/classesApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/foundItemsApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/geoService.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/opportunitiesApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/api/supportApi.js, C:/Users/GATARA-BJTU/academe/frontend/src/contexts/AuthContext.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/hooks/useAttendance.js, C:/Users/GATARA-BJTU/academe/frontend/src/pages/AdminAuditLogsPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/AdminDashboard.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/AdminReportsPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/AdminRolesPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/AnnouncementsPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/ClassesPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/GovernanceDashboard.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/GovernanceStats.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/HomePage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/LoginPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/NotificationsPage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/ProfilePage.jsx, C:/Users/GATARA-BJTU/academe/frontend/src/pages/ResourceUploadPage.jsx, dynamic import will not move module into another chunk.

dist/registerSW.js                                     0.13 kB
dist/manifest.webmanifest                              0.49 kB
dist/index.html                                        6.89 kB │ gzip:   2.51 kBdist/css/style-Ds__kdW_.css                          353.08 kB │ gzip:  52.12 kBdist/js/announcementsApi-CbrgGFvj.js                   0.66 kB │ gzip:   0.27 kB │ map:     2.58 kB
dist/js/time-pZPJ_6u_.js                               0.80 kB │ gzip:   0.40 kB │ map:    23.02 kB
dist/js/blogApi-RKWxIlDl.js                            1.03 kB │ gzip:   0.34 kB │ map:     3.42 kB
dist/js/classesApi-DZfKdvUU.js                         1.13 kB │ gzip:   0.46 kB │ map:     4.52 kB
dist/js/foundItemsApi-B0ktCe84.js                      1.49 kB │ gzip:   0.48 kB │ map:     4.13 kB
dist/js/geoService-egDj5fX7.js                         1.95 kB │ gzip:   0.76 kB │ map:     7.91 kB
dist/js/AttendanceDetail-Bo7R68uU.js                   2.81 kB │ gzip:   1.08 kB │ map:     6.85 kB
dist/js/MyFoundItemsPage-DqUyYM7m.js                   2.99 kB │ gzip:   1.21 kB │ map:     7.99 kB
dist/js/CreateAnnouncementRequestPage-aHOATNgu.js      3.45 kB │ gzip:   1.23 kB │ map:     7.02 kB
dist/js/AdminReportsPage-DvNIphe8.js                   3.58 kB │ gzip:   1.44 kB │ map:     9.15 kB
dist/js/GovernanceStats-BRlKkxr3.js                    3.70 kB │ gzip:   1.38 kB │ map:     8.65 kB
dist/js/SearchResultsPage-CfPW9-1y.js                  3.74 kB │ gzip:   1.12 kB │ map:     9.06 kB
dist/js/MyBlogPostsPage-DOG8DBZF.js                    3.76 kB │ gzip:   1.46 kB │ map:    10.25 kB
dist/js/ProfileEditPage-CT6yJeXV.js                    3.92 kB │ gzip:   1.29 kB │ map:     9.65 kB
dist/js/AnnouncementRequestsPage-BuMzLP8Y.js           4.08 kB │ gzip:   1.57 kB │ map:    11.67 kB
dist/js/ResourceUploadPage-DoIfqugw.js                 4.09 kB │ gzip:   1.44 kB │ map:    10.33 kB
dist/js/ForgotPasswordPage-Do1juilZ.js                 4.18 kB │ gzip:   1.61 kB │ map:    10.30 kB
dist/js/NotificationsPage-DwBWEPrn.js                  4.30 kB │ gzip:   1.62 kB │ map:    12.37 kB
dist/js/CreateOpportunityPage-5vh5lg2g.js              4.65 kB │ gzip:   1.48 kB │ map:    11.52 kB
dist/js/EditOpportunityPage-C-GZHRcN.js                5.21 kB │ gzip:   1.62 kB │ map:    13.25 kB
dist/js/AttendanceRing3D-Cq1pfbDr.js                   5.72 kB │ gzip:   2.22 kB │ map:    22.18 kB
dist/js/useGeolocation-BNXbrIF-.js                     5.91 kB │ gzip:   2.66 kB │ map:    27.92 kB
dist/js/AdminAuditLogsPage-pZlzZ6WT.js                 6.25 kB │ gzip:   2.28 kB │ map:    16.21 kB
dist/js/TwoFactorSetupPage-DvkOA64A.js                 6.42 kB │ gzip:   2.06 kB │ map:    16.85 kB
dist/js/BiometricEnrollmentPage-DTZnMPn1.js            6.64 kB │ gzip:   2.21 kB │ map:    18.76 kB
dist/js/NotFoundPage-BGt4awLX.js                       6.88 kB │ gzip:   1.98 kB │ map:     9.09 kB
dist/js/BlurredImage-DqRqOggj.js                       6.89 kB │ gzip:   2.66 kB │ map:    25.90 kB
dist/js/OpportunityDetailPage-DGOYZumO.js              6.90 kB │ gzip:   2.26 kB │ map:    19.21 kB
dist/js/ResetPasswordPage-D2dSLqoO.js                  7.12 kB │ gzip:   2.17 kB │ map:    18.15 kB
dist/js/HomepageScene-CluKYBqO.js                      7.38 kB │ gzip:   2.52 kB │ map:    28.36 kB
dist/js/ClaimListPage-BY06o8eE.js                      7.98 kB │ gzip:   2.72 kB │ map:    16.19 kB
dist/js/EditBlogPage-DILY9zlX.js                       9.41 kB │ gzip:   3.30 kB │ map:    21.45 kB
dist/js/vendor-date-BiKiMn9r.js                        9.56 kB │ gzip:   3.24 kB │ map:    62.89 kB
dist/js/Card-D3c0s-An.js                              10.92 kB │ gzip:   3.22 kB │ map:    19.95 kB
dist/js/AdminRolesPage-Bgo8nqhO.js                    10.93 kB │ gzip:   3.15 kB │ map:    33.14 kB
dist/js/GovernanceDashboard-CGJomWmJ.js               12.01 kB │ gzip:   3.39 kB │ map:    25.94 kB
dist/js/CreateBlog-DgnHhBqm.js                        12.02 kB │ gzip:   3.93 kB │ map:    24.83 kB
dist/js/AttendanceSummary-CLJN7zkS.js                 12.48 kB │ gzip:   3.67 kB │ map:    28.95 kB
dist/js/ManageTimetablePage-BJti1q3L.js               12.49 kB │ gzip:   3.90 kB │ map:    28.50 kB
dist/js/AboutPage-Ba6hIKJQ.js                         13.37 kB │ gzip:   3.34 kB │ map:    18.15 kB
dist/js/FoundItemDetailPage-DWyECHV3.js               13.55 kB │ gzip:   3.90 kB │ map:    25.76 kB
dist/js/PostFoundItem-O4QtWlD8.js                     14.28 kB │ gzip:   4.73 kB │ map:    28.17 kB
dist/js/SignupPage-CwcVfGf0.js                        14.39 kB │ gzip:   4.27 kB │ map:    26.17 kB
dist/js/ContactPage-iAXZjBHE.js                       14.57 kB │ gzip:   4.16 kB │ map:    24.15 kB
dist/js/ClaimDetail-Chh33mEx.js                       14.69 kB │ gzip:   4.26 kB │ map:    39.10 kB
dist/js/FoundItemsPage-DnCWETlA.js                    15.15 kB │ gzip:   4.22 kB │ map:    26.56 kB
dist/js/PrivacyPage-D2LYXlCO.js                       15.46 kB │ gzip:   3.76 kB │ map:    21.44 kB
dist/js/SessionsPage-DCVnpgFD.js                      16.17 kB │ gzip:   4.50 kB │ map:    45.31 kB
dist/js/VenueDetailPage-qApj7DYz.js                   17.04 kB │ gzip:   5.07 kB │ map:    39.19 kB
dist/js/LoginPage-DexcuCwM.js                         19.04 kB │ gzip:   4.86 kB │ map:    31.44 kB
dist/js/AnnouncementDetailPage-B8XRaJ_l.js            19.15 kB │ gzip:   4.79 kB │ map:    38.99 kB
dist/js/TimetableManager-BVrRkNV3.js                  19.95 kB │ gzip:   5.42 kB │ map:    46.39 kB
dist/js/ProfilePage-BqBnACP6.js                       21.37 kB │ gzip:   4.16 kB │ map:    43.17 kB
dist/js/BlogPage-CMKi7yWC.js                          21.79 kB │ gzip:   5.73 kB │ map:    45.34 kB
dist/js/CampusMapPage-B9sEqaky.js                     23.19 kB │ gzip:   6.50 kB │ map:    48.97 kB
dist/js/OpportunitiesPage-Cu_jqq9v.js                 23.95 kB │ gzip:   6.69 kB │ map:    45.93 kB
dist/js/NearbyClassesPage-CAciENNf.js                 24.46 kB │ gzip:   7.63 kB │ map:    79.21 kB
dist/js/BlogDetail-BKyCWQbl.js                        29.82 kB │ gzip:   7.70 kB │ map:    57.70 kB
dist/js/AdminDashboard-CaIJvgq5.js                    30.55 kB │ gzip:   6.44 kB │ map:    61.28 kB
dist/js/AnnouncementsPage-Dk1rDG9a.js                 43.76 kB │ gzip:  10.10 kB │ map:    77.72 kB
dist/js/ClassesPage-BexWei3x.js                       48.51 kB │ gzip:  11.87 kB │ map:   105.66 kB
dist/js/HomePage-CZcnHgH7.js                          52.09 kB │ gzip:  15.11 kB │ map:   113.65 kB
dist/js/index-CpfRjmkF.js                            156.48 kB │ gzip:  38.03 kB │ map:   374.83 kB
dist/js/vendor-core-BHxsrp2j.js                      640.64 kB │ gzip: 175.25 kB │ map: 1,990.66 kB
dist/js/vendor-Dufet3wZ.js                         1,249.00 kB │ gzip: 329.14 kB │ map: 5,447.73 kB

(!) Some chunks are larger than 600 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1m 58s

PWA v0.17.5
mode      generateSW
precache  77 entries (3391.21 KiB)
files generated
  dist\sw.js.map
  dist\sw.js
  dist\workbox-63c18b4d.js.map
  dist\workbox-63c18b4d.js

✨ [vite-plugin-compression]:algorithm=gzip - compressed file successfully: 
dist/C:/Users/GATARA-BJTU/academe/frontend/index.html.gz                                     6.73kb / gzip: 2.45kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AboutPage-Ba6hIKJQ.js.gz                       13.07kb / gzip: 3.23kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminAuditLogsPage-pZlzZ6WT.js.gz              6.10kb / gzip: 2.22kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminReportsPage-DvNIphe8.js.gz                3.49kb / gzip: 1.40kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminDashboard-CaIJvgq5.js.gz                  29.89kb / gzip: 6.25kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminRolesPage-Bgo8nqhO.js.gz                  10.68kb / gzip: 3.08kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementRequestsPage-BuMzLP8Y.js.gz        3.98kb / gzip: 1.54kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceDetail-Bo7R68uU.js.gz                2.74kb / gzip: 1.05kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceRing3D-Cq1pfbDr.js.gz                5.59kb / gzip: 2.17kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementsPage-Dk1rDG9a.js.gz               43.34kb / gzip: 9.79kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceSummary-CLJN7zkS.js.gz               12.19kb / gzip: 3.58kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BiometricEnrollmentPage-DTZnMPn1.js.gz         6.49kb / gzip: 2.15kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/blogApi-RKWxIlDl.js.gz                         1.00kb / gzip: 0.33kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlogDetail-BKyCWQbl.js.gz                      29.13kb / gzip: 7.49kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlogPage-CMKi7yWC.js.gz                        21.29kb / gzip: 5.59kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlurredImage-DqRqOggj.js.gz                    6.74kb / gzip: 2.60kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementDetailPage-B8XRaJ_l.js.gz          18.70kb / gzip: 4.66kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/Card-D3c0s-An.js.gz                            11.24kb / gzip: 3.13kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CampusMapPage-B9sEqaky.js.gz                   22.68kb / gzip: 6.33kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClaimListPage-BY06o8eE.js.gz                   7.80kb / gzip: 2.65kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClaimDetail-Chh33mEx.js.gz                     14.38kb / gzip: 4.15kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/classesApi-DZfKdvUU.js.gz                      1.10kb / gzip: 0.45kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ContactPage-iAXZjBHE.js.gz                     14.25kb / gzip: 4.05kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateAnnouncementRequestPage-aHOATNgu.js.gz   3.37kb / gzip: 1.20kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateOpportunityPage-5vh5lg2g.js.gz           4.54kb / gzip: 1.44kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClassesPage-BexWei3x.js.gz                     47.43kb / gzip: 11.55kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateBlog-DgnHhBqm.js.gz                      11.75kb / gzip: 3.82kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/EditBlogPage-DILY9zlX.js.gz                    9.19kb / gzip: 3.21kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/EditOpportunityPage-C-GZHRcN.js.gz             5.09kb / gzip: 1.58kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ForgotPasswordPage-Do1juilZ.js.gz              4.08kb / gzip: 1.57kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/FoundItemDetailPage-DWyECHV3.js.gz             13.25kb / gzip: 3.80kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/foundItemsApi-B0ktCe84.js.gz                   1.46kb / gzip: 0.47kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/geoService-egDj5fX7.js.gz                      1.90kb / gzip: 0.74kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/FoundItemsPage-DnCWETlA.js.gz                  14.82kb / gzip: 4.11kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/GovernanceStats-BRlKkxr3.js.gz                 3.61kb / gzip: 1.34kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/GovernanceDashboard-CGJomWmJ.js.gz             11.74kb / gzip: 3.31kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/HomepageScene-CluKYBqO.js.gz                   7.21kb / gzip: 2.45kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/LoginPage-DexcuCwM.js.gz                       18.61kb / gzip: 4.72kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/HomePage-CZcnHgH7.js.gz                        51.01kb / gzip: 14.70kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/MyFoundItemsPage-DqUyYM7m.js.gz                2.92kb / gzip: 1.18kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ManageTimetablePage-BJti1q3L.js.gz             12.20kb / gzip: 3.81kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/MyBlogPostsPage-DOG8DBZF.js.gz                 3.67kb / gzip: 1.43kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NotFoundPage-BGt4awLX.js.gz                    6.72kb / gzip: 1.93kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NotificationsPage-DwBWEPrn.js.gz               4.20kb / gzip: 1.58kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NearbyClassesPage-CAciENNf.js.gz               23.91kb / gzip: 7.44kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/OpportunityDetailPage-DGOYZumO.js.gz           6.74kb / gzip: 2.21kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/OpportunitiesPage-Cu_jqq9v.js.gz               23.42kb / gzip: 6.51kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/PostFoundItem-O4QtWlD8.js.gz                   13.98kb / gzip: 4.62kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ProfileEditPage-CT6yJeXV.js.gz                 3.82kb / gzip: 1.26kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/PrivacyPage-D2LYXlCO.js.gz                     15.11kb / gzip: 3.64kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ProfilePage-BqBnACP6.js.gz                     20.87kb / gzip: 4.05kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ResourceUploadPage-DoIfqugw.js.gz              3.99kb / gzip: 1.41kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SearchResultsPage-CfPW9-1y.js.gz               3.66kb / gzip: 1.09kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ResetPasswordPage-D2dSLqoO.js.gz               6.96kb / gzip: 2.11kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SessionsPage-DCVnpgFD.js.gz                    15.81kb / gzip: 4.39kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SignupPage-CwcVfGf0.js.gz                      14.05kb / gzip: 4.17kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/TwoFactorSetupPage-DvkOA64A.js.gz              6.27kb / gzip: 2.01kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/useGeolocation-BNXbrIF-.js.gz                  5.77kb / gzip: 2.60kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/TimetableManager-BVrRkNV3.js.gz                19.49kb / gzip: 5.28kb
dist/C:/Users/GATARA-BJTU/academe/frontend/service-worker.js.gz                              2.94kb / gzip: 1.07kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-date-BiKiMn9r.js.gz                     9.33kb / gzip: 3.16kb
dist/C:/Users/GATARA-BJTU/academe/frontend/sw.js.gz                                          7.44kb / gzip: 3.54kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/VenueDetailPage-qApj7DYz.js.gz                 16.66kb / gzip: 4.94kb
dist/C:/Users/GATARA-BJTU/academe/frontend/workbox-63c18b4d.js.gz                            22.32kb / gzip: 7.55kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/index-CpfRjmkF.js.gz                           153.28kb / gzip: 36.94kb
dist/C:/Users/GATARA-BJTU/academe/frontend/css/style-Ds__kdW_.css.gz                         344.83kb / gzip: 49.08kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-core-BHxsrp2j.js.gz                     625.97kb / gzip: 170.21kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-Dufet3wZ.js.gz                          1219.73kb / gzip: 320.31kb



✨ [vite-plugin-compression]:algorithm=brotliCompress - compressed file successfully: 
dist/C:/Users/GATARA-BJTU/academe/frontend/index.html.br                                     6.73kb / brotliCompress: 1.92kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminAuditLogsPage-pZlzZ6WT.js.br              6.10kb / brotliCompress: 1.92kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminReportsPage-DvNIphe8.js.br                3.49kb / brotliCompress: 1.21kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AboutPage-Ba6hIKJQ.js.br                       13.07kb / brotliCompress: 2.68kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminRolesPage-Bgo8nqhO.js.br                  10.68kb / brotliCompress: 2.72kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementRequestsPage-BuMzLP8Y.js.br        3.98kb / brotliCompress: 1.35kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementDetailPage-B8XRaJ_l.js.br          18.70kb / brotliCompress: 4.03kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceDetail-Bo7R68uU.js.br                2.74kb / brotliCompress: 0.93kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AdminDashboard-CaIJvgq5.js.br                  29.89kb / brotliCompress: 5.41kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceRing3D-Cq1pfbDr.js.br                5.59kb / brotliCompress: 1.93kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BiometricEnrollmentPage-DTZnMPn1.js.br         6.49kb / brotliCompress: 1.79kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/blogApi-RKWxIlDl.js.br                         1.00kb / brotliCompress: 0.29kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AttendanceSummary-CLJN7zkS.js.br               12.19kb / brotliCompress: 3.08kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/AnnouncementsPage-Dk1rDG9a.js.br               43.34kb / brotliCompress: 8.47kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlogPage-CMKi7yWC.js.br                        21.29kb / brotliCompress: 4.89kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlurredImage-DqRqOggj.js.br                    6.74kb / brotliCompress: 2.28kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/BlogDetail-BKyCWQbl.js.br                      29.13kb / brotliCompress: 6.55kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/Card-D3c0s-An.js.br                            11.24kb / brotliCompress: 2.78kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClaimDetail-Chh33mEx.js.br                     14.38kb / brotliCompress: 3.65kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClaimListPage-BY06o8eE.js.br                   7.80kb / brotliCompress: 2.27kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/classesApi-DZfKdvUU.js.br                      1.10kb / brotliCompress: 0.39kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CampusMapPage-B9sEqaky.js.br                   22.68kb / brotliCompress: 5.45kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateAnnouncementRequestPage-aHOATNgu.js.br   3.37kb / brotliCompress: 1.02kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateBlog-DgnHhBqm.js.br                      11.75kb / brotliCompress: 3.26kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ContactPage-iAXZjBHE.js.br                     14.25kb / brotliCompress: 3.45kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/CreateOpportunityPage-5vh5lg2g.js.br           4.54kb / brotliCompress: 1.23kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/EditBlogPage-DILY9zlX.js.br                    9.19kb / brotliCompress: 2.77kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ForgotPasswordPage-Do1juilZ.js.br              4.08kb / brotliCompress: 1.34kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/EditOpportunityPage-C-GZHRcN.js.br             5.09kb / brotliCompress: 1.36kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/foundItemsApi-B0ktCe84.js.br                   1.46kb / brotliCompress: 0.40kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ClassesPage-BexWei3x.js.br                     47.43kb / brotliCompress: 10.16kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/geoService-egDj5fX7.js.br                      1.90kb / brotliCompress: 0.63kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/FoundItemDetailPage-DWyECHV3.js.br             13.25kb / brotliCompress: 3.24kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/GovernanceStats-BRlKkxr3.js.br                 3.61kb / brotliCompress: 1.16kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/FoundItemsPage-DnCWETlA.js.br                  14.82kb / brotliCompress: 3.51kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/GovernanceDashboard-CGJomWmJ.js.br             11.74kb / brotliCompress: 2.82kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/HomepageScene-CluKYBqO.js.br                   7.21kb / brotliCompress: 2.18kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/LoginPage-DexcuCwM.js.br                       18.61kb / brotliCompress: 4.01kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ManageTimetablePage-BJti1q3L.js.br             12.20kb / brotliCompress: 3.28kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/HomePage-CZcnHgH7.js.br                        51.01kb / brotliCompress: 12.75kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/MyBlogPostsPage-DOG8DBZF.js.br                 3.67kb / brotliCompress: 1.25kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/MyFoundItemsPage-DqUyYM7m.js.br                2.92kb / brotliCompress: 1.03kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NotFoundPage-BGt4awLX.js.br                    6.72kb / brotliCompress: 1.63kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NotificationsPage-DwBWEPrn.js.br               4.20kb / brotliCompress: 1.41kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/NearbyClassesPage-CAciENNf.js.br               23.91kb / brotliCompress: 6.56kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/OpportunityDetailPage-DGOYZumO.js.br           6.74kb / brotliCompress: 1.93kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/OpportunitiesPage-Cu_jqq9v.js.br               23.42kb / brotliCompress: 5.63kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ProfileEditPage-CT6yJeXV.js.br                 3.82kb / brotliCompress: 1.08kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/PostFoundItem-O4QtWlD8.js.br                   13.98kb / brotliCompress: 3.89kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/PrivacyPage-D2LYXlCO.js.br                     15.11kb / brotliCompress: 3.05kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ResetPasswordPage-D2dSLqoO.js.br               6.96kb / brotliCompress: 1.82kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ProfilePage-BqBnACP6.js.br                     20.87kb / brotliCompress: 3.48kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/ResourceUploadPage-DoIfqugw.js.br              3.99kb / brotliCompress: 1.23kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SearchResultsPage-CfPW9-1y.js.br               3.66kb / brotliCompress: 0.96kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SessionsPage-DCVnpgFD.js.br                    15.81kb / brotliCompress: 3.82kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/SignupPage-CwcVfGf0.js.br                      14.05kb / brotliCompress: 3.55kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/TwoFactorSetupPage-DvkOA64A.js.br              6.27kb / brotliCompress: 1.76kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/useGeolocation-BNXbrIF-.js.br                  5.77kb / brotliCompress: 2.29kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/TimetableManager-BVrRkNV3.js.br                19.49kb / brotliCompress: 4.60kb
dist/C:/Users/GATARA-BJTU/academe/frontend/service-worker.js.br                              2.94kb / brotliCompress: 0.88kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-date-BiKiMn9r.js.br                     9.33kb / brotliCompress: 2.87kb
dist/C:/Users/GATARA-BJTU/academe/frontend/sw.js.br                                          7.44kb / brotliCompress: 3.07kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/VenueDetailPage-qApj7DYz.js.br                 16.66kb / brotliCompress: 4.29kb
dist/C:/Users/GATARA-BJTU/academe/frontend/workbox-63c18b4d.js.br                            22.32kb / brotliCompress: 6.83kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/index-CpfRjmkF.js.br                           153.28kb / brotliCompress: 30.76kb
dist/C:/Users/GATARA-BJTU/academe/frontend/css/style-Ds__kdW_.css.br                         344.83kb / brotliCompress: 32.20kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-core-BHxsrp2j.js.br                     625.97kb / brotliCompress: 129.63kb
dist/C:/Users/GATARA-BJTU/academe/frontend/js/vendor-Dufet3wZ.js.br                          1219.73kb / brotliCompress: 262.38kb


