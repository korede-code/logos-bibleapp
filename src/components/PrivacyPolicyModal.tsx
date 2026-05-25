// src/components/PrivacyPolicyModal.tsx
import React from 'react';
import { X, Shield, Lock, Eye, Database, Globe, Mail, CheckCircle } from 'lucide-react';
import { getTheme } from '../utils/themeUtils';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: string;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose, themeMode }) => {
  const theme = getTheme(themeMode as any);

  if (!isOpen) return null;

  const sections = [
    {
      title: 'Information We Collect',
      icon: <Database size={18} />,
      content: 'We collect account information (name, email), user content (notes, highlights, prayers), and anonymous usage data. We DO NOT collect location data, browsing history, or contacts.'
    },
    {
      title: 'How We Use Your Data',
      icon: <Eye size={18} />,
      content: 'To provide Bible reading features, sync across devices, improve app performance, and process Pro subscriptions.'
    },
    {
      title: 'Data Security',
      icon: <Lock size={18} />,
      content: 'All data is encrypted with AES-256-GCM at rest and TLS 1.3 in transit. Your notes and prayers are encrypted on your device before syncing.'
    },
    {
      title: 'Third-Party Services',
      icon: <Globe size={18} />,
      content: 'We use Firebase (authentication), Paystack (payments), and Crashlytics (crash reporting). We do not sell or share your data with marketers.'
    },
    {
      title: 'Your Rights',
      icon: <CheckCircle size={18} />,
      content: 'You can access, export, or delete your data anytime in Settings. Contact privacy@logosdaily.com for requests.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Shield size={20} style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Privacy Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface }}
          >
            <X size={16} style={{ color: theme.textMuted }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Last Updated */}
          <div className="text-center pb-3 border-b" style={{ borderColor: theme.border }}>
            <p className="text-xs" style={{ color: theme.textMuted }}>Effective Date: May 20, 2026</p>
            <p className="text-xs" style={{ color: theme.textFaint }}>Last Updated: May 20, 2026</p>
          </div>

          {/* Our Promise */}
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: theme.surface }}>
            <p className="text-sm font-medium" style={{ color: theme.accent }}>Our Promise</p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Privacy-first. No data selling. No third-party ads. No tracking.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ color: theme.accent }}>{section.icon}</span>
                <h3 className="font-bold text-sm" style={{ color: theme.text }}>{section.title}</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                {section.content}
              </p>
            </div>
          ))}

          {/* Contact */}
          <div className="pt-3 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2 mb-2">
              <Mail size={14} style={{ color: theme.accent }} />
              <h3 className="font-bold text-sm" style={{ color: theme.text }}>Contact Us</h3>
            </div>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              Privacy questions? Email us at <span style={{ color: theme.accent }}>emmakorede21@gmail.com</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;