'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Euro, Save, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Button, Field, Modal } from '@/components/common';
import { Bluray } from '@/types/bluray';
import { normalizePurchaseDateForInput } from '@/lib/bluray-utils';

interface PurchaseInfoModalProps {
  blurayId: string;
  bluray: Bluray;
  onClose: () => void;
  onSave: (price: number, date: string) => void;
}

/** Edit the purchase price and date of a bluray. */
export default function PurchaseInfoModal({ blurayId, bluray, onClose, onSave }: PurchaseInfoModalProps) {
  const t = useTranslations();
  const [price, setPrice] = useState<number>(bluray.purchase_price || 0);
  const [date, setDate] = useState<string>(normalizePurchaseDateForInput(bluray.purchase_date));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isoDate = date ? new Date(date).toISOString() : null;
      // The backend validates the whole document, so send it with the new values
      await apiClient.updateBluray(blurayId, { ...bluray, purchase_price: price, purchase_date: isoDate });
      toast.success(t('details.purchaseInfoUpdated'));
      onSave(price, isoDate || '');
      onClose();
    } catch {
      toast.error(t('details.purchaseInfoUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      icon={<ShoppingBag />}
      tone="success"
      title={t('details.editPurchaseInfo')}
      description={bluray.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="purchase-info" variant="success" loading={saving} icon={<Save />}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="purchase-info" onSubmit={handleSubmit} className="space-y-5">
        <Field label={t('details.purchasePrice')} icon={<Euro />} htmlFor="purchase-price" hint={t('details.purchasePriceHelp')}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">€</span>
            <input
              id="purchase-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="input pl-8 font-mono tabular-nums"
            />
          </div>
        </Field>
        <Field label={t('details.purchaseDate')} icon={<Calendar />} htmlFor="purchase-date" hint={t('details.purchaseDateHelp')}>
          <input
            id="purchase-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>
      </form>
    </Modal>
  );
}
