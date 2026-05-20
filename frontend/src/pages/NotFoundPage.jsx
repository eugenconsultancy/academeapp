import { Link, useNavigate } from 'react-router-dom';
import { FiZap, FiArrowLeft, FiHome, FiSearch, FiCompass, FiBookOpen, FiPackage } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

        .nf-container {
          font-family: 'Sora', sans-serif;
          text-align: center;
          max-width: 500px;
          animation: nfFadeIn 0.6s ease both;
          position: relative;
          z-index: 10;
        }
        @keyframes nfFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .nf-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
          border-radius: 24px;
          margin-bottom: 24px;
          box-shadow: 0 12px 40px rgba(99,102,241,0.35);
          animation: nfFloat 3s ease-in-out infinite;
        }
        @keyframes nfFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .nf-code {
          font-size: clamp(5rem, 15vw, 8rem);
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }

        .nf-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .dark .nf-title { color: #f9fafb; }

        .nf-description {
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .dark .nf-description { color: #9ca3af; }

        .nf-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.25s;
          cursor: pointer;
          border: none;
          font-family: 'Sora', sans-serif;
        }
        .nf-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }
        .nf-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .nf-btn-secondary {
          background: rgba(255,255,255,0.8);
          color: #374151;
          border: 1.5px solid rgba(0,0,0,0.1);
        }
        .dark .nf-btn-secondary {
          background: rgba(30,30,50,0.8);
          color: #e5e7eb;
          border-color: rgba(255,255,255,0.1);
        }
        .nf-btn-secondary:hover {
          transform: translateY(-2px);
        }

        .nf-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #ec4899);
          border-radius: 99px;
          margin: 20px auto;
        }

        .nf-suggestions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }
        .nf-suggestion {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 500;
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          font-family: 'Sora', sans-serif;
        }
        .nf-suggestion:hover {
          background: rgba(99,102,241,0.18);
          transform: scale(1.05);
        }

        .nf-bg-circle {
          position: fixed;
          border-radius: 50%;
          opacity: 0.03;
          pointer-events: none;
          z-index: 0;
        }
        .nf-bg-circle-1 { width: 400px; height: 400px; background: #6366f1; top: -100px; right: -100px; }
        .nf-bg-circle-2 { width: 300px; height: 300px; background: #ec4899; bottom: -50px; left: -50px; }
        .nf-bg-circle-3 { width: 200px; height: 200px; background: #8b5cf6; top: 50%; left: 50%; transform: translate(-50%, -50%); }
      `}</style>

      <div className="nf-bg-circle nf-bg-circle-1" />
      <div className="nf-bg-circle nf-bg-circle-2" />
      <div className="nf-bg-circle nf-bg-circle-3" />

      <div className="nf-container">
        <div className="nf-logo">
          <FiZap size={36} className="text-white" />
        </div>

        <div className="nf-code">404</div>
        <h1 className="nf-title">Page Not Found</h1>
        <div className="nf-divider" />
        <p className="nf-description">
          Oops! The page you're looking for doesn't exist or has been moved. 
          It might have been claimed by another student or the link might be broken.
        </p>

        <div className="nf-actions">
          <button onClick={() => navigate(-1)} className="nf-btn nf-btn-secondary">
            <FiArrowLeft size={16} /> Go Back
          </button>
          <Link to="/" className="nf-btn nf-btn-primary">
            <FiHome size={16} /> Back to Home
          </Link>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '24px', marginBottom: '8px' }}>
          Try one of these instead:
        </p>
        <div className="nf-suggestions">
          <Link to="/blog" className="nf-suggestion">
            <FiBookOpen size={12} /> Student Blog
          </Link>
          <Link to="/found-items" className="nf-suggestion">
            <FiPackage size={12} /> Found Items
          </Link>
          <Link to="/announcements" className="nf-suggestion">
            <FiZap size={12} /> Announcements
          </Link>
          <Link to="/classes" className="nf-suggestion">
            <FiCompass size={12} /> My Classes
          </Link>
        </div>

        <p style={{ fontSize: '0.7rem', color: '#d1d5db', marginTop: '32px' }}>
          <FiZap size={10} style={{ display: 'inline', marginRight: 4 }} />
          Academe Student Ecosystem
        </p>
      </div>
    </div>
  );
}
