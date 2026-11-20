import React, { useState } from 'react';
import {
  FileText,
  HelpCircle,
  Layout,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { CmsContent, CmsFaqItem, FaqCategory, MediaAsset } from '../types.ts';
import { AdminImagePicker } from './AdminImagePicker.tsx';

interface AdminCmsEditorProps {
  cmsForm: CmsContent;
  onChange: (next: CmsContent) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  onUploadFile: (file: File) => Promise<string | null>;
  mediaAssets: MediaAsset[];
  onRefreshMedia: () => Promise<void>;
}

type CmsSubSection = 'hero' | 'sections' | 'cta' | 'pages' | 'faqs';

export const AdminCmsEditor: React.FC<AdminCmsEditorProps> = ({
  cmsForm,
  onChange,
  onSave,
  saving,
  onUploadFile,
  mediaAssets,
  onRefreshMedia,
}) => {
  const [section, setSection] = useState<CmsSubSection>('hero');

  const updateField = <K extends keyof CmsContent>(key: K, value: CmsContent[K]) => {
    onChange({ ...cmsForm, [key]: value });
  };

  const updateWhyCard = (idx: number, field: 'num' | 'title' | 'description', value: string) => {
    const nextCards = cmsForm.whyCards.map((card, i) =>
      i === idx ? { ...card, [field]: value } : card
    );
    updateField('whyCards', nextCards);
  };

  const updateFaq = (idx: number, patch: Partial<CmsFaqItem>) => {
    const nextFaqs = cmsForm.faqs.map((faq, i) => (i === idx ? { ...faq, ...patch } : faq));
    updateField('faqs', nextFaqs);
  };

  const addFaq = () => {
    const nextFaq: CmsFaqItem = {
      id: `faq-${Date.now()}`,
      category: 'Tours',
      question: '',
      answer: '',
    };
    updateField('faqs', [...cmsForm.faqs, nextFaq]);
  };

  const removeFaq = (idx: number) => {
    updateField(
      'faqs',
      cmsForm.faqs.filter((_, i) => i !== idx)
    );
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Top Header & Save Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#111114]">
            <Layout className="h-5 w-5 text-[#C59B38]" />
            Website Content, Headings &amp; Banners (CMS)
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Edit homepage banners, headlines, descriptions, FAQs, and page text below without writing any code. Click &ldquo;Save Website Content&rdquo; when finished.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
          ) : (
            <Save className="h-4 w-4 text-[#C59B38]" />
          )}
          <span>{saving ? 'Saving Changes...' : 'Save Website Content'}</span>
        </button>
      </div>

      {/* Friendly Section Switcher */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1.5">
        {(
          [
            { id: 'hero', label: '1. Hero Banner & Welcome', icon: Sparkles },
            { id: 'sections', label: '2. Homepage Sections & Highlights', icon: Layout },
            { id: 'cta', label: '3. Booking Banner & Footer', icon: FileText },
            { id: 'pages', label: '4. Tours, About & Contact Copy', icon: FileText },
            { id: 'faqs', label: `5. FAQ Questions (${cmsForm.faqs.length})`, icon: HelpCircle },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                section === tab.id
                  ? 'bg-[#0B0B0D] text-white'
                  : 'text-neutral-600 hover:text-[#111114]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-[#C59B38]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: HERO BANNER & WELCOME */}
      {section === 'hero' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              Homepage Hero Banner &amp; Headlines
            </h3>

            <AdminImagePicker
              label="Main Hero Banner Photo"
              helperText="Full-width Dubai background banner displayed at the top of the homepage."
              value={cmsForm.heroBannerUrl}
              onChange={(url) => updateField('heroBannerUrl', url)}
              onUploadFile={onUploadFile}
              mediaAssets={mediaAssets}
              onRefreshMedia={onRefreshMedia}
              aspectClass="h-24 w-40"
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Small Top Tagline (Eyebrow)
              </label>
              <input
                type="text"
                value={cmsForm.heroEyebrow}
                onChange={(e) => updateField('heroEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Main Hero Heading *
              </label>
              <input
                type="text"
                required
                value={cmsForm.heroHeading}
                onChange={(e) => updateField('heroHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-[#111114]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Hero Subtitle / Description
              </label>
              <textarea
                rows={3}
                value={cmsForm.heroDescription}
                onChange={(e) => updateField('heroDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Primary Button
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.heroExploreBtnText}
                  onChange={(e) => updateField('heroExploreBtnText', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Secondary Button
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.heroBookBtnText}
                  onChange={(e) => updateField('heroBookBtnText', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  WhatsApp Button
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.heroWhatsAppBtnText}
                  onChange={(e) => updateField('heroWhatsAppBtnText', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 h-fit">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              Homepage Welcome Introduction
            </h3>
            <p className="text-xs text-neutral-500">
              Shown right below the hero banner beside your portrait photo.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Welcome Eyebrow Label
              </label>
              <input
                type="text"
                value={cmsForm.welcomeEyebrow}
                onChange={(e) => updateField('welcomeEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Welcome Main Heading *
              </label>
              <input
                type="text"
                required
                value={cmsForm.welcomeHeading}
                onChange={(e) => updateField('welcomeHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Welcome Description Paragraph
              </label>
              <textarea
                rows={5}
                value={cmsForm.welcomeDescription}
                onChange={(e) => updateField('welcomeDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HOMEPAGE SECTIONS & HIGHLIGHTS */}
      {section === 'sections' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold">Featured Tours Section</h3>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Eyebrow</label>
                <input
                  type="text"
                  value={cmsForm.featuredEyebrow}
                  onChange={(e) => updateField('featuredEyebrow', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Heading *</label>
                <input
                  type="text"
                  required
                  value={cmsForm.featuredHeading}
                  onChange={(e) => updateField('featuredHeading', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Description</label>
                <textarea
                  rows={2}
                  value={cmsForm.featuredDescription}
                  onChange={(e) => updateField('featuredDescription', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold">
                Safari &amp; Transfers Schedule + Other Section Titles
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Tariff Eyebrow
                  </label>
                  <input
                    type="text"
                    value={cmsForm.tariffEyebrow}
                    onChange={(e) => updateField('tariffEyebrow', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Tariff Heading *
                  </label>
                  <input
                    type="text"
                    required
                    value={cmsForm.tariffHeading}
                    onChange={(e) => updateField('tariffHeading', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Destinations Eyebrow
                  </label>
                  <input
                    type="text"
                    value={cmsForm.destinationsEyebrow}
                    onChange={(e) => updateField('destinationsEyebrow', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Destinations Heading *
                  </label>
                  <input
                    type="text"
                    required
                    value={cmsForm.destinationsHeading}
                    onChange={(e) => updateField('destinationsHeading', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Reviews Heading *
                  </label>
                  <input
                    type="text"
                    required
                    value={cmsForm.reviewsHeading}
                    onChange={(e) => updateField('reviewsHeading', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Gallery Heading *
                  </label>
                  <input
                    type="text"
                    required
                    value={cmsForm.galleryHeading}
                    onChange={(e) => updateField('galleryHeading', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Why Choose Us — Eyebrow
                </label>
                <input
                  type="text"
                  value={cmsForm.whyEyebrow}
                  onChange={(e) => updateField('whyEyebrow', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Why Choose Us — Heading *
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.whyHeading}
                  onChange={(e) => updateField('whyHeading', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cmsForm.whyCards.map((card, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 space-y-2"
                >
                  <input
                    type="text"
                    value={card.num}
                    onChange={(e) => updateWhyCard(idx, 'num', e.target.value)}
                    className="font-mono-num w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-[#8B6816]"
                  />
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => updateWhyCard(idx, 'title', e.target.value)}
                    placeholder="Highlight title"
                    className="w-full rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111114]"
                  />
                  <textarea
                    rows={3}
                    value={card.description}
                    onChange={(e) => updateWhyCard(idx, 'description', e.target.value)}
                    placeholder="Highlight description"
                    className="w-full rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BOTTOM BOOKING BANNER & FOOTER */}
      {section === 'cta' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              Bottom Booking Call-to-Action Banner
            </h3>

            <AdminImagePicker
              label="Optional Banner Background Image"
              helperText="Leave empty for clean luxury black & gold background, or pick/upload a Dubai banner photo."
              value={cmsForm.ctaBannerUrl}
              onChange={(url) => updateField('ctaBannerUrl', url)}
              onUploadFile={onUploadFile}
              mediaAssets={mediaAssets}
              onRefreshMedia={onRefreshMedia}
              allowClear
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Banner Eyebrow</label>
              <input
                type="text"
                value={cmsForm.ctaEyebrow}
                onChange={(e) => updateField('ctaEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Banner Main Heading *
              </label>
              <input
                type="text"
                required
                value={cmsForm.ctaHeading}
                onChange={(e) => updateField('ctaHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Banner Subtitle
              </label>
              <textarea
                rows={2}
                value={cmsForm.ctaDescription}
                onChange={(e) => updateField('ctaDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.ctaPrimaryBtnText}
                  onChange={(e) => updateField('ctaPrimaryBtnText', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  WhatsApp Button Label
                </label>
                <input
                  type="text"
                  required
                  value={cmsForm.ctaSecondaryBtnText}
                  onChange={(e) => updateField('ctaSecondaryBtnText', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 h-fit">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              Website Footer Copy
            </h3>
            <p className="text-xs text-neutral-500">
              Your business brand name, WhatsApp number, email, and address are edited under the &ldquo;Contact &amp; About Us&rdquo; tab.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Footer Copyright Tagline
              </label>
              <input
                type="text"
                value={cmsForm.footerTagline}
                onChange={(e) => updateField('footerTagline', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SUBPAGES COPY */}
      {section === 'pages' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
            <h3 className="font-display text-xl font-semibold text-[#111114]">Tours Page Header</h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Eyebrow</label>
              <input
                type="text"
                value={cmsForm.toursPageEyebrow}
                onChange={(e) => updateField('toursPageEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Heading *</label>
              <input
                type="text"
                required
                value={cmsForm.toursPageHeading}
                onChange={(e) => updateField('toursPageHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Description</label>
              <textarea
                rows={4}
                value={cmsForm.toursPageDescription}
                onChange={(e) => updateField('toursPageDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              About Us Page Sections
            </h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Services Block Heading *
              </label>
              <input
                type="text"
                required
                value={cmsForm.aboutServicesHeading}
                onChange={(e) => updateField('aboutServicesHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Services Block Description
              </label>
              <textarea
                rows={2}
                value={cmsForm.aboutServicesDescription}
                onChange={(e) => updateField('aboutServicesDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Commitment Card Heading *
              </label>
              <input
                type="text"
                required
                value={cmsForm.aboutCommitmentHeading}
                onChange={(e) => updateField('aboutCommitmentHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Commitment Description
              </label>
              <textarea
                rows={3}
                value={cmsForm.aboutCommitmentDescription}
                onChange={(e) => updateField('aboutCommitmentDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
            <h3 className="font-display text-xl font-semibold text-[#111114]">
              Contact Page Header
            </h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Eyebrow</label>
              <input
                type="text"
                value={cmsForm.contactEyebrow}
                onChange={(e) => updateField('contactEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Heading *</label>
              <input
                type="text"
                required
                value={cmsForm.contactHeading}
                onChange={(e) => updateField('contactHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Description</label>
              <textarea
                rows={4}
                value={cmsForm.contactDescription}
                onChange={(e) => updateField('contactDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: FAQ QUESTIONS */}
      {section === 'faqs' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-[#111114]">
                Frequently Asked Questions (FAQ)
              </h3>
              <p className="text-xs text-neutral-500">
                Add, edit, or delete questions grouped by Tours, Transfers, and Booking.
              </p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
            >
              <Plus className="h-3.5 w-3.5 text-[#8B6816]" />
              Add New Question
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">FAQ Eyebrow</label>
              <input
                type="text"
                value={cmsForm.faqEyebrow}
                onChange={(e) => updateField('faqEyebrow', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">FAQ Heading *</label>
              <input
                type="text"
                required
                value={cmsForm.faqHeading}
                onChange={(e) => updateField('faqHeading', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">FAQ Subtitle</label>
              <input
                type="text"
                value={cmsForm.faqSubtitle}
                onChange={(e) => updateField('faqSubtitle', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="space-y-3">
            {cmsForm.faqs.map((faq, idx) => (
              <div
                key={faq.id || idx}
                className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={faq.category}
                    onChange={(e) => updateFaq(idx, { category: e.target.value as FaqCategory })}
                    className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111114]"
                  >
                    <option value="Tours">Tours</option>
                    <option value="Transfers">Transfers</option>
                    <option value="Booking">Booking</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, { question: e.target.value })}
                    placeholder="Question..."
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111114]"
                  />
                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="rounded-lg border border-red-200 bg-white p-1.5 text-red-700 hover:bg-red-50"
                    aria-label="Remove FAQ item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  required
                  value={faq.answer}
                  onChange={(e) => updateFaq(idx, { answer: e.target.value })}
                  placeholder="Answer..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-700"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Save Action */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
          ) : (
            <Save className="h-4 w-4 text-[#C59B38]" />
          )}
          <span>{saving ? 'Saving Changes...' : 'Save Website Content'}</span>
        </button>
      </div>
    </form>
  );
};
