Dependency Purposes
Package	Purpose
react + react-dom	Core React framework
react-router-dom	Page routing and navigation
@tanstack/react-query	Server state management, caching, background updates
axios	HTTP client for API calls
idb	IndexedDB wrapper for offline storage
firebase	Push notifications via FCM
react-icons	Icon library (Feather, Font Awesome, etc.)
react-hot-toast	Toast notifications
react-dropzone	Drag-and-drop file uploads
date-fns	Date formatting and manipulation
zustand	Lightweight state management
@capacitor/core	Mobile app wrapper
@capacitor/push-notifications	Native push notifications
tailwindcss	Utility-first CSS framework
vite	Build tool and dev server






C:\Users\GATARA-BJTU\academe\frontend\src\pages\HomePage.jsx;;for the below homepage, the content for the cards is overflowing and the general file lack intuitve and appealing user interface, with mdoern designs, appealing UI, and orgernization, i want you to make it as appealing as possible and resposnive to all devices: import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import { blogApi } from '../api/blogApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import {
    FiArrowRight, FiPackage, FiBell, FiBriefcase,
    FiBook, FiClock, FiMapPin, FiUser, FiZap,
    FiTrendingUp, FiCheckCircle, FiAlertCircle,
    FiBookOpen, FiHeart, FiEye
} from 'react-icons/fi';

function StatCard({ label, value, icon: Icon, color, bg }) {
    return (
        <div className="hp-stat-card" style={{ '--c': color, '--bg': bg }}>
            <div className="hp-stat-icon">
                <Icon size={18} style={{ color }} />
            </div>
            <div>
                <p className="hp-stat-value">{value}</p>
                <p className="hp-stat-label">{label}</p>
            </div>
        </div>
    );
}

function ClassRow({ c }) {
    return (
        <div className="hp-class-row">
            <div className="hp-class-time-col">
                <span className="hp-class-time">{c.start_time}</span>
                <div className="hp-class-time-dot" />
            </div>
            <div className="hp-class-body">
                <p className="hp-class-name" title={c.unit_name}>{c.unit_name}</p>
                <div className="hp-class-meta">
                    <span><FiClock size={10} /> {c.start_time}–{c.end_time}</span>
                    {c.venue && <span><FiMapPin size={10} /> {c.venue}</span>}
                    {c.lecturer && <span><FiUser size={10} /> {c.lecturer}</span>}
                </div>
            </div>
            <div className="hp-class-status">
                {c.is_marked
                    ? <span className="hp-pill hp-pill-green"><FiCheckCircle size={10} /> Done</span>
                    : c.can_mark
                        ? <span className="hp-pill hp-pill-amber">Mark</span>
                        : <span className="hp-pill hp-pill-gray">Soon</span>
                }
            </div>
        </div>
    );
}

function AnnouncementRow({ a }) {
    return (
        <div className="hp-list-row">
            <div className={`hp-list-dot${a.is_urgent ? ' urgent' : ''}`} />
            <div className="hp-list-body">
                {a.is_urgent && (
                    <span className="hp-pill hp-pill-red"><FiAlertCircle size={9} /> Urgent</span>
                )}
                <p className="hp-list-title" title={a.title}>{a.title}</p>
                <p className="hp-list-preview">{a.content?.substring(0, 80)}</p>
            </div>
        </div>
    );
}

function BlogRow({ post }) {
    return (
        <div className="hp-list-row">
            <div className="hp-list-dot" style={{ background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,.5)' }} />
            <div className="hp-list-body">
                <p className="hp-list-title" title={post.title}>{post.title}</p>
                <div className="hp-list-meta">
                    <span><FiClock size={10} /> {post.reading_time}m</span>
                    <span><FiHeart size={10} /> {post.likes_count || 0}</span>
                    <span><FiEye size={10} /> {post.view_count || 0}</span>
                </div>
            </div>
        </div>
    );
}

export default function HomePage() {
    const { user } = useAuth();

    const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
        queryKey: ['recent-announcements'],
        queryFn: async () => { const r = await announcementsApi.list({ limit: 3 }); return Array.isArray(r) ? r : r.data || []; },
    });
    const { data: opportunities, isLoading: loadingOpportunities } = useQuery({
        queryKey: ['recent-opportunities'],
        queryFn: async () => { const r = await opportunitiesApi.list({ limit: 3 }); return Array.isArray(r) ? r : r.data || []; },
    });
    const { data: todayClasses, isLoading: loadingClasses } = useQuery({
        queryKey: ['today-classes'],
        queryFn: async () => { const r = await classesApi.getTodayClasses(); return Array.isArray(r) ? r : r.data || []; },
    });
    const { data: blogPosts, isLoading: loadingBlog } = useQuery({
        queryKey: ['featured-blog'],
        queryFn: async () => { const r = await blogApi.getFeatured(); return Array.isArray(r) ? r : r.data || []; },
    });

    const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const quickLinks = [
        { to: '/found-items', label: 'Found Items', color: '#3b82f6', emoji: '📦' },
        { to: '/blog', label: 'Student Blog', color: '#ec4899', emoji: '📝' },
        { to: '/announcements', label: 'Announcements', color: '#8b5cf6', emoji: '📢' },
        { to: '/opportunities', label: 'Opportunities', color: '#10b981', emoji: '💼' },
        { to: '/classes', label: 'My Classes', color: '#f59e0b', emoji: '📚' },
    ];

    return (
        <>
            <style>{`
                .hp-root { max-width: 1100px; margin: 0 auto; padding: 24px 16px 60px; animation: hpFade .5s ease; }
                @keyframes hpFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

                /* Hero */
                .hp-hero {
                    border-radius: 20px; padding: 32px 28px; margin-bottom: 24px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
                    color: white; position: relative; overflow: hidden;
                }
                .hp-hero h1 { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 800; margin: 4px 0; }
                .hp-hero p { font-size: 0.85rem; opacity: 0.8; }
                .hp-hero-date {
                    position: absolute; top: 20px; right: 20px;
                    background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
                    padding: 6px 14px; border-radius: 99px; font-size: 0.75rem;
                }
                @media (max-width: 500px) { .hp-hero-date { display: none; } }

                /* Stats */
                .hp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 24px; }
                .hp-stat-card {
                    display: flex; align-items: center; gap: 10px; padding: 14px;
                    background: rgba(255,255,255,0.7); backdrop-filter: blur(16px);
                    border: 1px solid rgba(0,0,0,0.05); border-radius: 14px;
                }
                .dark .hp-stat-card { background: rgba(17,17,34,0.7); border-color: rgba(255,255,255,0.05); }
                .hp-stat-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .hp-stat-value { font-size: 1.2rem; font-weight: 700; color: #111; line-height: 1; }
                .dark .hp-stat-value { color: #f9fafb; }
                .hp-stat-label { font-size: 0.65rem; color: #9ca3af; text-transform: uppercase; letter-spacing: .04em; }

                /* Grid */
                .hp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
                @media (max-width: 900px) { .hp-grid-3 { grid-template-columns: 1fr 1fr; } }
                @media (max-width: 600px) { .hp-grid-3 { grid-template-columns: 1fr; } }

                /* Card header */
                .hp-card-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
                .hp-card-ttl { font-size: 0.9rem; font-weight: 700; color: #111; display: flex; align-items: center; gap: 6px; }
                .dark .hp-card-ttl { color: #f9fafb; }
                .hp-card-dot { width: 7px; height: 7px; border-radius: 50%; }
                .hp-card-link { font-size: 0.7rem; font-weight: 600; color: #6366f1; text-decoration: none; padding: 3px 8px; border-radius: 6px; background: rgba(99,102,241,0.07); display: flex; align-items: center; gap: 3px; }

                /* List rows */
                .hp-list-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; text-decoration: none; color: inherit; }
                .hp-list-row + .hp-list-row { border-top: 1px solid rgba(0,0,0,0.04); }
                .dark .hp-list-row + .hp-list-row { border-color: rgba(255,255,255,0.03); }
                .hp-list-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; flex-shrink: 0; margin-top: 6px; }
                .hp-list-dot.urgent { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,.5); }
                .hp-list-body { flex: 1; min-width: 0; }
                .hp-list-title { font-size: 0.8rem; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
                .dark .hp-list-title { color: #f3f4f6; }
                .hp-list-preview { font-size: 0.7rem; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .hp-list-meta { display: flex; gap: 8px; font-size: 0.68rem; color: #9ca3af; margin-top: 2px; }
                .hp-list-meta span { display: flex; align-items: center; gap: 2px; }

                /* Class row */
                .hp-class-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
                .hp-class-row + .hp-class-row { border-top: 1px solid rgba(0,0,0,0.04); }
                .dark .hp-class-row + .hp-class-row { border-color: rgba(255,255,255,0.03); }
                .hp-class-time { font-size: 0.65rem; font-weight: 700; color: #6366f1; width: 36px; text-align: center; }
                .hp-class-body { flex: 1; min-width: 0; }
                .hp-class-name { font-size: 0.8rem; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .dark .hp-class-name { color: #f3f4f6; }
                .hp-class-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.65rem; color: #9ca3af; margin-top: 1px; }
                .hp-class-meta span { display: flex; align-items: center; gap: 2px; }

                /* Pills */
                .hp-pill { display: inline-flex; align-items: center; gap: 3px; font-size: 0.62rem; font-weight: 600; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
                .hp-pill-green { background: rgba(16,185,129,0.12); color: #059669; }
                .hp-pill-amber { background: rgba(245,158,11,0.12); color: #d97706; }
                .hp-pill-gray { background: rgba(107,114,128,0.08); color: #6b7280; }
                .hp-pill-red { background: rgba(239,68,68,0.1); color: #dc2626; }

                /* Empty state */
                .hp-empty { padding: 24px; text-align: center; color: #9ca3af; font-size: 0.8rem; }
                .hp-empty span { font-size: 1.5rem; display: block; margin-bottom: 6px; }

                /* Quick links */
                .hp-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
                @media (max-width: 900px) { .hp-quick { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 500px) { .hp-quick { grid-template-columns: repeat(2, 1fr); } }
                .hp-quick-card {
                    border-radius: 16px; padding: 18px 14px; text-decoration: none;
                    transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column;
                }
                .hp-quick-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
                .hp-quick-emoji { font-size: 1.5rem; margin-bottom: 8px; }
                .hp-quick-label { font-size: 0.73rem; font-weight: 700; color: #fff; }

                .hp-sec-label { font-size: 0.68rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #9ca3af; margin-bottom: 12px; }
            `}</style>

            <div className="hp-root">
                {/* Hero */}
                <div className="hp-hero">
                    <p><FiZap size={12} className="inline" /> {greeting},</p>
                    <h1>{firstName}!</h1>
                    <p>{user?.class_name}{user?.institution ? ` · ${user.institution}` : ''}</p>
                    <div className="hp-hero-date">
                        <FiTrendingUp size={11} className="inline mr-1" />
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>

                {/* Stats */}
                <div className="hp-stats">
                    <StatCard label="Classes" value={todayClasses?.length ?? '–'} icon={FiBook} color="#6366f1" bg="rgba(99,102,241,0.12)" />
                    <StatCard label="Blog" value={blogPosts?.length ?? '–'} icon={FiBookOpen} color="#ec4899" bg="rgba(236,72,153,0.12)" />
                    <StatCard label="Notices" value={announcements?.length ?? '–'} icon={FiBell} color="#f59e0b" bg="rgba(245,158,11,0.12)" />
                    <StatCard label="Opps" value={opportunities?.length ?? '–'} icon={FiBriefcase} color="#10b981" bg="rgba(16,185,129,0.12)" />
                    <StatCard label="Marked" value={todayClasses?.filter(c => c.is_marked).length ?? '0'} icon={FiCheckCircle} color="#06b6d4" bg="rgba(6,182,212,0.12)" />
                </div>

                {/* 3 Cards */}
                <div className="hp-grid-3">
                    {/* Classes */}
                    <Card padding="sm">
                        <div className="hp-card-hd">
                            <p className="hp-card-ttl"><span className="hp-card-dot" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} /> Today's Classes</p>
                            <Link to="/classes" className="hp-card-link">All <FiArrowRight size={10} /></Link>
                        </div>
                        {loadingClasses ? <SkeletonLoader type="list" count={3} /> :
                         todayClasses?.length ? todayClasses.slice(0, 3).map(c => <ClassRow key={c.id} c={c} />) :
                         <div className="hp-empty"><span>🎉</span>No classes today!</div>}
                    </Card>

                    {/* Blog */}
                    <Card padding="sm">
                        <div className="hp-card-hd">
                            <p className="hp-card-ttl"><span className="hp-card-dot" style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }} /> Student Blog</p>
                            <Link to="/blog" className="hp-card-link" style={{ color: '#ec4899', background: 'rgba(236,72,153,0.07)' }}>All <FiArrowRight size={10} /></Link>
                        </div>
                        {loadingBlog ? <SkeletonLoader type="list" count={3} /> :
                         blogPosts?.length ? blogPosts.slice(0, 3).map(post => (
                            <Link key={post.id} to={`/blog/${post.slug}`} className="hp-list-row"><BlogRow post={post} /></Link>
                         )) : <div className="hp-empty"><span>📝</span>No blog posts yet</div>}
                    </Card>

                    {/* Announcements */}
                    <Card padding="sm">
                        <div className="hp-card-hd">
                            <p className="hp-card-ttl"><span className="hp-card-dot" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' }} /> Announcements</p>
                            <Link to="/announcements" className="hp-card-link">All <FiArrowRight size={10} /></Link>
                        </div>
                        {loadingAnnouncements ? <SkeletonLoader type="list" count={3} /> :
                         announcements?.length ? announcements.slice(0, 3).map(a => <AnnouncementRow key={a.id} a={a} />) :
                         <div className="hp-empty"><span>📭</span>No announcements</div>}
                    </Card>
                </div>

                {/* Quick Access */}
                <p className="hp-sec-label">Quick Access</p>
                <div className="hp-quick">
                    {quickLinks.map(({ to, label, color, emoji }) => (
                        <Link key={to} to={to} className="hp-quick-card"
                            style={{ background: `linear-gradient(135deg, ${color}ee, ${color}bb)`, boxShadow: `0 4px 16px ${color}33` }}>
                            <span className="hp-quick-emoji">{emoji}</span>
                            <span className="hp-quick-label">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}






also the fonts for the application appear blurred, making the visual appearance of text be non appealing.
s


also the admin user interface has some sections with hover being black masking the content visibiluty completly.

what does running with agentic mean in vs code for the above project?



PROFILE EDIT PAGE is missing LACKS CHECK IF IT SHOULD EXIST
MAIN.JSX ENSURE IT INCLUDES ALL FEATURES
the homepage has some titles that are so thick affectig the descendig letters making them appear dwarfing. 





ONCE DATA IS POPULATED — Test Credentials & Feature Testing Guide
Login Credentials
#	Phone	Role	Name
1	+254700000001	Admin	Dr. Sarah Akinyi
2	+254700000002	Student Leader	Brian Ochieng
3	+254700000003	Faculty Rep	Grace Wambui
4	+254700000004	Class Rep	Kevin Mwangi
5	+254700000007	Student	Alice Wanjiku
6	+254700000008	Student	Bob Otieno
How to Login (OTP-based)
Open http://localhost:5173

Enter phone number (e.g., +254700000001)

Click "Get OTP"

Check the Django terminal (where runserver is running) for the OTP:

text
🔑 OTP for +254700000001: 123456
Enter the OTP on the login screen

Click "Verify & Login"

Feature Testing Guide
TEST AS ADMIN (+254700000001)
Feature	How to Test	Expected Result
Dashboard	Login → View homepage	See bento stats, classes, blog, nearby classes
Admin Panel	Click "Admin Panel" in sidebar	See admin dashboard with items, claims, reports tabs
Role Management	Admin → Roles	See active roles, expiring roles, assign/revoke buttons
Audit Logs	Admin → Audit Logs	See list of governance actions
Create Blog Post	Blog → Create Post	Fill form, publish, see on blog page
Edit/Delete Blog	Open a blog post → Edit/Delete	Edit modal, delete confirmation
Create Announcement	Announcements → Create	Fill form, publish
Manage Reports	Admin → Reports	See reported content, resolve
Governance Dashboard	Click Governance in sidebar	See stats, recent activity, expiring roles
TEST AS CLASS REP (+254700000004)
Feature	How to Test	Expected Result
Manage Timetable	Classes → Manage Timetable	See class timetable, add/edit/delete entries
View Class Attendance	Classes → Attendance tab	See attendance stats for Microbiology class
Post Announcement Request	Announcements → Request	Submit request for leader approval
TEST AS STUDENT (+254700000007)
Feature	How to Test	Expected Result
Today's Classes	Homepage → Today's Classes card	See Microbiology timetable for today
Mark Attendance	Click "Check In" on a class	See "Marked" badge, attendance recorded
Nearby Classes	Click "Nearby" or navigate to /nearby-classes	See classes near GPS location with distance
Campus Map	Click "Map" or navigate to /campus-map	See campus venues, click for directions
Found Items	Navigate to Found Items	See list of found items
Claim Item	Click "This is Mine" on an item	Go through claim flow (verify → evidence → payment)
My Claims	Navigate to Claims	See your claim history
Post Found Item	Found Items → Post Item	Fill form, submit
Send Tip	On any found item, click "I Know Owner"	Send tip message
Opportunities	Navigate to Opportunities	See opportunities, like, filter by category
Announcements	Navigate to Announcements	See announcements, urgent badges
Request Announcement	Announcements → Request	Submit request
Blog	Navigate to Blog	Read posts, like, save, comment
Profile	Navigate to Profile	Edit profile, upload picture, see stats
Sessions	Profile → Active Sessions	See current session, revoke others
Password Reset	Logout → Forgot Password	Enter phone, get OTP, reset password
Quick OTP Lookup (for testing)
The Django console prints OTPs. Look for:

text
🔑 OTP for +254700000001: XXXXXX
If you don't see it, check the response from the API — in development mode, the OTP is returned in the response body:

json
{"otp": "123456", "message": "OTP generated successfully"}




Academe is your all-in-one campus companion. Log in with just your phone number — no passwords to remember. Once inside, your personalized dashboard shows today's classes, recent announcements, campus opportunities, and blog posts from fellow students. Tap "Check In" on any class to mark attendance with GPS verification, proving you were actually there. Lost your ID? Browse the Found Items section, claim what's yours by entering your admission number, and track your claim status — from verification to payment to pickup. Class reps can manage timetables, post announcements, and view attendance records for their class. Student leaders get a governance dashboard to monitor roles and platform activity. Navigate campus with the interactive map, find nearby classes, and get walking directions. Everything is built around your real student life — find lost items, stay updated, mark attendance, and never miss an opportunity.