import type {Metadata} from 'next';
import {pageCtx} from '@/server/session';
import {listOrders} from '@/server/store';
import {OrderQueue} from '@/components/OrderQueue';
import {AutoRefresh} from '@/components/AutoRefresh';

export const metadata: Metadata = {title: 'Orders'};

export default async function OrdersPage() {
  const ctx = await pageCtx();
  const orders = await listOrders(ctx);
  return (
    <>
      <AutoRefresh seconds={5} />
      <OrderQueue orders={orders} />
    </>
  );
}
