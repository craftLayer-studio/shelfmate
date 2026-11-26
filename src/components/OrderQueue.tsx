'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Link} from '@astryxdesign/core/Link';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {useToast} from '@astryxdesign/core/Toast';
import {PAYMENT_LABELS, formatDateTimeIST, formatINR, formatPhone, formatTimeIST, nextStatuses, primaryAction, type Fulfilment, type OrderStatus, type PaymentMode} from '@/domain';
import {api} from '@/lib/api';

export interface QueueOrder {
  id: string;
  number: number;
  status: OrderStatus;
  statusLabel: string;
  open: boolean;
  fulfilment: Fulfilment;
  slotStart: number;
  slotEnd: number;
  address: string;
  note: string;
  paymentMode: PaymentMode;
  paid: boolean;
  total: number;
  invoiceId: string | null;
  createdAt: number;
  customer: {id: string; name: string; phone: string};
  items: {name: string; qty: string; amount: number}[];
}

const STATUS_VARIANT: Record<OrderStatus, 'info' | 'warning' | 'success' | 'error' | 'neutral' | 'blue'> = {
  placed: 'warning',
  accepted: 'blue',
  packed: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export function OrderQueue({orders}: {orders: QueueOrder[]}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState('open');
  const shown = orders.filter((o) => (view === 'open' ? o.open : !o.open));
  const newCount = orders.filter((o) => o.status === 'placed').length;

  async function move(o: QueueOrder, to: OrderStatus) {
    try {
      await api(`/api/staff/orders/${o.id}/status`, {to});
      router.refresh();
    } catch (e) {
      toast({body: (e as Error).message, type: 'error'});
    }
  }
  async function markPaid(o: QueueOrder) {
    try {
      await api(`/api/staff/orders/${o.id}/paid`, {});
      router.refresh();
    } catch (e) {
      toast({body: (e as Error).message, type: 'error'});
    }
  }

  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <HStack gap={2} vAlign="center">
          <Heading level={1}>Orders</Heading>
          {newCount > 0 && <Badge label={`${newCount} new`} variant="warning" />}
        </HStack>
        <SegmentedControl label="Show" value={view} onChange={setView} size="sm">
          <SegmentedControlItem value="open" label={`Open (${orders.filter((o) => o.open).length})`} />
          <SegmentedControlItem value="done" label="Done today" />
        </SegmentedControl>
      </HStack>
      <Text type="supporting" color="secondary">
        Updates every few seconds. Each status change sends the customer a WhatsApp update if they agreed to order updates.
      </Text>
      {shown.length === 0 && (
        <EmptyState title={view === 'open' ? 'No open orders' : 'Nothing finished yet today'} description="New QR orders appear here on their own." />
      )}
      <Grid columns={{minWidth: 300, max: 3, repeat: 'fill'}} gap={3}>
        {shown.map((o) => {
          const primary = primaryAction(o.status, o.fulfilment);
          const canCancel = nextStatuses(o.status, o.fulfilment).includes('cancelled');
          return (
            <Card key={o.id}>
              <VStack gap={2}>
                <HStack hAlign="between" vAlign="center">
                  <Text weight="bold">#{o.number}</Text>
                  <Badge label={o.statusLabel} variant={STATUS_VARIANT[o.status]} />
                </HStack>
                <VStack gap={0.5}>
                  <Link href={`/app/khata/${o.customer.id}`}>{o.customer.name}</Link>
                  <Link href={`tel:${o.customer.phone}`} color="secondary">
                    {formatPhone(o.customer.phone)}
                  </Link>
                </VStack>
                <Text type="supporting">
                  {o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} · {formatDateTimeIST(o.slotStart)} to {formatTimeIST(o.slotEnd)}
                </Text>
                {o.address && <Text type="supporting" color="secondary">{o.address}</Text>}
                {o.note && <Text type="supporting">Note: {o.note}</Text>}
                <VStack gap={0.5}>
                  {o.items.map((i, k) => (
                    <HStack key={k} hAlign="between" gap={2}>
                      <Text type="supporting">
                        {i.name} × {i.qty}
                      </Text>
                      <Text type="supporting" hasTabularNumbers>
                        {formatINR(i.amount)}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
                <HStack hAlign="between" vAlign="center">
                  <Text weight="semibold">{formatINR(o.total)}</Text>
                  <Badge
                    label={o.paymentMode === 'khata' ? 'Khata' : o.paid ? `${PAYMENT_LABELS[o.paymentMode]}: paid` : `${PAYMENT_LABELS[o.paymentMode]}: to collect`}
                    variant={o.paymentMode === 'khata' ? 'purple' : o.paid ? 'success' : 'neutral'}
                  />
                </HStack>
                <HStack gap={2} wrap="wrap">
                  {primary && <Button label={primary.label} variant="primary" clickAction={() => move(o, primary.to)} />}
                  {o.paymentMode === 'upi' && !o.paid && o.status !== 'cancelled' && <Button label="UPI received" clickAction={() => markPaid(o)} />}
                  {canCancel && <Button label="Cancel" variant="ghost" clickAction={() => move(o, 'cancelled')} />}
                  {o.invoiceId && <Button label="Invoice" variant="ghost" href={`/app/invoices/${o.invoiceId}`} />}
                </HStack>
              </VStack>
            </Card>
          );
        })}
      </Grid>
    </VStack>
  );
}
