import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { 
  FiZap, FiTarget, FiShield, FiUsers, FiHeart, FiAward,
  FiPackage, FiBell, FiBriefcase, FiBook, FiLock, FiDollarSign,
  FiArrowRight, FiGithub, FiTwitter, FiMail
} from 'react-icons/fi';

const features = [
  { 
    icon: FiPackage, 
    title: 'Found Items', 
    desc: 'Secure lost & found with escrow payments that protect both finders and owners.',
    color: '#3b82f6', 
    bg: 'rgba(59,130,246,0.1)',
    emoji: '📦'
  },
  { 
    icon: FiBell, 
    title: 'Announcements', 
    desc: 'Stay updated with class and campus news from your student leaders.',
    color: '#f59e0b', 
    bg: 'rgba(245,158,11,0.1)',
    emoji: '📢'
  },
  { 
    icon: FiBriefcase, 
    title: 'Opportunities', 
    desc: 'Discover internships, scholarships, attachments, and campus events.',
    color: '#10b981', 
    bg: 'rgba(16,185,129,0.1)',
    emoji: '💼'
  },
  { 
    icon: FiBook, 
    title: 'Attendance', 
    desc: 'Offline-enabled attendance tracking so you never miss a class.',
    color: '#8b5cf6', 
    bg: 'rgba(139,92,246,0.1)',
    emoji: '📚'
  },
  { 
    icon: FiLock, 
    title: 'Privacy First', 
    desc: 'Your data is protected. Admission numbers and phone numbers are never exposed.',
    color: '#ec4899', 
    bg: 'rgba(236,72,153,0.1)',
    emoji: '🔒'
  },
  { 
    icon: FiDollarSign, 
    title: 'Fair Monetization', 
    desc: 'Transparent escrow system for ID recovery with no personal enrichment.',
    color: '#06b6d4', 
    bg: 'rgba(6,182,212,0.1)',
    emoji: '💰'
  },
];

const stats = [
  { value: '5,000+', label: 'Students', icon: FiUsers, color: '#6366f1' },
  { value: '1,200+', label: 'Items Recovered', icon: FiPackage, color: '#10b981' },
  { value: '500+', label: 'Announcements', icon: FiBell, color: '#f59e0b' },
  { value: '98%', label: 'Satisfaction', icon: FiHeart, color: '#ec4899' },
];

const values = [
  { icon: FiTarget, title: 'Student-First', desc: 'Built exclusively for students, by students. No staff accounts, no external interference.' },
  { icon: FiShield, title: 'Privacy by Design', desc: 'Your personal information is protected at every level of the platform.' },
  { icon: FiAward, title: 'Fair & Transparent', desc: 'Our escrow system ensures no student admin can be accused of personal enrichment.' },
];

export default function AboutPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');

        .about-root {
          font-family: 'Sora', sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          animation: aboutFadeIn .6s ease both;
        }
        @keyframes aboutFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Hero */
        .about-hero {
          text-align: center;
          margin-bottom: 48px;
          position: relative;
        }
        .about-hero-icon {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 12px 40px rgba(99,102,241,0.35);
          animation: aboutFloat 3s ease-in-out infinite;
        }
        @keyframes aboutFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .about-hero h1 {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 800;
          background: linear-gradient(135deg, #1f2937 0%, #6366f1 50%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }
        .dark .about-hero h1 {
          background: linear-gradient(135deg, #f9fafb 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .about-hero p {
          font-size: 1.05rem; color: #6b7280; max-width: 600px; margin: 0 auto;
          line-height: 1.7;
        }
        .dark .about-hero p { color: #9ca3af; }

        /* Stats */
        .about-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 48px;
        }
        @media (max-width: 700px) { .about-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 400px) { .about-stats { grid-template-columns: 1fr; } }

        .about-stat-card {
          text-align: center;
          padding: 24px 16px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          transition: all .25s;
          text-decoration: none;
        }
        .dark .about-stat-card {
          background: rgba(17,17,34,0.7);
          border-color: rgba(255,255,255,0.06);
        }
        .about-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
        }
        .about-stat-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        .about-stat-value {
          font-size: 1.8rem; font-weight: 800; color: #1f2937;
          line-height: 1; margin-bottom: 4px;
        }
        .dark .about-stat-value { color: #f9fafb; }
        .about-stat-label {
          font-size: 0.82rem; color: #6b7280; font-weight: 500;
        }

        /* Section title */
        .about-section-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          color: #9ca3af; margin-bottom: 16px;
          text-align: center;
        }
        .about-section-heading {
          font-size: 1.5rem; font-weight: 700; color: #1f2937;
          text-align: center; margin-bottom: 8px;
        }
        .dark .about-section-heading { color: #f9fafb; }
        .about-section-sub {
          font-size: 0.9rem; color: #6b7280; text-align: center; margin-bottom: 32px;
        }

        /* Features grid */
        .about-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 48px;
        }
        @media (max-width: 900px) { .about-features { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .about-features { grid-template-columns: 1fr; } }

        .about-feature-card {
          padding: 24px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          transition: all .25s;
          position: relative;
          overflow: hidden;
        }
        .dark .about-feature-card {
          background: rgba(17,17,34,0.6);
          border-color: rgba(255,255,255,0.06);
        }
        .about-feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
        }
        .about-feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--feature-color);
          border-radius: 0 0 4px 4px;
        }
        .about-feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
          font-size: 1.3rem;
        }
        .about-feature-card h3 {
          font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 6px;
        }
        .dark .about-feature-card h3 { color: #f3f4f6; }
        .about-feature-card p {
          font-size: 0.85rem; color: #6b7280; line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
        }

        /* Values */
        .about-values {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 48px;
        }
        @media (max-width: 700px) { .about-values { grid-template-columns: 1fr; } }

        .about-value-card {
          text-align: center;
          padding: 32px 20px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 24px;
          transition: all .25s;
        }
        .dark .about-value-card {
          background: rgba(17,17,34,0.6);
          border-color: rgba(255,255,255,0.06);
        }
        .about-value-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.1);
        }
        .about-value-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; font-size: 1.4rem;
        }
        .about-value-card h3 {
          font-size: 1.1rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;
        }
        .dark .about-value-card h3 { color: #f3f4f6; }
        .about-value-card p {
          font-size: 0.85rem; color: #6b7280; line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
        }

        /* CTA */
        .about-cta {
          text-align: center;
          padding: 40px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 24px;
          color: white;
          margin-bottom: 48px;
        }
        .about-cta h2 {
          font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;
        }
        .about-cta p {
          font-size: 0.95rem; opacity: 0.85; margin-bottom: 20px;
        }
        .about-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px;
          background: white; color: #6366f1;
          border-radius: 14px; font-weight: 600;
          text-decoration: none; transition: all .2s;
          font-size: 0.95rem;
        }
        .about-cta-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }

        /* Footer */
        .about-footer {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .dark .about-footer { border-color: rgba(255,255,255,0.06); }
      `}</style>

      <div className="about-root">
        {/* Hero */}
        <div className="about-hero">
          <div className="about-hero-icon">
            <FiZap size={32} className="text-white" />
          </div>
          <h1>About Academe</h1>
          <p>
            A student-only ecosystem designed to enhance campus life through seamless communication, 
            efficient lost & found management, and reliable attendance tracking.
          </p>
        </div>

        {/* Stats */}
        <div className="about-stats">
          {stats.map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="about-stat-card">
              <div className="about-stat-icon" style={{ background: `${color}18` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div className="about-stat-value">{value}</div>
              <div className="about-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Our Values */}
        <p className="about-section-title">Our Values</p>
        <h2 className="about-section-heading">What We Stand For</h2>
        <p className="about-section-sub">The principles that guide everything we build</p>
        
        <div className="about-values">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="about-value-card">
              <div className="about-value-icon">
                <Icon size={24} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <p className="about-section-title">Features</p>
        <h2 className="about-section-heading">Everything You Need</h2>
        <p className="about-section-sub">Powerful tools designed for student life</p>

        <div className="about-features">
          {features.map(({ icon: Icon, title, desc, color, bg, emoji }) => (
            <div key={title} className="about-feature-card" style={{ '--feature-color': color }}>
              <div className="about-feature-icon" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3>{emoji} {title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="about-cta">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of students already using Academe to enhance their campus experience.</p>
          <Link to="/contact" className="about-cta-btn">
            Contact Us <FiArrowRight size={16} />
          </Link>
        </div>

        {/* Footer */}
        <div className="about-footer">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <FiZap size={12} className="text-indigo-500" />
            Academe v2.0 • Built for Students, by Students
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors"><FiGithub size={16} /></a>
            <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors"><FiTwitter size={16} /></a>
            <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors"><FiMail size={16} /></a>
          </div>
        </div>
      </div>
    </>
  );
}
