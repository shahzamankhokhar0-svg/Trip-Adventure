import React, { useState } from 'react';
import { FolderOpen, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';
import type { MediaAsset } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface AdminImagePickerProps {
  label: string;
  helperText?: string;
  value: string;
  onChange: (nextUrl: string) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  mediaAssets: MediaAsset[];
  onRefreshMedia?: () => void;
  allowClear?: boolean;
  aspectClass?: string;
}

export const AdminImagePicker: React.FC<AdminImagePickerProps> = ({
  label,
  helperText,
  value,
  onChange,
  onUploadFile,
  mediaAssets,
  onRefreshMedia,
  allowClear = false,
  aspectClass = 'h-24 w-36',
}) => {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUploadFile(file);
      if (url) {
        onChange(url);
        onRefreshMedia?.();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-neutral-800">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-[11px] font-medium text-neutral-500 underline hover:text-[#111114]"
        >
          {showUrlInput ? 'Hide URL field' : 'Or enter image link'}
        </button>
      </div>
      {helperText && <p className="text-[11px] text-neutral-500">{helperText}</p>}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-3">
        <div
          className={`relative shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 ${aspectClass}`}
        >
          {value ? (
            <SafeImage src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400">
              <ImageIcon className="h-5 w-5" />
              <span className="mt-1 text-[10px]">No image</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0B0B0D] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1F1F25]">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C59B38]" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-[#C59B38]" />
            )}
            <span>{value ? 'Upload Replacement' : 'Upload Photo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              onRefreshMedia?.();
              setPickerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#8B6816]" />
            Choose from Library
          </button>

          {allowClear && value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>

      {showUrlInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/... or https://..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
        />
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h4 className="font-display text-2xl font-semibold text-[#111114]">
                  Choose Photo from Media Library
                </h4>
                <p className="text-xs text-neutral-500">
                  Click any photo below to use it immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                aria-label="Close photo library"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mediaAssets.length === 0 ? (
              <p className="py-12 text-center text-sm text-neutral-500">
                No photos found yet. Upload a photo using the Upload button.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {mediaAssets.map((asset) => {
                  const selected = value === asset.url;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onChange(asset.url);
                        setPickerOpen(false);
                      }}
                      className={`group overflow-hidden rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-[#C59B38] ring-2 ring-[#C59B38]/40'
                          : 'border-neutral-200 hover:border-[#C59B38]'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                        <SafeImage
                          src={asset.url}
                          alt={asset.filename}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-semibold text-[#111114]">
                          {asset.filename}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {asset.source === 'uploaded' ? 'Uploaded photo' : 'Built-in Dubai photo'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
