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


create a terminal command compatible to git bash to create a filein my project root with the content files and their content full complete from below folders: C:\Users\GATARA-BJTU\academe\frontend\src ,C:\Users\GATARA-BJTU\academe\frontend\eslint.config.js.,,C:\Users\GATARA-BJTU\academe\frontend\index.html,,C:\Users\GATARA-BJTU\academe\frontend\package-lock.json,,C:\Users\GATARA-BJTU\academe\frontend\package.json,C:\Users\GATARA-BJTU\academe\frontend\postcss.config.js,,C:\Users\GATARA-BJTU\academe\frontend\tailwind.config.js,,C:\Users\GATARA-BJTU\academe\frontend\vite.config.js. the command should ensure te above folders and their files content are full and complete and pastes them in a file named(project dump frontend and it should be full complete with content)


from the abve i want you to idetify the root cause of the issues where specific pages like blogpage etc are not styled, poorly styled, 

safelist: [
  { pattern: /./ }, // nuclear option for dev
],









to integrate payapal you use bussiness account. also ensure to inclue pypal buy button image/mpesa
use sandbox account and for carss u can use imaginery
can ntegrate face recognition authetication module
PWA FOR MOBILE APP SUPPORT, IT SUPPROTS OFFLINE SUPPORT, ICONS, PUSH NOTIFICTIONS,
APP STORE DISCOVERIBILITY

USE MOBILOUD

OPTON 2 USE WRAPPER: SIMPLER, FUCNTIONAL

USE GOOGLE'S PAGE INSIGHTS TO MEASURE WEBSITE PERFOMANCE

TO CONVERT WEB APP TO MOBILE APPLICATION, I CAN USE ALSO 'MEDIAN' FROM THEIR WEBSITE 
(ASK if you can use a local url for local host in the median website)
test the app in the emulator before downloding the apk file
download the AAB so that i can publish on playstore

 another source for converting is 'app my site'
 to include the app in the playstore create an google play account (one time fee around 25 usdt usually done using debit card or credit card)
 ensure to have EAS EXPO APPLICATION BUILD SERVICES
 CONVERT THE APP INTO AAB FORMAT USING TERMINAL COMMANDS
 CREATE AN ACCOUNT IN EXPO
 RUN COMMANDS FOR EAS FOR DEVELOPMENT MODE
 ONCE DONE IT WILL PROVIDE A LINK TO INSTALL THE APP.

 npm expo start to test locally 
 also for build for production, ill be provided by a link to expo to donwload the app


 before deploy ensure:
 enable code shrinking and code obfuscution (reduced attacks) test this to check for no breaks 
 Set up analytics and crash logging (we have several frameworks like crashanalytics)
 Test your app on various devices (use firebase test lab)
 Read trough the Google Play policy 
Optimize your Google Play Listing Before Deployment :(descriptive title, keywords research etc)

App Intro
01:54 - Brand Intro
02:13 - Installation of packages 
12:07 - Configurations for deployment
30:46 - Building iOS App First
40:08 - Setting up Apple Store Connect (iOS Store)
43:47 - Submission to Apple Store Connect (iOS Store)
48:23 - Building Android App 
51:33 - Installing iOS App on iPhone 
55:11 - Submission to Google Play Console (Android Store)



ISPubKey_live_442dc7f8-5a18-49e2-b533-ce825a6893b9

Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar

missing file content to create: C:\Users\GATARA-BJTU\academe\frontend\src\pages\TwoFactorSetupPage.jsx ,, and C:\Users\GATARA-BJTU\academe\frontend\src\pages\BiometricEnrollmentPage.jsx
  <Route
                  path="/classes/manage"
                  element={
                    <ProtectedRoute allowedRoles={['class_rep']}>
                      <ManageTimetablePage />
                    </ProtectedRoute>
                  }
                />this is in my app.jsx so  check my dirctory for classes to see the name match or mismatch


                also uncomment upon creaton of twofactor page, uncomment the app.jsx for the fucntion path route. 

also the likebutton has like and dislike fucntionality with an inverted thumb, but on the pages only the like appears. also include the label on the like and dislike buttons

come up with data to populate the fucntionalties, starting with classes create students, their classes, classs names, class reps, (should follow the database structure accurately.)
subsequently setting modofication and how to connect to postgresql shoft from sqlite3

what does tripple === mean  in javascript
<!-- what does compression do to files to reduce their size on disk? ieremove spaces, comments or -->

ALSO THE biometric login fucntonaility is not being used check appropriate files


how do people get to take their bimeetric to the system for subsequent use in logining
the below are being used in usegeolocaton.js file in hooks epsite me not having the academics app in the backend:  
 * Backend: apps/geo/views.py - GeoLocation endpoints
 * Backend: apps/academics/views.py - AttendanceViewSet (location check-in) so where does it fetch the data from?

 recehck the academics api where does it fetch data from? since no backend file named academics















 The seed script ran successfully. Your database now contains:

Users: 1 admin, 1 class rep, and 5 students with phone numbers starting +254700000001 to +254700000007

Campus venues: 7 venues around Kenyatta University with real GPS coordinates

Class group: "BSc. Computer Science Y1S1" with all students and the class rep assigned

Timetable: 11 entries covering Monday to Friday

Announcements: 2 announcements (one urgent)

Opportunities: 1 internship opportunity

Blog post: (if your blog app exists) 1 post

You can now test all the features you've been fixing:

Login with any of the phone numbers (if your OTP system is set up for testing)

View and check in to today's classes (with GPS location enabled to match the venue coordinates)

Browse announcements on the homepage

View and like opportunities

Manage timetable as the class rep

If you need to mock OTP verification for testing, let me know – I can help you set up a bypass or seed device tokens.




Here’s how to test your app on a real Android device (or emulator) using Android Studio and Capacitor:

---

### 1. Ensure the backend is reachable

The Django server must accept connections from the device. You already have `ALLOWED_HOSTS = '*'`, so no change needed.

Start the backend bound to all interfaces:

```bash
cd academe/backend
python manage.py runserver 0.0.0.0:8000
```

---

### 2. Configure the frontend to talk to the backend

Your phone must be able to reach your computer. Since they’re on the same Wi‑Fi, use your computer’s IP (`10.5.50.212`).

**Edit `frontend/.env`:**
```
VITE_API_URL=http://10.5.50.212:8000
```

If you later use the Android emulator, switch to `VITE_API_URL=http://10.0.2.2:8000`.

---

### 3. Build the web assets

```bash
cd academe/frontend
npm run build
```

This creates a production‑ready `dist/` folder containing the static files.

---

### 4. Sync the web assets into the native Android project

```bash
npx cap sync android
```

Capacitor copies the contents of `dist/` into the Android app’s assets.

---

### 5. Open the Android project in Android Studio

```bash
npx cap open android
```

Android Studio will launch. If it asks to update the Gradle plugin, accept the recommendation.

---

### 6. Run the app on your phone

- Connect your Android phone to your computer via USB (enable USB debugging in Developer Options).
- In Android Studio, select your device from the device dropdown.
- Click the **Run** button (green triangle) to build and install the APK on your phone.

The app will open and automatically load your web frontend. All API calls will go to `http://10.5.50.212:8000`, so your backend must be running.

---

### 🔁 Switching between real device and emulator

| Target          | API base URL (`VITE_API_URL`)       |
|-----------------|-------------------------------------|
| Real device     | `http://10.5.50.212:8000`          |
| Emulator        | `http://10.0.2.2:8000`             |

After changing `.env`, always rebuild (`npm run build`) and sync (`npx cap sync android`) again.

---

Now you can test all features (location, camera, etc.) directly on your phone as a native Android app.