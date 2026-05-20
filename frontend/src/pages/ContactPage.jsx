import { useState } from 'react';
import { supportApi } from '../api/supportApi';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import { 
  FiMail, FiPhone, FiMapPin, FiClock, FiSend, 
  FiMessageSquare, FiHeadphones, FiUsers, FiCheckCircle,
  FiChevronDown, FiZap
} from 'react-icons/fi';

const faqs = [
  { q: 'How do I report a lost item?', a: 'Go to Found Items page and click "Post Found Item" if you found something, or search for your lost item.' },
  { q: 'How does the escrow payment work?', a: 'For ID/Bank card recovery, a KES 100 fee is held until you confirm receipt of your item.' },
  { q: 'Can I change my class details?', a: 'Yes! Go to your Profile page and click Edit to update your class and personal information.' },
  { q: 'How do I contact my class rep?', a: 'Use the Announcements page to send a request directly to your class representative.' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await supportApi.createTicket(formData);
      toast.success('Ticket submitted successfully!');
      setSubmitted(true);
      setFormData({ title: '', description: '', category: 'technical' });
    } catch (error) {
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl animate-fadeIn">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
            <FiCheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ticket Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've received your request and will get back to you within 24 hours.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSubmitted(false)} className="btn-primary">
              Submit Another
            </button>
            <button onClick={() => window.history.back()} className="btn-secondary">
              Go Back
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');

        .contact-root {
          font-family: 'Sora', sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          animation: contactFadeIn .5s ease both;
        }
        @keyframes contactFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .contact-hero {
          text-align: center;
          margin-bottom: 40px;
        }
        .contact-hero-icon {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.3);
        }
        .contact-hero h1 {
          font-size: 2rem; font-weight: 800;
          background: linear-gradient(135deg, #1f2937, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dark .contact-hero h1 {
          background: linear-gradient(135deg, #f9fafb, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .contact-hero p {
          color: #6b7280; font-size: 0.95rem; margin-top: 8px;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } }

        .contact-info-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 500px) { .contact-info-cards { grid-template-columns: 1fr; } }

        .contact-info-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 16px;
          transition: all .2s;
        }
        .dark .contact-info-card {
          background: rgba(17,17,34,0.7);
          border-color: rgba(255,255,255,0.06);
        }
        .contact-info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .contact-info-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .contact-info-card h4 {
          font-size: 0.85rem; font-weight: 600; color: #1f2937; margin-bottom: 2px;
        }
        .dark .contact-info-card h4 { color: #f3f4f6; }
        .contact-info-card p {
          font-size: 0.78rem; color: #6b7280; font-family: 'DM Sans', sans-serif;
        }

        /* Map */
        .contact-map {
          width: 100%; height: 220px;
          border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }
        .dark .contact-map { border-color: rgba(255,255,255,0.06); }
        .contact-map iframe {
          width: 100%; height: 100%; border: none;
        }

        /* FAQ */
        .contact-faq-item {
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px; overflow: hidden;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(8px);
        }
        .dark .contact-faq-item {
          background: rgba(17,17,34,0.5);
          border-color: rgba(255,255,255,0.06);
        }
        .contact-faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border: none; background: transparent;
          cursor: pointer; font-size: 0.9rem; font-weight: 600;
          color: #1f2937; text-align: left;
          font-family: 'Sora', sans-serif;
        }
        .dark .contact-faq-q { color: #f3f4f6; }
        .contact-faq-a {
          padding: 0 18px 14px;
          font-size: 0.82rem; color: #6b7280;
          font-family: 'DM Sans', sans-serif; line-height: 1.6;
        }
        .contact-faq-chevron {
          transition: transform .25s;
          flex-shrink: 0; color: #9ca3af;
        }
        .contact-faq-chevron.open { transform: rotate(180deg); }

        /* Form */
        .contact-form-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px; padding: 28px;
        }
        .dark .contact-form-card {
          background: rgba(17,17,34,0.7);
          border-color: rgba(255,255,255,0.06);
        }
        .contact-form-card h3 {
          font-size: 1.1rem; font-weight: 700; color: #1f2937;
          margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }
        .dark .contact-form-card h3 { color: #f9fafb; }

        .contact-input {
          width: 100%; padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.6);
          font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all .2s;
          color: #1f2937;
        }
        .dark .contact-input {
          background: rgba(30,30,50,0.6);
          border-color: rgba(255,255,255,0.1);
          color: #f3f4f6;
        }
        .contact-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .contact-submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; border-radius: 14px;
          font-size: 0.95rem; font-weight: 600;
          cursor: pointer; transition: all .25s;
          font-family: 'Sora', sans-serif;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .contact-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .contact-submit-btn:disabled {
          opacity: 0.6; cursor: not-allowed; transform: none;
        }

        /* Section title */
        .contact-section-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase;
          color: #9ca3af; margin-bottom: 12px;
        }
      `}</style>

      <div className="contact-root">
        {/* Hero */}
        <div className="contact-hero">
          <div className="contact-hero-icon">
            <FiHeadphones size={28} className="text-white" />
          </div>
          <h1>Get in Touch</h1>
          <p>We're here to help! Reach out via any channel below.</p>
        </div>

        <div className="contact-grid">
          {/* Left Column */}
          <div>
            {/* Contact Info Cards */}
            <div className="contact-info-cards">
              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <FiMail size={18} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h4>Email Us</h4>
                  <p>support@academe.ac.ke</p>
                </div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <FiPhone size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <h4>Call Us</h4>
                  <p>+254 700 000 000</p>
                </div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <FiMapPin size={18} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h4>Visit Us</h4>
                  <p>Student Affairs Office</p>
                </div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>
                  <FiClock size={18} style={{ color: '#ec4899' }} />
                </div>
                <div>
                  <h4>Office Hours</h4>
                  <p>Mon-Fri, 8AM - 5PM</p>
                </div>
              </div>
            </div>

            {/* Map */}
            <p className="contact-section-title">📍 Our Location</p>
            <div className="contact-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8!2d36.9!3d-1.2!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTInMDAuMCJTIDM2wrA1NCcwMC4wIkU!5e0!3m2!1sen!2ske!4v1620000000000"
                title="Kenyatta University Location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* FAQ */}
            <p className="contact-section-title">❓ Frequently Asked Questions</p>
            {faqs.map((faq, i) => (
              <div key={i} className="contact-faq-item">
                <button className="contact-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <FiChevronDown size={16} className={`contact-faq-chevron${openFaq === i ? ' open' : ''}`} />
                </button>
                {openFaq === i && <p className="contact-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>

          {/* Right Column - Form */}
          <div>
            <div className="contact-form-card">
              <h3>
                <FiMessageSquare size={20} className="text-indigo-500" />
                Send us a Message
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="contact-input"
                  >
                    <option value="technical">🔧 Technical Issue</option>
                    <option value="account">👤 Account Issue</option>
                    <option value="feature">💡 Feature Request</option>
                    <option value="report">🐛 Report Bug</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="contact-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Please provide details about your issue..."
                    rows={5}
                    className="contact-input resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="contact-submit-btn"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiSend size={16} />
                      Submit Ticket
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Social Proof */}
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <FiUsers size={14} />
                <span>Trusted by 5,000+ students</span>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
                <span className="text-xs text-gray-400 ml-1">4.8/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Brand */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <FiZap size={12} className="text-indigo-500" />
            Academe Student Ecosystem
          </p>
        </div>
      </div>
    </>
  );
}
