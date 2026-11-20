import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Star, Upload } from 'lucide-react';
import type { CustomerReview, TourPackage } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface ReviewsSectionProps {
  reviews: CustomerReview[];
  tours: TourPackage[];
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews, tours }) => {
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [tourTitle, setTourTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Photo must be smaller than 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          rating,
          tourTitle,
          comment,
          photoDataUrl: photoDataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit review.');
      } else {
        setSuccessMsg(data.message);
        setCustomerName('');
        setRating(5);
        setTourTitle('');
        setComment('');
        setPhotoDataUrl('');
      }
    } catch {
      setError('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold text-[#8B6816]">Verified Guest Feedback</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
            Customer Reviews
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Only genuine reviews submitted by TRIP ADVENTURE guests and verified by our guide appear on this page.
          </p>

          {reviews.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F6] text-[#C59B38]">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold text-[#111114]">
                No Published Reviews Yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                We never publish fabricated testimonials. Have you toured Dubai with Usama, Abdul Qadir, and TRIP ADVENTURE? Share your genuine experience using the review form.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {rev.photoUrl ? (
                        <SafeImage
                          src={rev.photoUrl}
                          alt={rev.customerName}
                          className="h-12 w-12 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B0B0D] font-display text-lg font-semibold text-[#C59B38]">
                          {rev.customerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-sm text-[#111114]">
                          {rev.customerName}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {rev.tourTitle || 'Private Dubai Tour'} ·{' '}
                          <span className="font-mono-num">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-[#C59B38]" aria-label={`${rev.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < rev.rating ? 'fill-[#C59B38] text-[#C59B38]' : 'text-neutral-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-700">{rev.comment}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
            <h3 className="font-display text-2xl font-semibold text-[#111114]">
              Leave a Guest Review
            </h3>
            <p className="mt-1 text-xs text-neutral-600">
              Reviews are checked by the administrator before appearing publicly.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label htmlFor="rev-name" className="block text-xs font-semibold text-neutral-700">
                  Your Name *
                </label>
                <input
                  id="rev-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-neutral-700">Star Rating *</span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      aria-label={`Rate ${num} stars`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 hover:border-[#C59B38]"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          num <= rating ? 'fill-[#C59B38] text-[#C59B38]' : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="rev-tour" className="block text-xs font-semibold text-neutral-700">
                  Tour Experienced (Optional)
                </label>
                <select
                  id="rev-tour"
                  value={tourTitle}
                  onChange={(e) => setTourTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                >
                  <option value="">Select a tour</option>
                  {tours.map((t) => (
                    <option key={t.id} value={t.title}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rev-comment" className="block text-xs font-semibold text-neutral-700">
                  Your Review *
                </label>
                <textarea
                  id="rev-comment"
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share highlights of your Dubai tour or transfer with TRIP ADVENTURE..."
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Optional Photo
                </label>
                <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-xs font-medium text-neutral-600 hover:border-[#C59B38]">
                  <Upload className="h-4 w-4 text-[#8B6816]" />
                  <span>{photoDataUrl ? 'Photo selected (click to change)' : 'Upload guest photo (max 3MB)'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1F1F25] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />}
                Submit Review for Verification
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
