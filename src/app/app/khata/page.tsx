import type {Metadata} from 'next';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {formatINR, formatPhone} from '@/domain';
import {pageCtx} from '@/server/session';
import {listCustomers} from '@/server/store';
import {DataTable} from '@/components/DataTable';
import {KhataActions} from '@/components/KhataActions';

export const metadata: Metadata = {title: 'Khata and customers'};

export default async function KhataPage() {
  const ctx = await pageCtx();
  const customers = await listCustomers(ctx);
  const due = customers.filter((c) => c.balance > 0);
  const outstanding = due.reduce((a, c) => a + c.balance, 0);
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <Heading level={1}>Khata and customers</Heading>
        <KhataActions dueCount={due.length} />
      </HStack>
      <Grid columns={{minWidth: 160, max: 3}} gap={3}>
        <Card>
          <VStack gap={1}>
            <Text type="label">Udhaar outstanding</Text>
            <Text size="2xl" weight="bold">{formatINR(outstanding)}</Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="label">Customers owing</Text>
            <Text size="2xl" weight="bold">{due.length}</Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="label">Customers</Text>
            <Text size="2xl" weight="bold">{customers.length}</Text>
          </VStack>
        </Card>
      </Grid>
      <DataTable
        rows={customers.map((c) => ({
          id: c.id,
          href: `/app/khata/${c.id}`,
          name: c.name,
          phone: formatPhone(c.phone),
          balance: formatINR(c.balance),
          since: c.daysOverdue === null ? '' : `${c.daysOverdue} d`,
          khata: c.khataEnabled ? (c.creditLimit ? `On, limit ${formatINR(c.creditLimit)}` : 'On') : 'Off',
          consent: [c.consent.service ? 'Updates' : '', c.consent.marketing ? 'Offers' : ''].filter(Boolean).join(', ') || 'None',
          orders: c.orders,
        }))}
        columns={[
          {key: 'name', header: 'Customer', linkKey: 'href'},
          {key: 'phone', header: 'Mobile'},
          {key: 'balance', header: 'Balance', align: 'end'},
          {key: 'since', header: 'Since last payment', align: 'end'},
          {key: 'khata', header: 'Khata'},
          {key: 'consent', header: 'WhatsApp consent'},
          {key: 'orders', header: 'Orders', align: 'end'},
        ]}
      />
    </VStack>
  );
}
