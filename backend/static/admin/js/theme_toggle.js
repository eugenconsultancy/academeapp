// ============================================
// ACADEME – PREMIUM DASHBOARD ENGINE
// Top Navigation, Contextual Sidebar, Themes
// ============================================
(function () {
    const themes = ['midnight', 'graphite', 'frost', 'violet-dark', 'slate', 'system'];
    const STORAGE_KEY = 'academe_theme';
    let currentTheme = localStorage.getItem(STORAGE_KEY) || 'midnight';

    // ── THEME LOGIC ────────────────────────────
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(themeName) {
        themes.forEach(t => document.body.classList.remove(`theme-${t}`));
        if (themeName === 'system') {
            const isDark = mediaQuery.matches;
            document.body.classList.add(isDark ? 'theme-midnight' : 'theme-frost');
        } else {
            document.body.classList.add(`theme-${themeName}`);
        }
        document.querySelectorAll('.theme-option').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === themeName);
        });
    }
    function setTheme(themeName) {
        currentTheme = themeName;
        localStorage.setItem(STORAGE_KEY, themeName);
        applyTheme(themeName);
        if (themeName === 'system') {
            mediaQuery.addEventListener('change', systemHandler);
        } else {
            mediaQuery.removeEventListener('change', systemHandler);
        }
    }
    function systemHandler(e) { if (currentTheme === 'system') applyTheme('system'); }

    // ── CREATE THEME PILL ─────────────────────
    function createThemePill() {
        const pill = document.createElement('div');
        pill.className = 'theme-pill';
        pill.innerHTML = `
      <span class="theme-option" data-theme="midnight" title="Midnight">🌙</span>
      <span class="theme-option" data-theme="graphite" title="Graphite">⚫</span>
      <span class="theme-option" data-theme="frost" title="Frost">❄️</span>
      <span class="theme-option" data-theme="violet-dark" title="Violet Dark">💜</span>
      <span class="theme-option" data-theme="slate" title="Slate">🔵</span>
      <span class="theme-option" data-theme="system" title="System">💻</span>
    `;
        document.body.appendChild(pill);
        pill.addEventListener('click', e => {
            const opt = e.target.closest('.theme-option');
            if (opt) setTheme(opt.dataset.theme);
        });
    }

    // ── BUILD TOP NAVIGATION BAR ──────────────
    function createTopNav() {
        // Remove any existing top-nav or main-header
        document.querySelector('.main-header')?.remove();
        document.querySelector('.top-nav')?.remove();

        const nav = document.createElement('div');
        nav.className = 'top-nav';
        nav.innerHTML = `
      <a href="/admin/" class="brand"><i class="fas fa-graduation-cap"></i> Academe</a>
      <div class="nav-modules" id="topNavModules"></div>
      <div style="display:flex; gap:0.5rem;">
        <a href="/admin/accounts/user/" class="btn btn-ghost" style="padding:0.4rem 0.8rem;"><i class="fas fa-user-circle"></i></a>
      </div>
    `;
        document.body.prepend(nav);
        populateNavModules();
        // Active detection
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-module').forEach(tab => {
            if (currentPath.startsWith(tab.dataset.path)) tab.classList.add('active');
        });
    }

    function populateNavModules() {
        const container = document.getElementById('topNavModules');
        if (!container) return;
        const modules = [
            { name: 'Dashboard', icon: 'fa-chart-line', path: '/admin/' },
            { name: 'Students', icon: 'fa-user-graduate', path: '/admin/accounts/' },
            { name: 'Academics', icon: 'fa-layer-group', path: '/admin/classes/' },
            { name: 'Communication', icon: 'fa-bullhorn', path: '/admin/announcements/' },
            { name: 'Governance', icon: 'fa-landmark', path: '/admin/governance/' },
            { name: 'Finance', icon: 'fa-coins', path: '#' }
        ];
        container.innerHTML = modules.map(m => `
      <div class="nav-module" data-path="${m.path}">
        <i class="fas ${m.icon}"></i> ${m.name}
      </div>
    `).join('');
        // Click event – navigate and update sidebar
        container.querySelectorAll('.nav-module').forEach(el => {
            el.addEventListener('click', () => {
                window.location.href = el.dataset.path === '#' ? '#' : el.dataset.path;
            });
        });
    }

    // ── CONTEXTUAL SIDEBAR ────────────────────
    function createContextSidebar() {
        document.querySelector('.context-sidebar')?.remove();
        const sidebar = document.createElement('div');
        sidebar.className = 'context-sidebar';
        sidebar.id = 'contextSidebar';
        document.body.appendChild(sidebar);
        updateContextSidebar();
    }

    function updateContextSidebar() {
        const path = window.location.pathname;
        let title = 'Navigation';
        let links = [];
        if (path.startsWith('/admin/accounts/')) {
            title = 'Students';
            links = [
                { name: 'All Users', url: '/admin/accounts/user/', icon: 'fa-users' },
                { name: 'Badges', url: '/admin/accounts/badge/', icon: 'fa-medal' },
                { name: 'Groups', url: '/admin/auth/group/', icon: 'fa-users-cog' },
            ];
        } else if (path.startsWith('/admin/classes/')) {
            title = 'Academics';
            links = [
                { name: 'Class Groups', url: '/admin/classes/classgroup/', icon: 'fa-layer-group' },
                { name: 'Timetable', url: '/admin/classes/timetableentry/', icon: 'fa-calendar-alt' },
                { name: 'Attendance', url: '/admin/classes/attendancerecord/', icon: 'fa-clipboard-check' },
                { name: 'Venues', url: '/admin/classes/campusvenue/', icon: 'fa-map-marker-alt' },
            ];
        } else if (path.startsWith('/admin/announcements/')) {
            title = 'Communication';
            links = [
                { name: 'Announcements', url: '/admin/announcements/announcement/', icon: 'fa-bullhorn' },
                { name: 'Notifications', url: '/admin/notifications/notification/', icon: 'fa-bell' },
            ];
        } else if (path.startsWith('/admin/governance/')) {
            title = 'Governance';
            links = [
                { name: 'Audit Logs', url: '/admin/governance/auditlog/', icon: 'fa-history' },
                { name: 'Platform Stats', url: '/admin/governance/platformstats/', icon: 'fa-chart-bar' },
            ];
        } else if (path.startsWith('/admin/blog/')) {
            title = 'Content';
            links = [
                { name: 'Blog Posts', url: '/admin/blog/blogpost/', icon: 'fa-blog' },
                { name: 'Categories', url: '/admin/blog/blogcategory/', icon: 'fa-tags' },
            ];
        } else if (path.startsWith('/admin/support/')) {
            title = 'Support';
            links = [
                { name: 'Tickets', url: '/admin/support/supportticket/', icon: 'fa-ticket-alt' },
            ];
        } else {
            // Default fallback (Dashboard / other)
            title = 'Quick Links';
            links = [
                { name: 'Dashboard', url: '/admin/', icon: 'fa-tachometer-alt' },
                { name: 'Users', url: '/admin/accounts/user/', icon: 'fa-users' },
                { name: 'Blog Posts', url: '/admin/blog/blogpost/', icon: 'fa-blog' },
                { name: 'Opportunities', url: '/admin/opportunities/opportunity/', icon: 'fa-briefcase' },
                { name: 'Support Tickets', url: '/admin/support/supportticket/', icon: 'fa-ticket-alt' },
            ];
        }
        const sidebar = document.getElementById('contextSidebar');
        if (!sidebar) return;
        sidebar.innerHTML = `
      <div class="sidebar-title">${title}</div>
      ${links.map(l => `
        <a href="${l.url}" class="sidebar-link">
          <i class="fas ${l.icon}"></i> ${l.name}
        </a>
      `).join('')}
    `;
        // Highlight active
        sidebar.querySelectorAll('.sidebar-link').forEach(a => {
            if (a.href === window.location.href) a.classList.add('active');
        });
    }

    // ── GREETING HEADER ───────────────────────
    function addGreeting() {
        const h1 = document.querySelector('.content-header h1');
        if (!h1) return;
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        const el = document.createElement('div');
        el.className = 'text-muted';
        el.style.fontSize = '0.95rem';
        el.style.marginBottom = '0.25rem';
        el.textContent = greet + ', Administrator';
        h1.parentNode.insertBefore(el, h1);
    }

    // ── ENHANCE MODEL TILES (dashboard) ───────
    function enhanceModelTiles() {
        const dashboard = document.querySelector('.dashboard');
        if (!dashboard) return;
        const modelList = dashboard.querySelector('.model-list-widget');
        if (!modelList) return;
        const links = modelList.querySelectorAll('a');
        if (links.length === 0) return;

        const grid = document.createElement('div');
        grid.className = 'model-tile-grid';
        grid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-top:1rem;';

        const meta = {
            'User': { total: 245, active: 198, desc: 'Students, staff & admins' },
            'FoundItem': { total: 34, active: 12, desc: 'Lost & found items' },
            'Announcement': { total: 56, active: 8, desc: 'Campus announcements' },
            'Opportunity': { total: 23, active: 5, desc: 'Jobs & internships' },
            'ClassGroup': { total: 12, active: 10, desc: 'Class groups & timetable' },
            'SupportTicket': { total: 18, active: 3, desc: 'Support tickets' },
        };
        const icons = {
            'User': 'fa-users', 'FoundItem': 'fa-box-open', 'Announcement': 'fa-bullhorn',
            'Opportunity': 'fa-briefcase', 'ClassGroup': 'fa-layer-group', 'SupportTicket': 'fa-ticket-alt',
        };

        links.forEach(link => {
            const name = link.textContent.trim();
            const href = link.getAttribute('href');
            const data = meta[name] || { total: 0, active: 0, desc: 'Manage records' };
            const tile = document.createElement('div');
            tile.className = 'card card-primary-feature';
            tile.innerHTML = `
        <div class="card-body" style="padding:1.5rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
            <div style="width:44px;height:44px;background:var(--accent-soft);border-radius:0.75rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--accent-primary);">
              <i class="fas ${icons[name] || 'fa-cube'}"></i>
            </div>
            <div>
              <div class="card-title" style="margin:0;">${name}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${data.desc}</div>
            </div>
          </div>
          <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:1rem;">
            <span style="font-weight:700; color:var(--text-accent);">${data.total}</span> total · <span style="font-weight:700; color:var(--text-accent);">${data.active}</span> active
          </div>
          <div style="display:flex; gap:0.5rem;">
            <a href="${href}" class="btn btn-primary btn-sm">View all</a>
            <a href="${href}add/" class="btn btn-ghost btn-sm">Add</a>
          </div>
        </div>`;
            grid.appendChild(tile);
        });
        modelList.innerHTML = '';
        modelList.appendChild(grid);
    }

    // ── ENHANCE ACTIVITY FEED ─────────────────
    function enhanceActivityFeed() {
        const widget = document.querySelector('.recent-actions-widget');
        if (!widget) return;
        const container = document.createElement('div');
        container.className = 'recent-activity-container';
        const items = widget.querySelectorAll('li');
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
        <div class="activity-icon"><i class="fas fa-circle" style="font-size:0.5rem;"></i></div>
        <div class="activity-content">${item.innerHTML}</div>
        <div class="activity-time">Just now</div>
      `;
            container.appendChild(div);
        });
        widget.innerHTML = '';
        widget.appendChild(container);
    }

    // ── COMMAND PALETTE (Ctrl+K) ──────────────
    function toggleCommandPalette() {
        const existing = document.querySelector('.command-palette-overlay');
        if (existing) { existing.remove(); return; }
        const overlay = document.createElement('div');
        overlay.className = 'command-palette-overlay';
        overlay.innerHTML = `
      <div class="command-palette-dialog">
        <input type="text" class="command-palette-input" placeholder="Type a command...">
        <div class="command-palette-results"></div>
      </div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) toggleCommandPalette(); });
        document.body.appendChild(overlay);
        overlay.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Escape') toggleCommandPalette(); });
    }

    // ── ANIMATE STAT NUMBERS ──────────────────
    function animateStats() {
        document.querySelectorAll('.stat-card .stat-number').forEach(el => {
            const target = parseInt(el.textContent);
            if (isNaN(target)) return;
            let current = 0;
            const step = Math.ceil(target / 30);
            const timer = setInterval(() => {
                current += step;
                if (current >= target) { el.textContent = target; clearInterval(timer); }
                else { el.textContent = current; }
            }, 30);
        });
    }

    // ── INITIALIZE ────────────────────────────
    function init() {
        applyTheme(currentTheme);
        createThemePill();
        createTopNav();
        createContextSidebar();
        // Wait for Jazzmin rendering
        window.addEventListener('load', () => {
            setTimeout(() => {
                enhanceModelTiles();
                enhanceActivityFeed();
                addGreeting();
                animateStats();
            }, 500);
        });
        document.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); toggleCommandPalette(); }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();