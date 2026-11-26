import type {Metadata} from 'next';
import {getDb} from '@/server/db';
import {getStorefront} from '@/server/store';
import {orNotFound} from '@/server/pages';
import {Storefront} from '@/components/Storefront';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Order online', robots: {index: false}};

export default async function StorePage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const data = await orNotFound(getStorefront(await getDb(), token));
  return <Storefront token={token} data={data} />;
}
