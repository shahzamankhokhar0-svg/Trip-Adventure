import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { NewsletterSubscriber } from '../types.ts';

interface AdminNewsletterTabProps {
  subscribers: NewsletterSubscriber[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminNewsletterTab: React.FC<AdminNewsletterTabProps> = ({
  subscribers,
  onRefresh,
  onToast,
  onError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => s.status === 'subscribed'),
    [subscribers]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subscribers.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.email.toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    });
  }, [subscribers, searchQuery, statusFilter]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newEmail.trim().toLowerCase();
    if (!cleaned) return;
    setAdding(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleaned, source: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Could not add subscriber.');
        return;
      }
      setNewEmail('');
      onToast(data.message || 'Subscriber saved to local JSON database.');
      await onRefresh();
    } catch {
      onError('Network error while adding subscriber.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (sub: NewsletterSubscriber) => {
    setBusyId(sub.id);
    const nextStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    try {
      const res = await fetch(`/api/admin/newsletter/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        onError(data.error || 'Could not update subscriber status.');
        return;
      }
      onToast(
        nextStatus === 'subscribed'
          ? `${sub.email} marked as subscribed.`
          : `${sub.email} unsubscribed.`
      );
      await onRefresh();
    } catch {
      onError('Network error updating subscriber.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sub: NewsletterSubscriber) => {
    setBusyId(sub.id);
    try {
      const res = await fetch(`/api/admin/newsletter/${sub.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError('Could not remove subscriber.');
        return;
      }
      onToast(`Removed ${sub.email} from newsletter list.`);
      await onRefresh();
    } catch {
      onError('Network error deleting subscriber.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyActiveEmails = async () => {
    const emails = activeSubscribers.map((s) => s.email).join(', ');
    if (!emails) {
      onError('No active subscribers to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(emails);
      onToast(`Copied ${activeSubscribers.length} active email(s) to clipboard.`);
    } catch {
      onError('Clipboard permission unavailable.');
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Email', 'Status', 'Source', 'Subscribed Date'],
      ...subscribers.map((s) => [s.email, s.status, s.source, s.createdAt]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-adventure-newsletter-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onToast('Exported newsletter subscribers CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Total Subscribers</p>
          <p className="font-mono-num mt-1 text-3xl font-semibold text-[#111114]">
            {subscribers.length}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Saved in local JSON (<code className="font-mono-num">data/newsletter.json</code>)
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-xs font-medium text-emerald-800">Active Offer Subscribers</p>
          <p className="font-mono-num mt-1 text-3xl font-semibold text-emerald-900">
            {activeSubscribers.length}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700">Ready for Dubai tour promotions</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Unsubscribed</p>
          <p className="font-mono-num mt-1 text-3xl font-semibold text-neutral-700">
            {subscribers.length - activeSubscribers.length}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Excluded from promotional exports</p>
        </div>
      </div>

      {/* Add Subscriber + Export Toolbar */}
      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleAddSubscriber}
          className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 lg:col-span-5"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#C59B38]" />
            <h3 className="font-display text-2xl font-semibold text-[#111114]">
              Add Offer Subscriber
            </h3>
          </div>
          <p className="text-xs text-neutral-600">
            Manually add a guest email or sync footer signups stored in{' '}
            <code className="font-mono-num">data/newsletter.json</code>.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="guest@example.com"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B0B0D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
            >
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C59B38]" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-[#C59B38]" />
              )}
              Add Email
            </button>
          </div>
        </form>

        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-7">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[#111114]">
              Subscriber List Controls &amp; Export
            </h3>
            <p className="mt-1 text-xs text-neutral-600">
              Filter subscribers, copy active emails for your campaign, or export the full list as CSV.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subscriber email..."
                className="w-full rounded-lg border border-neutral-300 py-2 pl-8 pr-3 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
              />
            </div>

            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
              {(['all', 'subscribed', 'unsubscribed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0B0B0D] text-white'
                      : 'text-neutral-600 hover:text-[#111114]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyActiveEmails}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
            >
              <Copy className="h-3.5 w-3.5 text-[#8B6816]" />
              Copy Emails
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B0B0D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1F1F25]"
            >
              <Download className="h-3.5 w-3.5 text-[#C59B38]" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-neutral-400" />
            <h4 className="mt-3 font-display text-xl font-semibold text-[#111114]">
              No Newsletter Subscribers Yet
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              Footer signups for special Dubai tour offers will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-[#FAF9F6] text-neutral-600">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Email Address</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Source</th>
                  <th className="px-5 py-3.5 font-semibold">Subscribed On</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF9F6]/60">
                    <td className="px-5 py-3.5 font-medium text-[#111114]">{sub.email}</td>
                    <td className="px-5 py-3.5">
                      {sub.status === 'subscribed' ? (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-600">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 capitalize text-neutral-600">{sub.source}</td>
                    <td className="font-mono-num px-5 py-3.5 text-neutral-500">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => handleToggleStatus(sub)}
                          title={
                            sub.status === 'subscribed'
                              ? 'Mark unsubscribed'
                              : 'Reactivate subscription'
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-semibold text-neutral-700 hover:border-[#C59B38] disabled:opacity-50"
                        >
                          {sub.status === 'subscribed' ? (
                            <>
                              <UserX className="h-3.5 w-3.5 text-amber-700" />
                              Pause
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => handleDelete(sub)}
                          aria-label={`Delete ${sub.email}`}
                          className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
