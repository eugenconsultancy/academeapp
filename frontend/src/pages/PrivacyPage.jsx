import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { 
  FiShield, FiLock, FiEye, FiEyeOff, FiTrash2, FiDownload,
  FiServer, FiClock, FiUserCheck, FiAlertTriangle, FiCheckCircle,
  FiArrowRight, FiZap, FiMail
} from 'react-icons/fi';

const privacyFeatures = [
  {
    icon: FiEyeOff,
    title: 'Hidden Admission Numbers',
    desc: 'Your admission number is never exposed to other students. Only partial masked versions are shown when necessary.',
    color: '#6366f1',
  },
  {
    icon: FiLock,
    title: 'Private Phone Numbers',
    desc: 'Phone numbers are strictly confidential and never shared with other platform users.',
    color: '#8b5cf6',
  },
  {
    icon: FiShield,
    title: 'Automatic Image Blur',
    desc: 'ID card images and sensitive documents are automatically blurred using AI before public display.',
    color: '#ec4899',
  },
  {
    icon: FiDownload,
    title: 'Data Export',
    desc: 'You can download all your data at any time in JSON or CSV format with a single click.',
    color: '#10b981',
  },
  {
    icon: FiTrash2,
    title: 'Account Deletion',
    desc: 'Delete your account anytime. Data is soft-deleted with a 30-day recovery window.',
    color: '#ef4444',
  },
  {
    icon: FiServer,
    title: 'Encrypted Storage',
    desc: 'All sensitive data is encrypted both in transit (HTTPS) and at rest (AES-256 encryption).',
    color: '#06b6d4',
  },
];

const rightsItems = [
  { icon: FiUserCheck, text: 'Right to access your personal data' },
  { icon: FiCheckCircle, text: 'Right to correct inaccurate information' },
  { icon: FiDownload, text: 'Right to export your data in portable format' },
  { icon: FiTrash2, text: 'Right to delete your account and associated data' },
  { icon: FiAlertTriangle, text: 'Right to be notified of any data breaches' },
  { icon: FiMail, text: 'Right to contact us about privacy concerns' },
];

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');

        .privacy-root {
          font-family: 'Sora', sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          animation: privacyFadeIn .6s ease both;
        }
        @keyframes privacyFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Hero */
        .privacy-hero {
          text-align: center;
          margin-bottom: 48px;
        }
        .privacy-hero-icon {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 12px 40px rgba(16,185,129,0.3);
          animation: privacyFloat 3s ease-in-out infinite;
        }
        @keyframes privacyFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .privacy-hero h1 {
          font-size: clamp(2rem, 5vw, 2.5rem);
          font-weight: 800;
          background: linear-gradient(135deg, #1f2937 0%, #10b981 50%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }
        .dark .privacy-hero h1 {
          background: linear-gradient(135deg, #f9fafb 0%, #6ee7b7 50%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .privacy-hero p {
          font-size: 1rem; color: #6b7280; max-width: 600px; margin: 0 auto;
          line-height: 1.7;
        }
        .dark .privacy-hero p { color: #9ca3af; }

        /* Last Updated Badge */
        .privacy-updated {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 99px;
          font-size: 0.8rem; color: #10b981;
          margin-top: 16px; font-weight: 500;
        }
        .dark .privacy-updated {
          background: rgba(16,185,129,0.15);
          border-color: rgba(16,185,129,0.25);
        }

        /* Section title */
        .privacy-section-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          color: #9ca3af; margin-bottom: 16px;
          text-align: center;
        }
        .privacy-section-heading {
          font-size: 1.4rem; font-weight: 700; color: #1f2937;
          text-align: center; margin-bottom: 32px;
        }
        .dark .privacy-section-heading { color: #f9fafb; }

        /* Features Grid */
        .privacy-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 48px;
        }
        @media (max-width: 900px) { .privacy-features { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .privacy-features { grid-template-columns: 1fr; } }

        .privacy-feature-card {
          padding: 24px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          transition: all .25s;
          position: relative;
          overflow: hidden;
        }
        .dark .privacy-feature-card {
          background: rgba(17,17,34,0.6);
          border-color: rgba(255,255,255,0.06);
        }
        .privacy-feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
        }
        .privacy-feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--feature-color);
        }
        .privacy-feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
          color: var(--feature-color);
        }
        .privacy-feature-card h3 {
          font-size: 0.95rem; font-weight: 700; color: #1f2937; margin-bottom: 6px;
        }
        .dark .privacy-feature-card h3 { color: #f3f4f6; }
        .privacy-feature-card p {
          font-size: 0.82rem; color: #6b7280; line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
        }

        /* Info Cards */
        .privacy-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 48px;
        }
        @media (max-width: 700px) { .privacy-info-grid { grid-template-columns: 1fr; } }

        .privacy-info-card {
          padding: 28px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          transition: all .25s;
        }
        .dark .privacy-info-card {
          background: rgba(17,17,34,0.7);
          border-color: rgba(255,255,255,0.06);
        }
        .privacy-info-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .privacy-info-card-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .privacy-info-card h3 {
          font-size: 1.1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;
        }
        .dark .privacy-info-card h3 { color: #f3f4f6; }
        .privacy-info-card p, .privacy-info-card li {
          font-size: 0.88rem; color: #6b7280; line-height: 1.7;
          font-family: 'DM Sans', sans-serif;
        }

        /* Rights List */
        .privacy-rights-list {
          list-style: none; padding: 0;
        }
        .privacy-rights-list li {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .dark .privacy-rights-list li { border-color: rgba(255,255,255,0.05); }
        .privacy-rights-list li:last-child { border: none; }

        /* Retention timeline */
        .privacy-timeline {
          position: relative;
          padding-left: 24px;
        }
        .privacy-timeline::before {
          content: '';
          position: absolute; left: 8px; top: 4px; bottom: 4px;
          width: 2px;
          background: linear-gradient(to bottom, #6366f1, #10b981);
          border-radius: 1px;
        }
        .privacy-timeline-item {
          position: relative;
          padding-bottom: 20px;
        }
        .privacy-timeline-item:last-child { padding-bottom: 0; }
        .privacy-timeline-dot {
          position: absolute; left: -20px; top: 4px;
          width: 10px; height: 10px; border-radius: 50%;
          background: #6366f1;
          border: 2px solid white;
        }
        .dark .privacy-timeline-dot { border-color: #111; }
        .privacy-timeline-item:nth-child(2) .privacy-timeline-dot { background: #8b5cf6; }
        .privacy-timeline-item:nth-child(3) .privacy-timeline-dot { background: #10b981; }
        .privacy-timeline-item h4 {
          font-size: 0.85rem; font-weight: 600; color: #1f2937; margin-bottom: 2px;
        }
        .dark .privacy-timeline-item h4 { color: #f3f4f6; }
        .privacy-timeline-item p {
          font-size: 0.78rem; color: #6b7280; font-family: 'DM Sans', sans-serif;
        }

        /* CTA */
        .privacy-cta {
          text-align: center;
          padding: 36px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          border-radius: 24px;
          color: white;
          margin-top: 48px;
        }
        .privacy-cta h3 {
          font-size: 1.3rem; font-weight: 700; margin-bottom: 8px;
        }
        .privacy-cta p {
          font-size: 0.9rem; opacity: 0.9; margin-bottom: 20px;
        }
        .privacy-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px;
          background: white; color: #10b981;
          border-radius: 14px; font-weight: 600;
          text-decoration: none; transition: all .2s;
          font-size: 0.9rem;
        }
        .privacy-cta-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
      `}</style>

      <div className="privacy-root">
        {/* Hero */}
        <div className="privacy-hero">
          <div className="privacy-hero-icon">
            <FiShield size={32} className="text-white" />
          </div>
          <h1>Privacy Policy</h1>
          <p>
            Your privacy is our priority. We collect minimal data and protect it with industry-standard security.
          </p>
          <div className="privacy-updated">
            <FiClock size={14} />
            Last updated: May 2026
          </div>
        </div>

        {/* Privacy Features Grid */}
        <p className="privacy-section-title">Privacy Features</p>
        <h2 className="privacy-section-heading">How We Protect You</h2>

        <div className="privacy-features">
          {privacyFeatures.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="privacy-feature-card" style={{ '--feature-color': color }}>
              <div className="privacy-feature-icon" style={{ background: `${color}15` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* Data Collection & Rights */}
        <div className="privacy-info-grid">
          {/* Data Collection */}
          <div className="privacy-info-card">
            <div className="privacy-info-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <FiServer size={22} style={{ color: '#6366f1' }} />
            </div>
            <h3>📋 Data We Collect</h3>
            <p>
              We collect only essential information needed to provide our services:
            </p>
            <ul className="privacy-rights-list">
              <li><FiCheckCircle size={14} className="text-green-500" /> Your full name</li>
              <li><FiCheckCircle size={14} className="text-green-500" /> Phone number (for authentication)</li>
              <li><FiCheckCircle size={14} className="text-green-500" /> Admission number (for verification)</li>
              <li><FiCheckCircle size={14} className="text-green-500" /> Class and institution</li>
              <li><FiCheckCircle size={14} className="text-green-500" /> Email (optional)</li>
            </ul>
          </div>

          {/* Your Rights */}
          <div className="privacy-info-card">
            <div className="privacy-info-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <FiUserCheck size={22} style={{ color: '#10b981' }} />
            </div>
            <h3>✅ Your Data Rights</h3>
            <ul className="privacy-rights-list">
              {rightsItems.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={14} className="text-green-500 flex-shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Data Retention */}
        <p className="privacy-section-title">Data Retention</p>
        <h2 className="privacy-section-heading">How Long We Keep Data</h2>

        <div className="privacy-info-grid">
          <div className="privacy-info-card">
            <div className="privacy-info-card-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <FiClock size={22} style={{ color: '#8b5cf6' }} />
            </div>
            <h3>⏱️ Retention Periods</h3>
            <div className="privacy-timeline">
              <div className="privacy-timeline-item">
                <div className="privacy-timeline-dot" />
                <h4>Transaction Logs</h4>
                <p>Retained for 6 months, then automatically deleted</p>
              </div>
              <div className="privacy-timeline-item">
                <div className="privacy-timeline-dot" />
                <h4>Account Data</h4>
                <p>Retained until deletion is requested by the user</p>
              </div>
              <div className="privacy-timeline-item">
                <div className="privacy-timeline-dot" />
                <h4>Expired Content</h4>
                <p>Automatically purged after expiry date</p>
              </div>
            </div>
          </div>

          <div className="privacy-info-card">
            <div className="privacy-info-card-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <FiAlertTriangle size={22} style={{ color: '#ef4444' }} />
            </div>
            <h3>🔒 Security Measures</h3>
            <ul className="privacy-rights-list">
              <li><FiLock size={14} className="text-indigo-500" /> AES-256 encryption at rest</li>
              <li><FiShield size={14} className="text-indigo-500" /> HTTPS encryption in transit</li>
              <li><FiEyeOff size={14} className="text-indigo-500" /> Automatic image blurring</li>
              <li><FiTrash2 size={14} className="text-indigo-500" /> Secure data deletion</li>
              <li><FiServer size={14} className="text-indigo-500" /> Isolated database storage</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="privacy-cta">
          <h3>Have Privacy Concerns?</h3>
          <p>Contact us anytime to exercise your data rights or ask questions about our privacy practices.</p>
          <Link to="/contact" className="privacy-cta-btn">
            Contact Support <FiArrowRight size={16} />
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <FiZap size={12} className="text-green-500" />
            Academe • Privacy-First Student Ecosystem
          </p>
        </div>
      </div>
    </>
  );
}
