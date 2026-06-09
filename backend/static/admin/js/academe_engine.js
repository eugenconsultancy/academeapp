/**
 * ACADEME ADMIN ENGINE v3.0
 * ===========================
 * Production-ready, self-healing dashboard engine for Django Admin + Jazzmin.
 * 
 * Architecture:
 * - IIFE encapsulation (no global pollution)
 * - MutationObserver for AJAX-loaded content
 * - localStorage for theme persistence
 * - requestAnimationFrame for smooth animations
 * - Guard clauses on all enhancers
 * - Self-healing builders (remove existing before injecting)
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       STATE & CONSTANTS
       ═══════════════════════════════════════════════════════════════ */
    const STORAGE_THEME = 'academe_admin_theme';
    const THEMES = ['dark', 'light'];

    let activeTheme = localStorage.getItem(STORAGE_THEME) || 'dark';
    let paletteOpen = false;
    let focusedIdx = 0;
    let filteredItems = [];
    let observer = null;

    /* ═══════════════════════════════════════════════════════════════
       NAVIGATION DEFINITIONS
       ═══════════════════════════════════════════════════════════════ */
    const NAV_MODULES = [
        {
            id: 'dashboard',
            label: 'Dashboard', icon: 'fa-tachometer-alt',
            path: '/admin/',
            exact: true,
            children: [
                { label: 'Overview', url: '/admin/', icon: 'fa-chart-pie' },
                { label: 'Users', url: '/admin/accounts/user/', icon: 'fa-users' },
                { label: 'Recent Actions', url: '/admin/', icon: 'fa-clock' },
            ]
        },
        {
            id: 'students',
            label: 'Students', icon: 'fa-user-graduate',
            path: '/admin/accounts/',
            children: [
                { label: 'All Users', url: '/admin/accounts/user/', icon: 'fa-users' },
                { label: 'Badges', url: '/admin/accounts/badge/', icon: 'fa-medal' },
                { label: 'Groups', url: '/admin/auth/group/', icon: 'fa-users-cog' },
            ]
        },
        {
            id: 'academics',
            label: 'Academics', icon: 'fa-layer-group',
            path: '/admin/classes/',
            children: [
                { label: 'Class Groups', url: '/admin/classes/classgroup/', icon: 'fa-layer-group' },
                { label: 'Timetable', url: '/admin/classes/timetableentry/', icon: 'fa-calendar-alt' },
                { label: 'Attendance', url: '/admin/classes/attendancerecord/', icon: 'fa-clipboard-check' },
                { label: 'Venues', url: '/admin/classes/campusvenue/', icon: 'fa-map-marker-alt' },
            ]
        },
        {
            id: 'communication',
            label: 'Communication', icon: 'fa-bullhorn',
            path: '/admin/announcements/',
            children: [
                { label: 'Announcements', url: '/admin/announcements/announcement/', icon: 'fa-bullhorn' },
                { label: 'Notifications', url: '/admin/notifications/notification/', icon: 'fa-bell', badge: '3' },
                { label: 'Chat', url: '/admin/chat/', icon: 'fa-comments' },
                { label: 'Blog Posts', url: '/admin/blog/blogpost/', icon: 'fa-blog' },
            ]
        },
        {
            id: 'governance',
            label: 'Governance', icon: 'fa-landmark',
            path: '/admin/governance/',
            children: [
                { label: 'Audit Logs', url: '/admin/governance/auditlog/', icon: 'fa-history' },
                { label: 'Audit Archives', url: '/admin/governance/auditarchive/', icon: 'fa-archive' },
                { label: 'Platform Stats', url: '/admin/governance/platformstats/', icon: 'fa-chart-bar' },
                { label: 'Role Histories', url: '/admin/governance/rolehistory/', icon: 'fa-user-shield' },
            ]
        },
        {
            id: 'support',
            label: 'Support', icon: 'fa-headset',
            path: '/admin/support/',
            children: [
                { label: 'Tickets', url: '/admin/support/supportticket/', icon: 'fa-ticket-alt', badge: '12' },
            ]
        },
        {
            id: 'opportunities',
            label: 'Opportunities', icon: 'fa-briefcase',
            path: '/admin/opportunities/',
            children: [
                { label: 'Opportunities', url: '/admin/opportunities/opportunity/', icon: 'fa-briefcase' },
                { label: 'Applications', url: '/admin/opportunities/application/', icon: 'fa-file-alt' },
            ]
        },
        {
            id: 'found-items',
            label: 'Found Items', icon: 'fa-box-open',
            path: '/admin/found_items/',
            children: [
                { label: 'Found Items', url: '/admin/found_items/founditem/', icon: 'fa-box-open' },
            ]
        },
    ];

    const ALL_NAV_ITEMS = NAV_MODULES.flatMap(m =>
        m.children.map(c => ({ ...c, module: m.label }))
    );

    /* ═══════════════════════════════════════════════════════════════
       THEME MANAGEMENT
       ═══════════════════════════════════════════════════════════════ */
    function applyTheme(name) {
        document.body.classList.remove(...THEMES.map(t => `theme-${t}`));
        document.body.classList.add(`theme-${name}`);
        activeTheme = name;
        localStorage.setItem(STORAGE_THEME, name);

        // Update theme switcher buttons if present
        document.querySelectorAll('.ac-theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === name);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       ACTIVE MODULE DETECTION
       ═══════════════════════════════════════════════════════════════ */
    function getActiveModule() {
        const path = window.location.pathname;
        let match = NAV_MODULES.find(m => m.exact && path === m.path);
        if (!match) {
            match = NAV_MODULES
                .filter(m => !m.exact && path.startsWith(m.path))
                .sort((a, b) => b.path.length - a.path.length)[0];
        }
        return match || NAV_MODULES[0];
    }

    /* ═══════════════════════════════════════════════════════════════
       BUILDER: TOPBAR
       ═══════════════════════════════════════════════════════════════ */
    function buildTopbar() {
        const existing = document.getElementById('ac-topbar');
        if (existing) existing.remove();

        const bar = document.createElement('div');
        bar.id = 'ac-topbar';
        bar.innerHTML = `
            <button class="ac-icon-btn" id="ac-menu-toggle" title="Toggle sidebar" style="display:none;">
                <i class="fas fa-bars"></i>
            </button>
            <a href="/admin/" class="ac-brand">
                <span class="ac-logo-mark"><i class="fas fa-graduation-cap"></i></span>
                Academe
            </a>
            <div class="ac-search-wrap">
                <i class="fas fa-search ac-search-icon"></i>
                <input type="text" class="ac-search" id="ac-search-input"
                       placeholder="Search or jump to…" autocomplete="off">
                <span class="ac-search-shortcut">⌘K</span>
            </div>
            <div class="ac-topbar-actions">
                <a href="/admin/notifications/notification/" class="ac-icon-btn" title="Notifications">
                    <i class="fas fa-bell"></i>
                    <span class="ac-badge"></span>
                </a>
                <a href="/admin/accounts/user/" class="ac-icon-btn" title="Users">
                    <i class="fas fa-users"></i>
                </a>
                <div class="ac-avatar" title="Admin profile">A</div>
            </div>
        `;
        document.body.prepend(bar);

        // Mobile hamburger
        const toggle = document.getElementById('ac-menu-toggle');
        if (window.innerWidth <= 768) toggle.style.display = 'flex';
        toggle.addEventListener('click', () => {
            const sb = document.getElementById('ac-sidebar');
            if (sb) sb.classList.toggle('open');
        });

        // Focus search → open command palette
        const searchInput = document.getElementById('ac-search-input');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                searchInput.blur();
                openCommandPalette();
            });
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       BUILDER: SIDEBAR
       ═══════════════════════════════════════════════════════════════ */
    function buildSidebar() {
        const existing = document.getElementById('ac-sidebar');
        if (existing) existing.remove();

        const activeModule = getActiveModule();
        const currentPath = window.location.pathname;

        const sb = document.createElement('div');
        sb.id = 'ac-sidebar';

        let html = '';

        // Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        html += `
            <div style="padding: 0 16px 16px;">
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:2px;">${greeting}</div>
                <div style="font-size:13px; font-weight:600; color:var(--text-secondary);">Administrator</div>
            </div>
            <div class="ac-nav-divider"></div>
        `;

        // Navigation modules
        html += `<div class="ac-nav-section">Navigation</div>`;
        NAV_MODULES.forEach(module => {
            const isActiveModule = module === activeModule;
            html += `
                <a href="${module.children[0].url}" class="ac-nav-item ${isActiveModule ? 'active' : ''}">
                    <span class="ac-nav-icon"><i class="fas ${module.icon}"></i></span>
                    ${module.label}
                </a>
            `;
        });

        // Sub-links for active module
        if (activeModule && activeModule.children.length > 1) {
            html += `
                <div class="ac-nav-divider"></div>
                <div class="ac-nav-section">${activeModule.label}</div>
            `;
            activeModule.children.forEach(child => {
                const isActiveLink = currentPath === child.url || (currentPath.startsWith(child.url) && child.url !== '/admin/');
                html += `
                    <a href="${child.url}" class="ac-nav-item ${isActiveLink ? 'active' : ''}" style="padding-left:20px;">
                        <span class="ac-nav-icon"><i class="fas ${child.icon}"></i></span>
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${child.label}</span>
                        ${child.badge ? `<span class="ac-nav-badge">${child.badge}</span>` : ''}
                    </a>
                `;
            });
        }

        // Footer
        html += `
            <div class="ac-sidebar-footer">
                <a href="/admin/password_change/" class="ac-nav-item">
                    <span class="ac-nav-icon"><i class="fas fa-key"></i></span> Change Password
                </a>
                <a href="/admin/logout/" class="ac-nav-item" style="color:var(--red-text);">
                    <span class="ac-nav-icon" style="background:var(--red-subtle); color:var(--red-text);">
                        <i class="fas fa-sign-out-alt"></i>
                    </span>
                    Sign Out
                </a>
            </div>
        `;

        sb.innerHTML = html;
        document.body.appendChild(sb);

        // Click outside on mobile → close sidebar
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sb.contains(e.target) && e.target.id !== 'ac-menu-toggle') {
                    sb.classList.remove('open');
                }
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       BUILDER: THEME SWITCHER
       ═══════════════════════════════════════════════════════════════ */
    function buildThemeSwitcher() {
        const existing = document.getElementById('ac-theme-switcher');
        if (existing) existing.remove();

        const sw = document.createElement('div');
        sw.id = 'ac-theme-switcher';
        sw.innerHTML = `
            <button class="ac-theme-btn ${activeTheme === 'dark' ? 'active' : ''}" data-theme="dark" title="Dark">🌙</button>
            <button class="ac-theme-btn ${activeTheme === 'light' ? 'active' : ''}" data-theme="light" title="Light">☀️</button>
        `;
        document.body.appendChild(sw);

        sw.addEventListener('click', e => {
            const btn = e.target.closest('.ac-theme-btn');
            if (btn) applyTheme(btn.dataset.theme);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       COMMAND PALETTE
       ═══════════════════════════════════════════════════════════════ */
    function openCommandPalette() {
        if (paletteOpen) return;
        paletteOpen = true;

        // Remove existing
        const existing = document.getElementById('ac-command-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ac-command-overlay';
        overlay.innerHTML = `
            <div id="ac-command-dialog" role="dialog" aria-label="Command palette">
                <input id="ac-command-input" type="text" placeholder="Search pages, models, actions…" autocomplete="off">
                <div id="ac-command-results"></div>
                <div class="ac-command-hint">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Open</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('ac-command-input');
        const results = document.getElementById('ac-command-results');

        function renderResults(query) {
            filteredItems = query
                ? ALL_NAV_ITEMS.filter(item =>
                    item.label.toLowerCase().includes(query.toLowerCase()) ||
                    item.module.toLowerCase().includes(query.toLowerCase())
                )
                : ALL_NAV_ITEMS.slice(0, 10);

            focusedIdx = 0;
            results.innerHTML = filteredItems.length
                ? filteredItems.map((item, i) => `
                    <div class="ac-command-item ${i === 0 ? 'focused' : ''}" data-idx="${i}" data-url="${item.url}">
                        <i class="fas ${item.icon}"></i>
                        <span>${item.label}</span>
                        <span style="margin-left:auto; font-size:11px; color:var(--text-muted);">${item.module}</span>
                    </div>
                `).join('')
                : `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">No results found</div>`;

            // Click handlers
            results.querySelectorAll('.ac-command-item').forEach(el => {
                el.addEventListener('mouseenter', () => {
                    focusedIdx = +el.dataset.idx;
                    highlightItem();
                });
                el.addEventListener('click', () => {
                    window.location.href = el.dataset.url;
                });
            });
        }

        function highlightItem() {
            results.querySelectorAll('.ac-command-item').forEach((el, i) => {
                el.classList.toggle('focused', i === focusedIdx);
            });
        }

        input.addEventListener('input', () => renderResults(input.value));

        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusedIdx = Math.min(focusedIdx + 1, filteredItems.length - 1);
                highlightItem();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusedIdx = Math.max(focusedIdx - 1, 0);
                highlightItem();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filteredItems[focusedIdx];
                if (item) window.location.href = item.url;
            } else if (e.key === 'Escape') {
                closeCommandPalette();
            }
        });

        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeCommandPalette();
        });

        renderResults('');
        requestAnimationFrame(() => input.focus());
    }

    function closeCommandPalette() {
        const overlay = document.getElementById('ac-command-overlay');
        if (overlay) overlay.remove();
        paletteOpen = false;
    }

    /* ═══════════════════════════════════════════════════════════════
       UTILITY: ANIMATE NUMBER
       ═══════════════════════════════════════════════════════════════ */
    function animateNumber(el, target, duration = 800) {
        const start = performance.now();
        const startVal = 0;
        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            el.textContent = Math.round(startVal + (target - startVal) * ease).toLocaleString();
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /* ═══════════════════════════════════════════════════════════════
       ENHANCER: DASHBOARD
       ═══════════════════════════════════════════════════════════════ */
    function enhanceDashboard() {
        // Guard clause
        const contentHeader = document.querySelector('.content-header');
        if (!contentHeader) return;

        // Inject stat cards if not already present
        if (!document.getElementById('ac-stat-cards')) {
            const statsEl = document.createElement('div');
            statsEl.id = 'ac-stat-cards';
            statsEl.className = 'ac-stats-grid';
            statsEl.innerHTML = `
                <div class="ac-stat-card purple">
                    <div class="ac-stat-icon"><i class="fas fa-users"></i></div>
                    <div class="ac-stat-trend up"><i class="fas fa-arrow-up"></i> 12%</div>
                    <div class="ac-stat-value" data-target="245">0</div>
                    <div class="ac-stat-label">Total Students</div>
                </div>
                <div class="ac-stat-card green">
                    <div class="ac-stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="ac-stat-trend up"><i class="fas fa-arrow-up"></i> 8%</div>
                    <div class="ac-stat-value" data-target="198">0</div>
                    <div class="ac-stat-label">Active Users</div>
                </div>
                <div class="ac-stat-card yellow">
                    <div class="ac-stat-icon"><i class="fas fa-ticket-alt"></i></div>
                    <div class="ac-stat-trend down"><i class="fas fa-arrow-down"></i> 3%</div>
                    <div class="ac-stat-value" data-target="12">0</div>
                    <div class="ac-stat-label">Open Tickets</div>
                </div>
                <div class="ac-stat-card red">
                    <div class="ac-stat-icon"><i class="fas fa-history"></i></div>
                    <div class="ac-stat-trend up"><i class="fas fa-arrow-up"></i> 24%</div>
                    <div class="ac-stat-value" data-target="2486">0</div>
                    <div class="ac-stat-label">Audit Logs</div>
                </div>
            `;

            const contentArea = document.querySelector('.content');
            if (contentArea) {
                contentArea.prepend(statsEl);
                statsEl.querySelectorAll('.ac-stat-value[data-target]').forEach(el => {
                    animateNumber(el, parseInt(el.dataset.target));
                });
            }
        }

        enhanceModelTiles();
        enhanceRecentActions();
    }

    /* ═══════════════════════════════════════════════════════════════
       ENHANCER: MODEL TILES
       ═══════════════════════════════════════════════════════════════ */
    function enhanceModelTiles() {
        const modelWidget = document.querySelector('.jazzmin-model-list, .model-list-widget');
        if (!modelWidget || modelWidget.dataset.enhanced) return;

        const links = modelWidget.querySelectorAll('a');
        if (!links.length) return;

        const META = {
            'User': { desc: 'Students, staff & admins', icon: 'fa-users', stats: { total: 245, active: 198 } },
            'FoundItem': { desc: 'Campus lost & found items', icon: 'fa-box-open', stats: { total: 34, active: 12 } },
            'Announcement': { desc: 'Campus announcements', icon: 'fa-bullhorn', stats: { total: 56, active: 8 } },
            'Opportunity': { desc: 'Jobs & internships', icon: 'fa-briefcase', stats: { total: 23, active: 5 } },
            'ClassGroup': { desc: 'Class groups & timetable', icon: 'fa-layer-group', stats: { total: 12, active: 10 } },
            'SupportTicket': { desc: 'Student support tickets', icon: 'fa-ticket-alt', stats: { total: 18, active: 3 } },
        };

        const grid = document.createElement('div');
        grid.className = 'ac-modules-grid';

        links.forEach(link => {
            const name = link.textContent.trim();
            const href = link.getAttribute('href') || '#';
            const meta = META[name] || { desc: 'Manage records', icon: 'fa-cube', stats: { total: 0, active: 0 } };

            const card = document.createElement('div');
            card.className = 'ac-module-card';
            card.innerHTML = `
                <div class="ac-module-card-header">
                    <div class="ac-module-icon"><i class="fas ${meta.icon}"></i></div>
                    <div class="ac-module-meta">
                        <div class="ac-module-name">${name}</div>
                        <div class="ac-module-desc">${meta.desc}</div>
                    </div>
                </div>
                <div class="ac-module-stats">
                    <div class="ac-module-stat-item">
                        <span class="ac-module-stat-value">${meta.stats.total.toLocaleString()}</span>
                        <span style="color:var(--text-muted);">total</span>
                    </div>
                    <div class="ac-module-stat-item">
                        <span class="ac-module-stat-value" style="color:var(--green-text);">${meta.stats.active}</span>
                        <span style="color:var(--text-muted);">active</span>
                    </div>
                </div>
                <div class="ac-module-actions">
                    <a href="${href}" class="btn btn-primary btn-sm">View all</a>
                    <a href="${href}add/" class="btn btn-secondary btn-sm">
                        <i class="fas fa-plus"></i> Add
                    </a>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('a')) window.location.href = href;
            });
            grid.appendChild(card);
        });

        modelWidget.dataset.enhanced = '1';
        modelWidget.innerHTML = '';
        modelWidget.appendChild(grid);
    }

    /* ═══════════════════════════════════════════════════════════════
       ENHANCER: RECENT ACTIONS
       ═══════════════════════════════════════════════════════════════ */
    function enhanceRecentActions() {
        const widget = document.querySelector('.jazzmin-recent-actions, .recent-actions-widget, ul#recent-actions-list');
        if (!widget || widget.dataset.enhanced) return;

        const items = widget.querySelectorAll('li, .admin-action');
        if (!items.length) return;

        const feed = document.createElement('div');
        feed.id = 'ac-activity-feed';

        const colors = ['var(--accent)', 'var(--green-text)', 'var(--yellow-text)', 'var(--blue-text)'];
        const timeLabels = ['Just now', '2m ago', '5m ago', '10m ago', '18m ago', '31m ago', '1h ago', '2h ago'];

        items.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'ac-activity-item';
            div.innerHTML = `
                <div class="ac-activity-dot" style="background:${colors[i % colors.length]};"></div>
                <div class="ac-activity-text">${item.innerHTML}</div>
                <div class="ac-activity-time">${timeLabels[i] || '—'}</div>
            `;
            feed.appendChild(div);
        });

        widget.dataset.enhanced = '1';
        widget.innerHTML = '';
        widget.appendChild(feed);
    }

    /* ═══════════════════════════════════════════════════════════════
       ENHANCER: TABLES
       ═══════════════════════════════════════════════════════════════ */
    function enhanceTables() {
        // Guard clause
        if (!document.querySelector('.object-tools, table')) return;

        document.querySelectorAll('.object-tools').forEach(tools => {
            tools.querySelectorAll('a').forEach(a => {
                a.classList.add('btn', 'btn-primary', 'btn-sm');
                a.style.marginLeft = '6px';
            });
        });

        document.querySelectorAll('[name="_save"], [name="_continue"], [name="_addanother"]').forEach(btn => {
            btn.classList.add('btn', 'btn-primary');
        });
        document.querySelectorAll('[name="_delete"]').forEach(btn => {
            btn.classList.add('btn', 'btn-danger');
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       ENHANCER: GOVERNANCE PAGE
       ═══════════════════════════════════════════════════════════════ */
    function enhanceGovernancePage() {
        const path = window.location.pathname;
        if (!path.startsWith('/admin/governance/')) return;
        if (document.getElementById('ac-gov-header')) return;

        const resultList = document.querySelector('#result_list, .ac-modules-grid');
        if (!resultList) return;

        const header = document.createElement('div');
        header.id = 'ac-gov-header';
        header.innerHTML = `
            <div class="ac-stats-grid" style="margin-bottom:20px;">
                <div class="ac-stat-card purple">
                    <div class="ac-stat-icon"><i class="fas fa-history"></i></div>
                    <div class="ac-stat-trend up"><i class="fas fa-arrow-up"></i> 18%</div>
                    <div class="ac-stat-value" data-target="2486">0</div>
                    <div class="ac-stat-label">Audit Logs</div>
                </div>
                <div class="ac-stat-card green">
                    <div class="ac-stat-icon"><i class="fas fa-archive"></i></div>
                    <div class="ac-stat-value" data-target="184">0</div>
                    <div class="ac-stat-label">Active Users</div>
                </div>
                <div class="ac-stat-card yellow">
                    <div class="ac-stat-icon"><i class="fas fa-chart-bar"></i></div>
                    <div class="ac-stat-value" data-target="32">0</div>
                    <div class="ac-stat-label">Roles Defined</div>
                </div>
                <div class="ac-stat-card red">
                    <div class="ac-stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="ac-stat-value" data-target="12">0</div>
                    <div class="ac-stat-label">Pending Cases</div>
                </div>
            </div>
        `;

        resultList.parentNode.insertBefore(header, resultList);
        header.querySelectorAll('.ac-stat-value[data-target]').forEach(el => {
            animateNumber(el, parseInt(el.dataset.target));
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       MUTATION OBSERVER – HANDLES AJAX-LOADED CONTENT
       ═══════════════════════════════════════════════════════════════ */
    function startObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(() => {
            enhanceDashboard();
            enhanceTables();
            enhanceRecentActions();
            enhanceGovernancePage();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       KEYBOARD SHORTCUTS
       ═══════════════════════════════════════════════════════════════ */
    document.addEventListener('keydown', e => {
        // Ctrl+K / Cmd+K → toggle command palette
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            paletteOpen ? closeCommandPalette() : openCommandPalette();
        }
        // Escape → close palette
        if (e.key === 'Escape' && paletteOpen) {
            closeCommandPalette();
        }
    });

    /* ═══════════════════════════════════════════════════════════════
       INITIALIZATION
       ═══════════════════════════════════════════════════════════════ */
    function init() {
        applyTheme(activeTheme);
        buildTopbar();
        buildSidebar();
        buildThemeSwitcher();
        startObserver();
    }

    // Run immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();