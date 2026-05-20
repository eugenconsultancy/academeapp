import { Link } from 'react-router-dom';
import { FiZap, FiArrowLeft, FiHome } from 'react-icons/fi';

export default function ItemNotFound({ title = 'Item', backTo = '/', backLabel = 'Go Back' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeIn">
      <style>{`
        .inf-container {
          max-width: 400px;
          animation: infFadeIn 0.5s ease both;
        }
        @keyframes infFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .inf-icon {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.25);
        }
        .inf-title {
          font-size: 1.25rem; font-weight: 700;
          color: #1f2937; margin-bottom: 8px;
        }
        .dark .inf-title { color: #f9fafb; }
        .inf-text {
          font-size: 0.9rem; color: #6b7280; margin-bottom: 24px; line-height: 1.5;
        }
        .dark .inf-text { color: #9ca3af; }
      `}</style>
      
      <div className="inf-container">
        <div className="inf-icon">
          <FiZap size={30} className="text-white" />
        </div>
        <h2 className="inf-title">{title} Not Found</h2>
        <p className="inf-text">
          The {title.toLowerCase()} you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to={backTo} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm">
            <FiArrowLeft size={14} /> {backLabel}
          </Link>
          <Link to="/" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all text-sm shadow-md">
            <FiHome size={14} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
