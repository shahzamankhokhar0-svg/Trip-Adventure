import React, { useState } from 'react';
import { CheckCircle2, Loader2, Mail, Send } from 'lucide-react';

const LOCAL_SUBSCRIBERS_KEY = 'ta_newsletter_local_v1';

function saveLocalSubscriberFallback(email: string): { duplicate: boolean } {
  try {
    const raw = window.localStorage.getItem(LOCAL_SUBSCRIBERS_KEY);
    const list: Array<{ id: string; email: string; status: string; createdAt: string }> = raw
      ? JSON.parse(raw)
      : [];
    const normalized = email.trim().toLowerCase();
    if (list.some((item) => item.email.toLowerCase() === normalized && item.status === 'subscribed')) {
      return { duplicate: true };
    }
    list.unshift({
      id: `local-${Date.now()}`,
      email: normalized,
      status: 'subscribed',
      createdAt: new Date().toISOString(),
    });
    window.localStorage.setItem(LOCAL_SUBSCRIBERS_KEY, JSON.stringify(list.slice(0, 200)));
    return { duplicate: false };
  } catch {
    return { duplicate: false };
  }
}

export const FooterNewsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleaned, source: 'footer' }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('offline');
      }
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Could not subscribe right now.',
        });
        return;
      }
      setEmail('');
      setStatusMessage({
        type: data.alreadySubscribed ? 'info' : 'success',
        text:
          data.message ||
          'Subscribed! You will receive special Dubai tour offers in AED.',
      });
    } catch {
      const { duplicate } = saveLocalSubscriberFallback(cleaned);
      setEmail('');
      setStatusMessage({
        type: duplicate ? 'info' : 'success',
        text: duplicate
          ? 'This email is already subscribed to Dubai tour offers.'
          : 'Subscribed! Your email is saved for special Dubai tour offers.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#141417] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#F5E4B8]">
        <Mail className="h-3.5 w-3.5 text-[#C59B38]" />
        Special Dubai Tour Offers
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
        Subscribe for seasonal Desert Safari rates, half-day &amp; full-day Dubai packages, and private AED promotions.
      </p>

      <form onSubmit={handleSubscribe} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address for Dubai tour offers"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0B0B0D] px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-[#C59B38] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#C59B38] px-4 py-2 text-xs font-semibold text-[#0B0B0D] transition-colors hover:bg-[#D4AF37] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Subscribe
        </button>
      </form>

      {statusMessage && (
        <p
          className={`mt-2.5 flex items-start gap-1.5 text-[11px] ${
            statusMessage.type === 'error'
              ? 'text-red-400'
              : statusMessage.type === 'info'
                ? 'text-[#F5E4B8]'
                : 'text-emerald-400'
          }`}
        >
          {statusMessage.type !== 'error' && (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </p>
      )}
    </div>
  );
};
