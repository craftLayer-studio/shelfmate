import type {Metadata} from 'next';
import {pageCtx} from '@/server/session';
import {getSettings} from '@/server/store';
import {SettingsForm} from '@/components/SettingsForm';

export const metadata: Metadata = {title: 'Settings'};

export default async function SettingsPage() {
  const ctx = await pageCtx('owner');
  const s = await getSettings(ctx);
  const o = s.org;
  return (
    <SettingsForm
      catalogUrl={s.catalogUrl}
      staff={s.staff}
      initial={{
        name: o.name,
        address: o.address,
        city: o.city,
        whatsappPhone: o.whatsappPhone.replace('+91', ''),
        upiVpa: o.upiVpa,
        gstin: o.gstin ?? '',
        composition: o.composition,
        deliveryRadiusKm: o.deliveryRadiusKm,
        minOrder: o.minOrderPaise,
        openMinute: o.openMinute,
        closeMinute: o.closeMinute,
        slotMinutes: o.slotMinutes,
      }}
    />
  );
}
