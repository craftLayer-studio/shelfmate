import type {Metadata} from 'next';
import {pageCtx} from '@/server/session';
import {getCustomer} from '@/server/store';
import {orNotFound} from '@/server/pages';
import {CustomerDetail} from '@/components/CustomerDetail';

export const metadata: Metadata = {title: 'Customer khata'};

export default async function CustomerPage({params}: {params: Promise<{id: string}>}) {
  const ctx = await pageCtx();
  const {id} = await params;
  const data = await orNotFound(getCustomer(ctx, id));
  return <CustomerDetail data={data} />;
}
