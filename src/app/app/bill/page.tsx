import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Text';
import {DataTable} from '@/components/DataTable';
import {formatDateTimeIST, formatINR} from '@/domain';
import {pageCtx} from '@/server/session';
import {getInventory, listInvoices} from '@/server/store';
import {QuickBill} from '@/components/QuickBill';

export const metadata: Metadata = {title: 'Quick bill'};

export default async function BillPage() {
  const ctx = await pageCtx();
  const [inv, invoices] = await Promise.all([getInventory(ctx), listInvoices(ctx, 15)]);
  const products = inv.products
    .filter((p) => p.active)
    .map((p) => ({id: p.id, name: p.name, unit: p.unit, price: p.price, hsn: p.hsn, gstRateBp: p.gstRateBp, stockMilli: p.trackStock ? p.stockMilli : null, schedule: p.schedule}));
  return (
    <VStack gap={6}>
      <QuickBill products={products} />
      <VStack gap={2}>
        <Heading level={2}>Recent bills</Heading>
        <DataTable
          rows={invoices.map((r) => ({
            id: r.id,
            number: r.number,
            href: `/app/invoices/${r.id}`,
            time: formatDateTimeIST(r.createdAt),
            customer: r.customerName || 'Walk-in',
            mode: r.paymentMode.toUpperCase(),
            total: formatINR(r.total),
          }))}
          columns={[
            {key: 'number', header: 'Bill no.', linkKey: 'href'},
            {key: 'time', header: 'Time'},
            {key: 'customer', header: 'Customer'},
            {key: 'mode', header: 'Paid by'},
            {key: 'total', header: 'Total', align: 'end'},
          ]}
        />
      </VStack>
    </VStack>
  );
}
