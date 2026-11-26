import type {Metadata} from 'next';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Button} from '@astryxdesign/core/Button';
import {formatDateIST, formatINR, formatQty} from '@/domain';
import {pageCtx} from '@/server/session';
import {getDashboard} from '@/server/store';
import {DataTable} from '@/components/DataTable';

export const metadata: Metadata = {title: 'Dashboard'};

function Tile({label, value, note}: {label: string; value: string; note?: string}) {
  return (
    <Card>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <Text size="2xl" weight="bold" hasTabularNumbers>
          {value}
        </Text>
        {note && <Text type="supporting">{note}</Text>}
      </VStack>
    </Card>
  );
}

export default async function DashboardPage() {
  const ctx = await pageCtx('owner');
  const d = await getDashboard(ctx);
  const maxDay = Math.max(1, ...d.daily.map((x) => x.total));
  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <Heading level={1}>Dashboard</Heading>
        <Button label="Print QR standee" href="/app/qr" />
      </HStack>
      <Grid columns={{minWidth: 160, max: 4}} gap={3}>
        <Tile label="Sales today" value={formatINR(d.salesToday)} note={`${d.billsToday} bills and orders, ${d.qrOrdersToday} by QR`} />
        <Tile label="Sales this month" value={formatINR(d.salesThisMonth)} note={`Average basket today ${formatINR(d.avgBasket)}`} />
        <Tile label="Udhaar outstanding" value={formatINR(d.creditOutstanding)} note={`${d.remindersSent30d} reminders sent in 30 days`} />
        <Tile label="Udhaar recovered this month" value={formatINR(d.recoveredThisMonth)} />
        <Tile label="Repeat customers (30 days)" value={String(d.repeatCustomers)} note={`of ${d.activeCustomers} who bought`} />
      </Grid>
      <Grid columns={{minWidth: 300, max: 2}} gap={4} align="start">
        <Card>
          <VStack gap={3}>
            <Heading level={2}>Last 7 days</Heading>
            {d.daily.map((x) => (
              <VStack key={x.day} gap={0.5}>
                <HStack hAlign="between">
                  <Text type="supporting">{formatDateIST(x.day)}</Text>
                  <Text type="supporting" hasTabularNumbers>
                    {formatINR(x.total)}
                  </Text>
                </HStack>
                <ProgressBar label={`Sales on ${formatDateIST(x.day)}`} isLabelHidden value={(x.total / maxDay) * 100} />
              </VStack>
            ))}
          </VStack>
        </Card>
        <VStack gap={2}>
          <Heading level={2}>Top items (30 days)</Heading>
          <DataTable
            rows={d.topItems.map((i) => ({id: i.productId, name: i.name, qty: formatQty(i.qtyMilli, 'pc').replace(' pc', ''), amount: formatINR(i.amount)}))}
            columns={[
              {key: 'name', header: 'Item'},
              {key: 'qty', header: 'Units', align: 'end'},
              {key: 'amount', header: 'Sales', align: 'end'},
            ]}
          />
          <Heading level={2}>Offer results</Heading>
          <DataTable
            rows={d.campaigns.map((c) => ({id: c.id, date: formatDateIST(c.createdAt), message: c.message, sent: c.sent, orders: c.orders, revenue: formatINR(c.revenue)}))}
            columns={[
              {key: 'date', header: 'Sent on'},
              {key: 'message', header: 'Offer'},
              {key: 'sent', header: 'Sent', align: 'end'},
              {key: 'orders', header: 'Orders after', align: 'end'},
              {key: 'revenue', header: 'Sales', align: 'end'},
            ]}
            empty="No offers sent yet. Use the Offers tab."
          />
        </VStack>
      </Grid>
      <Text type="supporting" color="secondary">
        Sales count counter bills and QR orders that were not cancelled. Times are India Standard Time.
      </Text>
    </VStack>
  );
}
