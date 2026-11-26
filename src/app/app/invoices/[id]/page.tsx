import type {Metadata} from 'next';
import QRCode from 'qrcode';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {DataTable} from '@/components/DataTable';
import {Divider} from '@astryxdesign/core/Divider';
import {buildUpiUri, formatDateTimeIST, formatINR, formatPhone, formatQty, formatRate, waMeLink} from '@/domain';
import {pageCtx} from '@/server/session';
import {getInvoice} from '@/server/store';
import {orNotFound} from '@/server/pages';
import {InvoiceActions} from '@/components/InvoiceActions';

export const metadata: Metadata = {title: 'Invoice'};

export default async function InvoicePage({params}: {params: Promise<{id: string}>}) {
  const ctx = await pageCtx();
  const {id} = await params;
  const data = await orNotFound(getInvoice(ctx, id));
  const {invoice, items, summary, store} = data;
  const isTax = invoice.kind === 'tax_invoice';
  const upi = invoice.paymentMode === 'upi' ? buildUpiUri({vpa: store.upi, payeeName: store.name, amount: invoice.totalPaise, note: `Bill ${invoice.number}`}) : null;
  const upiQr = upi ? `data:image/svg+xml;base64,${Buffer.from(await QRCode.toString(upi, {type: 'svg', margin: 1})).toString('base64')}` : null;
  const share = invoice.customerPhone
    ? waMeLink(invoice.customerPhone, `${store.name}: bill ${invoice.number} for ${formatINR(invoice.totalPaise)} (${invoice.paymentMode.toUpperCase()}). Thank you!`)
    : null;
  return (
    <VStack gap={4} maxWidth="48rem">
      <InvoiceActions shareLink={share} />
      <VStack gap={1}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={1}>{isTax ? 'Tax invoice' : 'Bill of supply'}</Heading>
          {store.isDemo && <Badge label="Demo" variant="warning" />}
        </HStack>
        <Text weight="semibold">{store.name}</Text>
        <Text type="supporting">
          {store.address}, {store.city}
        </Text>
        <Text type="supporting">
          {store.gstin ? `GSTIN ${store.gstin}` : 'Unregistered'} · {formatPhone(store.phone)}
        </Text>
        {!isTax && <Text type="supporting">Composition taxable person, not eligible to collect tax on supplies.</Text>}
      </VStack>
      <Divider />
      <HStack hAlign="between" wrap="wrap" gap={2}>
        <VStack gap={0.5}>
          <Text type="supporting">Invoice no. {invoice.number}</Text>
          <Text type="supporting">Date {formatDateTimeIST(invoice.createdAt)}</Text>
        </VStack>
        <VStack gap={0.5}>
          <Text type="supporting">Bill to: {invoice.customerName || 'Walk-in customer'}</Text>
          {invoice.customerPhone && <Text type="supporting">{formatPhone(invoice.customerPhone)}</Text>}
          <Text type="supporting">Place of supply: Maharashtra (27)</Text>
        </VStack>
      </HStack>
      <DataTable
        rows={items.map((i) => ({
          id: i.id,
          name: i.name,
          hsn: i.hsn,
          qty: formatQty(i.qtyMilli, i.unit),
          rate: formatINR(i.unitPricePaise),
          taxable: formatINR(i.taxablePaise),
          gst: formatRate(i.gstRateBp),
          amount: formatINR(i.totalPaise),
        }))}
        columns={[
          {key: 'name', header: 'Item'},
          {key: 'hsn', header: 'HSN'},
          {key: 'qty', header: 'Qty', align: 'end'},
          {key: 'rate', header: 'Rate', align: 'end'},
          ...(isTax ? [{key: 'gst', header: 'GST', align: 'end' as const}] : []),
          {key: 'amount', header: 'Amount', align: 'end'},
        ]}
      />
      {isTax && (
        <DataTable
          rows={summary.map((r) => ({
            id: `${r.hsn}-${r.gstRateBp}`,
            hsn: r.hsn,
            rate: formatRate(r.gstRateBp),
            taxable: formatINR(r.taxable),
            cgst: formatINR(r.cgst),
            sgst: formatINR(r.sgst),
          }))}
          columns={[
            {key: 'hsn', header: 'HSN'},
            {key: 'rate', header: 'GST rate'},
            {key: 'taxable', header: 'Taxable', align: 'end'},
            {key: 'cgst', header: 'CGST', align: 'end'},
            {key: 'sgst', header: 'SGST', align: 'end'},
          ]}
        />
      )}
      <VStack gap={1}>
        {isTax && (
          <>
            <HStack hAlign="between">
              <Text>Taxable value</Text>
              <Text>{formatINR(invoice.taxablePaise)}</Text>
            </HStack>
            <HStack hAlign="between">
              <Text>CGST</Text>
              <Text>{formatINR(invoice.cgstPaise)}</Text>
            </HStack>
            <HStack hAlign="between">
              <Text>SGST</Text>
              <Text>{formatINR(invoice.sgstPaise)}</Text>
            </HStack>
          </>
        )}
        <HStack hAlign="between">
          <Text weight="bold" size="lg">
            Total (incl. GST)
          </Text>
          <Text weight="bold" size="lg">
            {formatINR(invoice.totalPaise)}
          </Text>
        </HStack>
        <Text type="supporting">Paid by {invoice.paymentMode === 'khata' ? 'khata (credit)' : invoice.paymentMode.toUpperCase()}</Text>
      </VStack>
      {upiQr && (
        <VStack gap={1} hAlign="center">
          <VStack maxWidth="8rem" width="100%">
            <img src={upiQr} alt={`UPI QR to pay ${formatINR(invoice.totalPaise)}`} width="100%" />
          </VStack>
          <Text type="supporting">Scan to pay {store.upi}</Text>
        </VStack>
      )}
      <Text type="supporting" color="secondary" justify="center">
        Prices include GST. Thank you for shopping with us.
      </Text>
    </VStack>
  );
}
