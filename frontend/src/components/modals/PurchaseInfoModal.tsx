'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Save, Euro } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Button } from '@/components/common';
import { Bluray } from '@/types/bluray';
import { normalizePurchaseDateForInput } from '@/lib/bluray-utils';

interface PurchaseInfoModalProps {
  blurayId: string;
  bluray: Bluray;
  onClose: () => void;
  onSave: (price: number, date: string) => void;
}

export default function PurchaseInfoModal({
  blurayId,
  bluray,
  onClose,
  onSave,
}: PurchaseInfoModalProps) {
  const t = useTranslations();

  const [price, setPrice] = useState<number>(bluray.purchase_price || 0);
  const [date, setDate] = useState<string>(normalizePurchaseDateForInput(bluray.purchase_date));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Format the date to ISO string for API
      const isoDate = date ? new Date(date).toISOString() : null;
      
      // Send the full bluray object with updated purchase info to satisfy backend validation
      await apiClient.updateBluray(blurayId, {
        ...bluray,
        purchase_price: price,
        purchase_date: isoDate,
      });

      toast.success(t('details.purchaseInfoUpdated'));
      onSave(price, isoDate || '');
      onClose();
    } catch (error) {
      console.error('Failed to update purchase info:', error);
      toast.error(t('details.purchaseInfoUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 max-w-md w-full">
        {/* Modal Header */}
        <div className="bg-gray-50 dark:bg-slate-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/10 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/20">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('details.editPurchaseInfo')}</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">{bluray.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-3">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                {t('details.purchasePrice')}
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-lg font-bold">€</span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-950/50 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">{t('details.purchasePriceHelp')}</p>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('details.purchaseDate')}
              </div>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">{t('details.purchaseDateHelp')}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 border-gray-300 dark:border-white/10"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            loading={loading}
            disabled={loading}
            icon={<Save className="w-4 h-4" />}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500"
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
