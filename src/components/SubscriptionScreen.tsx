// src/components/SubscriptionScreen.tsx
import React, { useState } from 'react';
import { ArrowLeft, Crown, Calendar, CreditCard, Receipt, Zap, Shield, Award, FileText, Heart, TrendingUp, Gift } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import ProUpgradeModal from './ProUpgradeModal';

const SubscriptionScreen: React.FC = () => {
  const { readerSettings, navigate, isPro } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [showProModal, setShowProModal] = useState(false);

  if (!isPro) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('settings')} style={{ color: theme.textMuted }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>Subscription</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <Crown size={48} className="mx-auto mb-4" style={{ color: theme.accent }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Go Pro!</h2>
            <p className="text-sm mb-6" style={{ color: theme.textMuted }}>Upgrade to Logos Pro for unlimited access to all features.</p>
            <button
              onClick={() => setShowProModal(true)}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}CC)`, color: 'white' }}
            >
              View Plans
            </button>
          </div>
        </div>
        <ProUpgradeModal
          isOpen={showProModal}
          onClose={() => setShowProModal(false)}
          userEmail="user@example.com"
          userId="demo_user"
          onSuccess={() => {
            useAppStore.getState().setProStatus(true);
          }}
          themeMode={readerSettings.theme}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('settings')} style={{ color: theme.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Subscription</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`, border: `1px solid ${theme.accent}33` }}>
          <div className="absolute top-4 right-4 opacity-10"><Crown size={80} style={{ color: theme.accent }} /></div>
          <div className="flex items-center gap-2 mb-3">
            <Crown size={20} style={{ color: theme.accent }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>Current Plan</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#4CAF5020', color: '#4CAF50' }}>Active</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Logos Pro Monthly</h2>
          <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Next billing on June 15, 2025</p>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={14} style={{ color: theme.textMuted }} />
            <span className="text-xs" style={{ color: theme.textMuted }}>**** 4242 · NGN</span>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}><Zap size={16} style={{ color: theme.accent }} />Pro Benefits</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Award size={14} />, label: 'Unlimited Highlights' },
              { icon: <FileText size={14} />, label: '50+ Reading Plans' },
              { icon: <Heart size={14} />, label: 'Verse Image Creator' },
              { icon: <TrendingUp size={14} />, label: 'Advanced Analytics' },
              { icon: <Shield size={14} />, label: 'Priority Support' },
              { icon: <Gift size={14} />, label: 'Exclusive Content' },
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2"><span style={{ color: theme.accent }}>{benefit.icon}</span><span className="text-xs" style={{ color: theme.textMuted }}>{benefit.label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionScreen;