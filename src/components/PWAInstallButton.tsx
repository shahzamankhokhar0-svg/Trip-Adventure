import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'dark' | 'light';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'dark' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const btnStyle =
    variant === 'dark'
      ? 'border border-[#C59B38]/40 bg-[#141417] text-[#F5EFE0] hover:border-[#C59B38] hover:bg-[#1C1C21]'
      : 'border border-[#111114]/20 bg-white text-[#111114] hover:border-[#C59B38] hover:bg-[#FAF9F6]';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${btnStyle}`}
      >
        <Download className="h-3.5 w-3.5 text-[#C59B38]" />
        Install Mobile App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${btnStyle}`}
      >
        <Smartphone className="h-3.5 w-3.5 text-[#C59B38]" />
        {isIOS ? 'Install on iPhone / iPad' : 'Get Mobile App'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C59B38]/25 bg-[#111114] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#C59B38]">TRIP ADVENTURE App</p>
                <h3 id="pwa-guide-title" className="mt-1 font-display text-2xl font-semibold text-white">
                  Install on Your Device
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              Add TRIP ADVENTURE directly to your home screen for quick offline itinerary access, one-tap WhatsApp messaging, and full-screen app navigation.
            </p>
            {isIOS ? (
              <ol className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <li className="flex items-center gap-2">
                  <Share className="h-4 w-4 shrink-0 text-[#C59B38]" />
                  <span>1. Tap the <strong>Share</strong> icon in Safari’s toolbar.</span>
                </li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to launch TripDubai like a native app.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <li>1. Open your browser menu (three dots or address bar install icon).</li>
                <li>2. Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>3. Confirm to open TRIP ADVENTURE in standalone app mode.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-[#C59B38] py-2.5 text-sm font-semibold text-[#0B0B0D] transition-colors hover:bg-[#D4AF37]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
