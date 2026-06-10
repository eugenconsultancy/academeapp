Here's a detailed outline of each dependency, organized by category:

---

# **CORE FRAMEWORK**

## **react (18.2.0)**
- **What**: UI library for building component-based interfaces
- **How**: Virtual DOM reconciliation, hooks system for state/lifecycle
- **Files**: Every .jsx component file (App.jsx, Navbar.jsx, Sidebar.jsx, all page components)
- **Examples**: Netflix uses React for their streaming platform; Airbnb uses it for booking flows

## **react-dom (18.2.0)**
- **What**: React renderer for web browsers
- **How**: Bridges React components to actual DOM operations, handles events
- **Files**: main.jsx (ReactDOM.createRoot), every component that renders HTML
- **Examples**: Facebook.com uses react-dom for server-side rendering

## **react-reconciler (0.29.0)**
- **What**: React's core diffing algorithm engine
- **How**: Compares old and new virtual DOM trees, determines minimal DOM updates
- **Files**: Pinned version across all React packages ensuring consistent reconciliation
- **Examples**: Used internally by React Native, React ART, and custom renderers

---

# **ROUTING & NAVIGATION**

## **react-router-dom (^6.20.0)**
- **What**: Client-side routing for single-page applications
- **How**: Uses History API to sync URL with component tree, nested route matching
- **Files**: App.jsx (Routes, Route, Navigate), Navbar.jsx (Link, useNavigate), Sidebar.jsx (useLocation)
- **Examples**: GitHub uses React Router for navigating repos, issues, PRs without page reloads

---

# **STATE MANAGEMENT**

## **zustand (^4.4.0)**
- **What**: Lightweight state management library
- **How**: Creates stores with create() function, uses subscriptions to trigger re-renders only on accessed state changes
- **Files**: stores/useChatStore.js (chat conversations, messages, WebSocket state)
- **Examples**: Notion uses Zustand for editor state; Linear uses it for issue tracking state

## **immer (^11.1.8)**
- **What**: Immutable state updates with mutable syntax
- **How**: Uses ES6 Proxies to track changes on draft objects, produces new immutable state
- **Files**: stores/useChatStore.js (produce() wrapper for message state mutations)
- **Examples**: Redux Toolkit uses Immer internally for reducer logic

---

# **SERVER STATE & DATA FETCHING**

## **@tanstack/react-query (^5.0.0)**
- **What**: Server state management, caching, synchronization
- **How**: Manages cache keys, stale times, background refetching, optimistic updates
- **Files**: main.jsx (QueryClient configuration), hooks/useApi.js, hooks/useSyncMutation.js
- **Examples**: Shopify uses React Query for admin dashboard data; Coinbase for real-time prices

## **@tanstack/react-query-devtools (^5.100.11)**
- **What**: Development debugging tool for React Query
- **How**: Visualizes cache state, queries, mutations, timing; only renders in DEV mode
- **Files**: main.jsx (conditional rendering with import.meta.env.DEV)
- **Examples**: Used alongside React Query in development environments across thousands of projects

## **axios (^1.6.0)**
- **What**: HTTP client for browser and Node.js
- **How**: Wraps XMLHttpRequest/fetch with interceptors, automatic JSON parsing, request/response transformation
- **Files**: api/client.js (base API configuration), api/chatApi.js (chat endpoints)
- **Examples**: Uber uses Axios for API communication; Twitch for stream data fetching

---

# **USER INTERFACE & STYLING**

## **tailwindcss (^3.4.19)** (devDependency)
- **What**: Utility-first CSS framework
- **How**: Generates atomic CSS classes during build, purges unused styles for minimal output
- **Files**: All component .jsx files (className props with utility classes)
- **Examples**: NASA uses Tailwind for their website; NBA uses it for their stats platform

## **clsx (^2.1.0)**
- **What**: Conditional className string construction
- **How**: Joins class names, filters falsy values, handles objects/arrays for conditional classes
- **Files**: Navbar.jsx, Sidebar.jsx, and any component with dynamic class logic
- **Examples**: Vercel uses clsx across their design system components

## **react-icons (^4.12.0)**
- **What**: Icon library aggregating multiple icon sets
- **How**: Tree-shakeable SVG icon components, imports only used icons via ES modules
- **Files**: Navbar.jsx (FiMenu, FiBell, FiUser, etc.), Sidebar.jsx (FiHome, FiSettings)
- **Examples**: Vercel dashboard uses react-icons for navigation elements

## **react-hot-toast (^2.4.1)**
- **What**: Toast notification system
- **How**: Renders notifications outside React tree via portal, manages toast queue with animations
- **Files**: main.jsx (Toaster component), hooks/useSyncMutation.js (toast.success for offline saves)
- **Examples**: Supabase uses react-hot-toast for user feedback notifications

---

# **FORMATTING & DATES**

## **date-fns (^3.0.0)**
- **What**: Date utility library with functional approach
- **How**: Each function is a pure function imported individually, no mutable Date object wrapping
- **Files**: utils/datetime.js (formatTime, formatDate, getRelativeTime, academic helpers)
- **Examples**: Prisma uses date-fns for date formatting; AWS Amplify for time calculations

---

# **RICH TEXT & CONTENT**

## **react-quill (^2.0.0)**
- **What**: Rich text editor component
- **How**: Wraps Quill.js editor in React component with toolbar configuration
- **Files**: Pages with blog creation/editing (CreateBlog.jsx, EditBlogPage.jsx)
- **Examples**: LinkedIn uses Quill for article editor; Salesforce for email templates

## **dompurify (^3.4.7)**
- **What**: XSS sanitization for HTML content
- **How**: Parses HTML through browser's DOM parser, removes malicious elements/attributes, returns clean HTML
- **Files**: Used before rendering user-generated rich text content from react-quill
- **Examples**: GitLab uses DOMPurify for rendering markdown; Microsoft Teams for message sanitization

---

# **MAPS & GEOLOCATION**

## **leaflet (^1.9.4)**
- **What**: Interactive map library
- **How**: Renders tile layers, markers, popups using Canvas/SVG; handles zoom/pan gestures
- **Files**: Pages using campus maps and venue locations
- **Examples**: Foursquare uses Leaflet; GitHub uses it for location previews

## **react-leaflet (^4.2.1)**
- **What**: React bindings for Leaflet maps
- **How**: Provides React components (MapContainer, Marker, Popup) that manage Leaflet instances
- **Files**: CampusMapPage.jsx, VenueDetailPage.jsx, NearbyClassesPage.jsx
- **Examples**: Strava uses react-leaflet for activity maps

---

# **3D GRAPHICS**

## **three (^0.137.0)**
- **What**: 3D rendering library using WebGL
- **How**: Creates scenes, cameras, geometries, materials; renders to canvas element
- **Files**: Used for 3D campus visualizations or interactive elements
- **Examples**: IKEA uses Three.js for product visualization; Google for 3D maps

## **@react-three/fiber (8.12.0)**
- **What**: React renderer for Three.js
- **How**: Expresses Three.js scenes as declarative React components with JSX
- **Files**: 3D scene components (campus models, interactive elements)
- **Examples**: Bruno Simon's portfolio site uses R3F; Vercel's product pages use it

## **@react-three/drei (8.12.0)**
- **What**: Helper components and abstractions for react-three-fiber
- **How**: Provides pre-built controls, loaders, environments, text rendering
- **Files**: Used alongside @react-three/fiber for quicker 3D scene development
- **Examples**: Used in 3D product configurators and architectural visualization tools

---

# **VIRTUALIZATION & PERFORMANCE**

## **react-window (^2.2.7)**
- **What**: Virtualized list rendering for large datasets
- **How**: Only renders visible items in scroll viewport, recycles DOM nodes during scrolling
- **Files**: Lists with many items (notifications, announcements, chat messages)
- **Examples**: Twitter uses virtualization for tweet feeds; Discord for message lists

---

# **AUTHENTICATION & SECURITY**

## **jwt-decode (^4.0.0)**
- **What**: JWT token decoder
- **How**: Base64 decodes token payload without verifying signature
- **Files**: contexts/AuthContext.js (decoding user info from access tokens)
- **Examples**: Auth0 uses jwt-decode in their React SDK; Okta for token inspection

## **firebase (^12.13.0)**
- **What**: Google's app development platform SDK
- **How**: Provides authentication, real-time database, cloud messaging, analytics
- **Files**: Used for push notifications, analytics, or supplementary auth features
- **Examples**: The New York Times uses Firebase for real-time updates; Duolingo for push notifications

---

# **OFFLINE & STORAGE**

## **idb (^8.0.0)**
- **What**: IndexedDB wrapper with Promise-based API
- **How**: Abstracts IndexedDB's complex event-based API into clean async/await patterns
- **Files**: utils/storage.js (offlineStorage for sync queue and cached data)
- **Examples**: Google Photos uses IndexedDB for offline image storage; WhatsApp Web for message caching

---

# **FILE HANDLING**

## **react-dropzone (^14.2.3)**
- **What**: Drag-and-drop file upload component
- **How**: Creates hidden file input, handles drag events, provides file validation hooks
- **Files**: Pages with file upload (ResourceUploadPage, blog post creation, profile edit)
- **Examples**: Dropbox uses react-dropzone for file upload; Canva for image import

## **sharp (^0.34.5)**
- **What**: High-performance image processing
- **How**: Uses libvips C library for resizing, format conversion, optimization
- **Files**: Server-side or build-time image optimization (profile pictures, uploads)
- **Examples**: Next.js uses Sharp for image optimization; Gatsby for image processing

---

# **EMOJI & REACTIONS**

## **emoji-picker-react (^4.19.1)**
- **What**: Emoji picker component
- **How**: Renders categorized emoji grid with search, handles click-to-select with skin tone support
- **Files**: Chat components, blog post reactions
- **Examples**: Slack-style reaction pickers in team collaboration tools

---

# **PERFORMANCE MONITORING**

## **web-vitals (^3.5.0)**
- **What**: Core Web Vitals measurement library
- **How**: Uses Performance API to measure LCP, FID, CLS, INP; reports to analytics
- **Files**: main.jsx or analytics initialization (page tracking)
- **Examples**: Used by Google's web.dev measurement tools; thousands of production sites for RUM

---

# **MOBILE & DESKTOP**

## **@capacitor/core (^8.3.4)**
- **What**: Cross-platform native runtime for web apps
- **How**: Bridges JavaScript to native iOS/Android APIs via message passing
- **Files**: Main app entry for mobile builds (accessing device features)
- **Examples**: Burger King uses Capacitor for their mobile app; Southwest Airlines

## **@capacitor/cli (^8.3.4)**
- **What**: Command-line tools for Capacitor projects
- **How**: Manages native projects, plugin installation, platform syncing
- **Files**: Used during build/deploy for iOS and Android platforms
- **Examples**: CI/CD pipelines for mobile app deployments

## **@capacitor/ios (^8.3.4)**
- **What**: iOS platform support for Capacitor
- **How**: Provides Xcode project templates and iOS-specific native bridge
- **Files**: Generated iOS project files
- **Examples**: Any Capacitor app deploying to Apple App Store

## **@capacitor/push-notifications (^8.1.1)**
- **What**: Push notification plugin for Capacitor
- **How**: Registers device for push, handles token management, processes incoming notifications
- **Files**: Notification initialization code, contexts handling device registration
- **Examples**: E-commerce apps sending order updates; messaging apps for new message alerts

---

# **DESKTOP (ELECTRON)**

## **electron (^31.0.0)** (devDependency)
- **What**: Framework for building desktop apps with web technologies
- **How**: Bundles Chromium + Node.js, provides native OS integration (menus, notifications, file system)
- **Files**: electron/main.cjs (main process entry point)
- **Examples**: VS Code, Slack, Discord, Figma are all built with Electron

## **electron-is-dev (^2.0.0)**
- **What**: Detects if Electron is running in development mode
- **How**: Checks if app is packaged or running from source
- **Files**: electron/main.cjs (conditional dev tools loading)
- **Examples**: Used in Electron apps to enable dev tools only during development

## **electron-builder (^26.8.1)** (devDependency)
- **What**: Packaging and distribution tool for Electron apps
- **How**: Compiles app into platform-specific installers (NSIS for Windows, DMG for Mac, AppImage for Linux)
- **Files**: package.json build configuration
- **Examples**: Notion, WhatsApp Desktop use electron-builder for distribution

---

# **BUILD TOOLS**

## **vite (^5.0.0)** (devDependency)
- **What**: Next-generation frontend build tool
- **How**: Uses native ES modules for dev server (instant HMR), Rollup for production builds
- **Files**: vite.config.js (project root configuration)
- **Examples**: Vue.js official build tool; Nuxt 3 uses Vite; Astro uses Vite internally

## **@vitejs/plugin-react (^5.2.0)** (devDependency)
- **What**: React support plugin for Vite
- **How**: Enables JSX transform, Fast Refresh, React-specific optimizations
- **Files**: vite.config.js plugin registration
- **Examples**: Every React+Vite project uses this for React support

## **@vitejs/plugin-legacy (^5.4.3)** (devDependency)
- **What**: Legacy browser support for Vite
- **How**: Generates legacy chunks with polyfills, serves modern code to modern browsers via module/nomodule pattern
- **Files**: vite.config.js (production builds for older browsers)
- **Examples**: Government websites needing IE11 support use legacy plugins

## **vite-plugin-compression (^0.5.1)** (devDependency)
- **What**: Build-time asset compression
- **How**: Generates .gz and .br versions of built assets for server compression
- **Files**: vite.config.js (build output compression)
- **Examples**: Sites using nginx/Caddy for serving pre-compressed static assets

## **vite-plugin-image-optimizer (^2.0.3)** (devDependency)
- **What**: Image optimization during build
- **How**: Compresses PNG, JPEG, SVG, WebP using Sharp/Svgo during Vite build
- **Files**: vite.config.js (asset pipeline)
- **Examples**: Portfolio sites optimizing large image galleries at build time

## **vite-plugin-pwa (^0.17.5)** (devDependency)
- **What**: Progressive Web App support for Vite
- **How**: Generates service worker with Workbox, manifest.json, offline caching strategies
- **Files**: vite.config.js (PWA configuration), public/manifest.json
- **Examples**: Twitter Lite uses PWA; Starbucks PWA for offline ordering

---

# **CSS & POST-PROCESSING**

## **postcss (^8.5.15)** (devDependency)
- **What**: CSS transformation tool
- **How**: Parses CSS into AST, applies plugins, generates optimized output
- **Files**: postcss.config.js (Tailwind CSS processing pipeline)
- **Examples**: Facebook uses PostCSS for CSS modules; Bootstrap for theme generation

## **autoprefixer (^10.5.0)** (devDependency)
- **What**: CSS vendor prefix automation
- **How**: Uses Can I Use data to add browser-specific prefixes where needed
- **Files**: postcss.config.js (runs after Tailwind generates CSS)
- **Examples**: Used by virtually every modern web project with CSS processing

## **@tailwindcss/forms (^0.5.11)** (devDependency)
- **What**: Form element reset/normalization for Tailwind
- **How**: Provides base styles for inputs, selects, checkboxes that match Tailwind's design system
- **Files**: tailwind.config.js plugins array
- **Examples**: SaaS dashboards using Tailwind for consistent form styling

## **@tailwindcss/typography (^0.5.19)** (devDependency)
- **What**: Prose styling plugin for Tailwind
- **How**: Adds `prose` class that styles rich text content (headings, lists, links) automatically
- **Files**: Blog post pages, announcement detail pages (rich text content areas)
- **Examples**: Documentation sites; blog platforms displaying markdown-rendered content

## **@tailwindcss/aspect-ratio (^0.4.2)** (devDependency)
- **What**: Fixed aspect ratio utilities
- **How**: Provides `aspect-*` classes for maintaining element proportions
- **Files**: Components with embedded media (blog images, campus map tiles)
- **Examples**: YouTube embeds maintaining 16:9 ratio; profile image containers

## **@tailwindcss/container-queries (^0.1.1)** (devDependency)
- **What**: Container query support for Tailwind
- **How**: Enables `@container` queries that respond to parent size instead of viewport
- **Files**: Reusable card components that adapt to their container width
- **Examples**: Dashboard widgets that resize independently; responsive sidebars

---

# **TESTING**

## **vitest (^1.2.0)** (devDependency)
- **What**: Vite-native testing framework
- **How**: Uses same transform pipeline as Vite, Jest-compatible API, parallel test execution
- **Files**: *.test.jsx files throughout src/
- **Examples**: Vue core uses Vitest; Slidev uses it for presentation testing

## **@testing-library/react (^14.1.0)** (devDependency)
- **What**: React component testing utilities
- **How**: Renders components in test DOM, provides queries that mimic user interactions
- **Files**: Component test files (rendering, click handlers, state changes)
- **Examples**: React's own documentation recommends Testing Library; used by Material-UI

## **@testing-library/jest-dom (^6.2.0)** (devDependency)
- **What**: Custom DOM matchers for Jest/Vitest
- **How**: Adds matchers like `toBeInTheDocument()`, `toHaveTextContent()` to expect statements
- **Files**: Test setup file (global matcher registration)
- **Examples**: Standard companion to React Testing Library across the industry

## **jsdom (^23.0.0)** (devDependency)
- **What**: JavaScript implementation of DOM and HTML standards
- **How**: Simulates browser environment in Node.js for testing without a real browser
- **Files**: vitest.config.js (environment configuration)
- **Examples**: Jest uses jsdom by default for React component testing

---

# **CODE QUALITY**

## **eslint (^8.57.1)** (devDependency)
- **What**: Static code analysis tool
- **How**: Parses JavaScript into AST, applies rules to detect problems and enforce style
- **Files**: .eslintrc.js (project root), all .jsx files during linting
- **Examples**: Airbnb's JavaScript style guide uses ESLint; Google's internal code standards

## **eslint-plugin-react (^7.33.0)** (devDependency)
- **What**: React-specific linting rules
- **How**: Detects missing key props, unused state, accessibility issues in JSX
- **Files**: .eslintrc.js plugins section
- **Examples**: Detects `<img>` without alt text, prevents direct state mutation

## **eslint-plugin-react-hooks (^4.6.0)** (devDependency)
- **What**: Enforces React Hooks rules
- **How**: Checks dependency arrays in useEffect/useCallback/useMemo, prevents hooks in conditionals
- **Files**: Applied to all component files using React hooks
- **Examples**: Catches missing dependencies that cause stale closures or infinite loops

## **eslint-plugin-react-refresh (^0.4.0)** (devDependency)
- **What**: Ensures compatibility with Vite's React Fast Refresh
- **How**: Warns about patterns that break Hot Module Replacement (exporting non-components)
- **Files**: Applied during development builds
- **Examples**: Prevents accidental HMR breakage in component files

## **eslint-plugin-deprecation (^3.0.0)** (devDependency)
- **What**: Detects usage of deprecated APIs
- **How**: Analyzes TypeScript/JSDoc deprecation annotations and flags usage
- **Files**: Applied during linting to warn about deprecated function calls
- **Examples**: Large codebases phasing out old API versions use this for migration tracking

## **prettier (^3.2.0)** (devDependency)
- **What**: Opinionated code formatter
- **How**: Parses code into AST, reprints with consistent spacing, quotes, line breaks
- **Files**: All source files (configured via .prettierrc)
- **Examples**: React core team uses Prettier; Babel project enforces formatting with it

---

# **GIT WORKFLOW**

## **husky (^9.0.0)** (devDependency)
- **What**: Git hooks manager
- **How**: Configures Git hooks (pre-commit, pre-push) to run scripts automatically
- **Files**: .husky/ directory (hook scripts)
- **Examples**: Most open-source projects use Husky for pre-commit linting and testing

## **lint-staged (^15.2.0)** (devDependency)
- **What**: Runs linters only on staged Git files
- **How**: Takes list of staged files from Git, matches against glob patterns, runs specified commands
- **Files**: package.json "lint-staged" configuration
- **Examples**: Used with Husky to lint/format only changed files before commit

---

# **BUILD ANALYSIS**

## **rollup-plugin-visualizer (^5.14.0)** (devDependency)
- **What**: Bundle size visualization tool
- **How**: Generates treemap/sunburst HTML reports showing module sizes in the bundle
- **Files**: vite.config.js (runs during build:analyze script)
- **Examples**: Used to identify large dependencies bloating bundle size

---

# **CONCURRENT PROCESSES**

## **concurrently (^8.2.2)** (devDependency)
- **What**: Runs multiple commands simultaneously
- **How**: Spawns child processes, combines output streams with prefixes
- **Files**: Used in electron:dev script (vite dev server + electron process)
- **Examples**: Full-stack projects running frontend and backend dev servers together

## **wait-on (^7.2.0)** (devDependency)
- **What**: Waits for resources to become available before proceeding
- **How**: Polls HTTP endpoints/files/tcp ports until they respond
- **Files**: electron:dev script (waits for Vite dev server before launching Electron)
- **Examples**: E2E testing setups waiting for dev server before running tests

---

# **ASSET CONVERSION**

## **png-to-ico (^3.0.1)** (devDependency)
- **What**: Converts PNG images to ICO format
- **How**: Reads PNG files, outputs Windows .ico format with multiple sizes
- **Files**: Build scripts generating Windows app icons
- **Examples**: Electron app builds requiring .ico format for Windows installers

---

# **TYPE DEFINITIONS**

## **@types/react (^18.2.0)** (devDependency)
- **What**: TypeScript type definitions for React
- **How**: Provides type information for IDE autocompletion, type checking
- **Files**: Provides types that VS Code uses for JSX component intelligence
- **Examples**: Required for TypeScript projects using React

## **@types/react-dom (^18.2.0)** (devDependency)
- **What**: TypeScript types for ReactDOM
- **How**: Type definitions for createRoot, render, portals
- **Files**: Type checking for main.jsx root creation
- **Examples**: TypeScript React projects needing DOM API types

## **@types/leaflet (^1.9.21)** (devDependency)
- **What**: TypeScript definitions for Leaflet map library
- **How**: Provides type information for map, marker, layer APIs
- **Files**: Type checking in map-related components
- **Examples**: TypeScript projects using Leaflet for map features

---

# **REAL-WORLD USAGE PATTERNS IN ACADEME**

| **Feature** | **Dependencies Working Together** |
|------------|----------------------------------|
| **Chat System** | zustand (state) + immer (immutable updates) + axios (API) + react-window (message list) + emoji-picker-react (reactions) |
| **Offline Mode** | idb (storage) + navigator.onLine detection + react-hot-toast (notifications) + date-fns (queued timestamps) |
| **Campus Maps** | leaflet + react-leaflet (rendering) + @capacitor/geolocation (mobile GPS) |
| **Blog Editor** | react-quill (editing) + dompurify (sanitize) + react-dropzone (image upload) + sharp (image optimization) |
| **PWA** | vite-plugin-pwa (service worker) + idb (offline data) + web-vitals (performance) |
| **Desktop App** | electron (runtime) + electron-builder (packaging) + concurrently (dev workflow) |
| **Mobile App** | @capacitor/core (native bridge) + @capacitor/push-notifications (alerts) + firebase (cloud messaging) |












CLAUDE 2  :::



Your `package.json` reveals a complex, cross-platform architecture that bridges **Web (React/PWA), Desktop (Electron), and Mobile (Capacitor)**.

Here is the breakdown of your dependencies, organized by their architectural role.

---

### 1. The Core Engine (Framework & State)

* **React / React-DOM:** The UI library. Used in all `src/` files.
* **Zustand:** A minimalist state manager. Used for global data (Chat Store, User Auth). *Real-world use: Keeping track of "is this user logged in?" without prop-drilling.*
* **Immer:** Used alongside Zustand for immutable state updates. *Real-world use: Updating a deeply nested message object without manually copying the whole object.*
* **TanStack React Query:** Data fetching and caching. *Real-world use: Automatically caching API responses for your campus dashboards so they don't reload on every navigation.*

### 2. Multi-Platform Bridge (Electron & Capacitor)

* **Electron / Electron-Builder:** Packages your web app as a standalone `.exe`, `.dmg`, or AppImage.
* **Capacitor (CLI, Core, iOS, Android):** This is your bridge to mobile. It wraps your web code in a native container so it runs on phones.
* **Electron-is-dev:** A tiny utility to detect if you are in development or production. *Real-world use: Disabling developer shortcuts (like F12 console access) in the final production release.*

### 3. Rich UI & Media

* **React-Three-Fiber / Drei:** 3D graphics library for React. *Real-world use: If you have an interactive 3D campus map or a 3D visualization of student projects.*
* **Leaflet / React-Leaflet:** Mapping library. *Real-world use: Pinning building locations or displaying a campus navigation view.*
* **React-Quill:** A Rich Text Editor. *Real-world use: Allowing students to format posts or assignments with bold/italics.*
* **Emoji-picker-react:** UI component for selecting emojis. Used in your Chat module.

### 4. Data & Utilities

* **Axios:** The HTTP client. Used to talk to your backend.
* **Date-fns:** The gold standard for date manipulation. Used in `dateUtils.js`. *Real-world use: Calculating "3 days ago" or "Term 1 start date".*
* **IDB (IndexedDB):** Low-level asynchronous database in the browser. *Real-world use: Storing your offline sync queue (the tasks you need to send when the internet returns).*
* **Dompurify:** Sanitizes HTML. **CRITICAL:** Used whenever you display text from a user (like a forum post) to prevent XSS attacks.
* **JWT-Decode:** Used to extract data from an authentication token. *Real-world use: Reading the `userId` or `role` from the login token.*

### 5. Development, Quality, & Performance

* **Vite:** The build tool. It replaces Webpack to provide near-instant server starts.
* **Tailwind CSS & Plugins:** Utility-first CSS. The plugins (`aspect-ratio`, `forms`, `typography`) add support for specific styling patterns like clean document formatting.
* **ESLint / Prettier / Husky / Lint-staged:** The "Quality Gate."
* **Husky + Lint-staged:** Ensures that when you try to `git commit`, your code is automatically linted and formatted. If it fails, the commit is blocked.


* **Vitest / Testing-Library:** Your testing suite. Used to ensure your `dateUtils.js` and logic components don't break when you update them.
* **Sharp:** Image processing. Used by `vite-plugin-image-optimizer` to shrink file sizes during build.

---

### Architectural Outline: Where it all works

| Dependency Category | Primary Files | Usage Context |
| --- | --- | --- |
| **Electron** | `electron/main.cjs` | Native OS windows, file system access, menu bars. |
| **Capacitor** | `capacitor.config.ts` | Mobile native features (Push Notifications). |
| **UI/View** | `src/components/**/*` | All React functional components. |
| **State** | `src/store/**/*` | Global application data (Chat, Auth). |
| **Logic** | `src/utils/**/*` | Shared helper logic (Date formatting, Syncing). |

### Real-World Example Scenario: "Submitting an Assignment"

1. **React-Quill:** You type your assignment.
2. **Date-fns:** You check if the current date is before the deadline.
3. **Axios:** You click "Submit"; `useSyncMutation` tries to send it.
4. **Internet Offline?** `IDB` catches the request, stores it in the browser's indexed database.
5. **Online?** The request hits the server.
6. **TanStack Query:** Once the server says "Success," the query invalidates, and your dashboard UI automatically updates to show "Submitted."
7. **Husky:** Before you even committed the code for this feature, `Lint-staged` ensured your code followed strict formatting rules.

**Would you like me to focus on explaining the setup of one of these bridges specifically (e.g., how the Electron `main.cjs` communicates with your React frontend)?**







dEPLOYMENT GUIDE TO HOSTINGER::

show you:

- How to connect the frontend and backend together
- How to implement a database using sql
- How to deploy the app on the same server using a virtual private server - which is the most scalable, secure & performant way to deploy applications
- As well as how to connect the app to a domain

📧 FREE newsletter (get FREE computer science degree template as a sign up bonus) - https://academy.internetmadecoder.com/internet-made-club?video=z-Ib2imwy_Q

CHAPTERS:
 Project intro & what we will learn
 The architecture
 Coding the skeleton
 Virtual private server setup
 Coding the React frontend
 Coding the Django backend
 Connecting React & Django
 Deploying the application on a VPS
 Connecting a domain

 ALSO CAN THE BUILD COMMAND RUN IF THERE IS A MISSING DEPENDANCY IN BACKEND INSTALLATION? ALSO PROVUDE TERMINAL COMMANDS TO CHECK IF ALL THE REQUUREMENTS CALLED IN THE PROJECT WERE INSTALLED AN AVAILABLE IN REQUIREMENTS.TXT.