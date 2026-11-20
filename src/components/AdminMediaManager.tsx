import React, { useState } from 'react';
import { Check, Copy, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import type { CmsContent, GalleryItem, MediaAsset, SiteSettings, TourPackage } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface AdminMediaManagerProps {
  mediaAssets: MediaAsset[];
  tours: TourPackage[];
  gallery: GalleryItem[];
  settings: SiteSettings | null;
  cms: CmsContent | null;
  onUploadFile: (file: File) => Promise<string | null>;
  onDeleteMedia: (filename: string) => Promise<void>;
  onRefreshMedia: () => Promise<void>;
}

export const AdminMediaManager: React.FC<AdminMediaManagerProps> = ({
  mediaAssets,
  tours,
  gallery,
  settings,
  cms,
  onUploadFile,
  onDeleteMedia,
  onRefreshMedia,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uploaded = mediaAssets.filter((m) => m.source === 'uploaded');
  const builtIn = mediaAssets.filter((m) => m.source === 'built-in');

  const getUsageLabels = (url: string): string[] => {
    const usages: string[] = [];
    if (cms?.heroBannerUrl === url) usages.push('Hero Banner');
    if (cms?.ctaBannerUrl === url) usages.push('CTA Banner');
    if (settings?.guidePhotoUrl === url) usages.push('Guide Portrait');
    const tourCount = tours.filter((t) => t.imageUrl === url).length;
    if (tourCount > 0) usages.push(`${tourCount} Tour(s)`);
    const galCount = gallery.filter((g) => g.imageUrl === url).length;
    if (galCount > 0) usages.push(`${galCount} Gallery`);
    return usages;
  };

  const handleUploadMultiple = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await onUploadFile(file);
      }
      await onRefreshMedia();
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#111114]">
            <ImageIcon className="h-5 w-5 text-[#C59B38]" />
            Media &amp; Image Library
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Upload photos from your computer or phone, preview where they are used, or delete unused uploads. All uploaded images appear inside your Tour, Banner, and Gallery photo pickers.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25]">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
          ) : (
            <Upload className="h-4 w-4 text-[#C59B38]" />
          )}
          <span>{uploading ? 'Uploading...' : 'Upload New Photos (PNG / JPG / WEBP)'}</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={handleUploadMultiple}
            className="hidden"
          />
        </label>
      </div>

      {/* UPLOADED PHOTOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-[#111114]">
            Your Uploaded Photos ({uploaded.length})
          </h3>
          <span className="text-xs text-neutral-500">Max 3 MB per image</span>
        </div>

        {uploaded.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-700">
              No custom images uploaded yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Click &ldquo;Upload New Photos&rdquo; above to add banners, tour photos, guide portraits, or gallery shots.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {uploaded.map((asset) => {
              const usages = getUsageLabels(asset.url);
              const isDeleting = deletingFile === asset.filename;
              return (
                <div
                  key={asset.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    <SafeImage
                      src={asset.url}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                    />
                    {usages.length > 0 && (
                      <span className="absolute left-2 top-2 rounded bg-[#0B0B0D]/85 px-2 py-0.5 text-[10px] font-semibold text-[#F5E4B8]">
                        In use: {usages.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3 space-y-2">
                    <div>
                      <p className="truncate text-xs font-semibold text-[#111114]">
                        {asset.filename}
                      </p>
                      <p className="font-mono-num text-[11px] text-neutral-500">
                        {formatBytes(asset.sizeBytes)}
                        {asset.createdAt ? ` · ${new Date(asset.createdAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] font-semibold text-[#111114] hover:border-[#C59B38]"
                      >
                        {copiedId === asset.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-700" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={async () => {
                          setDeletingFile(asset.filename);
                          try {
                            await onDeleteMedia(asset.filename);
                          } finally {
                            setDeletingFile(null);
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Delete ${asset.filename}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BUILT-IN PHOTOS */}
      <div className="space-y-4 border-t border-neutral-200 pt-6">
        <h3 className="font-display text-xl font-semibold text-[#111114]">
          Built-in Dubai Photography ({builtIn.length})
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {builtIn.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <div className="aspect-[4/3] bg-neutral-100">
                <SafeImage
                  src={asset.url}
                  alt={asset.filename}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <p className="truncate text-[11px] font-medium text-neutral-700">
                  {asset.filename}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(asset)}
                  className="shrink-0 rounded border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-[#111114] hover:border-[#C59B38]"
                >
                  {copiedId === asset.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
