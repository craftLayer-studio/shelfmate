import type {Metadata} from 'next';
import {pageCtx} from '@/server/session';
import {getInventory} from '@/server/store';
import {Inventory} from '@/components/Inventory';

export const metadata: Metadata = {title: 'Stock'};

export default async function StockPage() {
  const ctx = await pageCtx();
  return <Inventory data={await getInventory(ctx)} isOwner={ctx.role === 'owner'} />;
}
