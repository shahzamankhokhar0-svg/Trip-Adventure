import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
} from 'lucide-react';
import type { Attraction, CmsContent, SiteSettings } from '../types.ts';
import { buildWhatsAppUrl } from '../lib/whatsapp.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import { DubaiInteractiveMap } from './DubaiInteractiveMap.tsx';

interface ContactSectionProps {
  settings: SiteSettings;
  cms?: CmsContent;
  attractions: Attraction[];
  mapsApiKey: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  settings,
  cms,
  attractions,
  mapsApiKey,
}) => {
  const { language, t } = usePreferences();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send inquiry.');
      } else {
        setSuccess(data.message);
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      }
    } catch {
      setError('Network error while sending message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold text-[#8B6816]">
              {language === 'en' && cms?.contactEyebrow ? cms.contactEyebrow : t.sections.contactEyebrow}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
              {language === 'en' && cms?.contactHeading ? cms.contactHeading : t.sections.contactTitle}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-600">
              {cms?.contactDescription ||
                `Reach out directly to Program Organizer ${settings.guideName} (Tour Guides: ${settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'}) for Dubai sightseeing tours, desert safaris, airport arrivals/departures, or inter-hotel transfers.`}
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <a
              href={buildWhatsAppUrl(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3.5 rounded-xl border border-neutral-100 bg-[#FAF9F6] p-4 transition-colors hover:border-[#C59B38]"
            >
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" />
              <div>
                <p className="text-xs font-semibold text-neutral-500">WhatsApp Business</p>
                <p className="font-mono-num mt-0.5 text-sm font-semibold text-[#111114]">
                  {settings.whatsappNumber}
                </p>
                <p className="mt-0.5 text-xs text-[#8B6816]">Tap to start a WhatsApp chat</p>
              </div>
            </a>

            <a
              href={`mailto:${settings.email}`}
              className="flex items-start gap-3.5 rounded-xl border border-neutral-100 bg-[#FAF9F6] p-4 transition-colors hover:border-[#C59B38]"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#8B6816]" />
              <div>
                <p className="text-xs font-semibold text-neutral-500">Email Contact</p>
                <p className="mt-0.5 text-sm font-semibold text-[#111114]">{settings.email}</p>
              </div>
            </a>

            <div className="flex items-start gap-3.5 rounded-xl border border-neutral-100 bg-[#FAF9F6] p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#8B6816]" />
              <div>
                <p className="text-xs font-semibold text-neutral-500">Dubai Business Location</p>
                <p className="mt-0.5 text-sm font-semibold text-[#111114]">{settings.address}</p>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <p className="text-xs font-semibold text-neutral-500">Social Channels</p>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs font-semibold">
                {settings.socialInstagram && (
                  <a
                    href={settings.socialInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-[#111114] hover:border-[#C59B38]"
                  >
                    Instagram
                  </a>
                )}
                {settings.socialFacebook && (
                  <a
                    href={settings.socialFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-[#111114] hover:border-[#C59B38]"
                  >
                    Facebook
                  </a>
                )}
                {settings.socialTiktok && (
                  <a
                    href={settings.socialTiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-[#111114] hover:border-[#C59B38]"
                  >
                    TikTok
                  </a>
                )}
                {settings.socialYoutube && (
                  <a
                    href={settings.socialYoutube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-[#111114] hover:border-[#C59B38]"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
            <h3 className="font-display text-2xl font-semibold text-[#111114]">
              Send an Inquiry
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Ask about custom routes, family sizing, layover timing, or AED rates.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="block text-xs font-semibold text-neutral-700">
                    Full Name *
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="c-email" className="block text-xs font-semibold text-neutral-700">
                    Email Address *
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-phone" className="block text-xs font-semibold text-neutral-700">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="c-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="c-subject" className="block text-xs font-semibold text-neutral-700">
                    Subject
                  </label>
                  <input
                    id="c-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Private Tour / Airport Pickup / Custom Request"
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="c-msg" className="block text-xs font-semibold text-neutral-700">
                  Message *
                </label>
                <textarea
                  id="c-msg"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1F1F25] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
                ) : (
                  <Send className="h-4 w-4 text-[#C59B38]" />
                )}
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[#111114]">
              Dubai Location Map
            </h3>
            <p className="text-xs text-neutral-600">{settings.address}</p>
          </div>
        </div>
        <DubaiInteractiveMap
          apiKey={mapsApiKey}
          attractions={attractions}
          mode="contact"
          businessCenter={{
            lat: settings.businessLat,
            lng: settings.businessLng,
            address: settings.address,
            brandName: settings.brandName,
          }}
          heightClass="h-[360px]"
        />
      </div>
    </div>
  );
};
