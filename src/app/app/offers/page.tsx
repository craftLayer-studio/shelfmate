import type {Metadata} from 'next';
import {pageCtx} from '@/server/session';
import {listCustomers} from '@/server/store';
import {OfferForm} from '@/components/OfferForm';

export const metadata: Metadata = {title: 'Offers'};

export default async function OffersPage() {
  const ctx = await pageCtx('owner');
  const customers = await listCustomers(ctx);
  return <OfferForm optedIn={customers.filter((c) => c.consent.marketing).length} total={customers.length} />;
}
