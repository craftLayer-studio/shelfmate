import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {formatDateTimeIST, formatPhone} from '@/domain';
import {pageCtx} from '@/server/session';
import {listOutbox} from '@/server/store';
import {DataTable} from '@/components/DataTable';

export const metadata: Metadata = {title: 'Messages'};

const KIND: Record<string, string> = {order_update: 'Order update', khata_reminder: 'Khata reminder', offer: 'Offer', otp: 'Sign-in code'};

export default async function MessagesPage() {
  const ctx = await pageCtx();
  const rows = await listOutbox(ctx);
  return (
    <VStack gap={4}>
      <Heading level={1}>Messages (outbox)</Heading>
      <Banner
        status="info"
        title="Simulated WhatsApp and SMS"
        description="ShelfMate writes every outgoing message here instead of calling WhatsApp. Skipped rows show where the customer had not given consent for that purpose."
        collapsible={false}
      />
      <DataTable
        rows={rows.map((m) => ({
          id: m.id,
          time: formatDateTimeIST(m.createdAt),
          to: `${formatPhone(m.toPhone)} (${m.channel === 'sms' ? 'SMS' : 'WhatsApp'})`,
          kind: KIND[m.kind] ?? m.kind,
          status: m.status === 'sent' ? 'Sent' : `Skipped: ${m.reason}`,
          body: m.kind === 'otp' && ctx.role !== 'owner' ? 'Sign-in code (hidden)' : m.body,
        }))}
        columns={[
          {key: 'time', header: 'Time'},
          {key: 'to', header: 'To'},
          {key: 'kind', header: 'Type'},
          {key: 'status', header: 'Status'},
          {key: 'body', header: 'Message'},
        ]}
        empty="No messages yet."
      />
      <Text type="supporting" color="secondary">
        Showing the latest 60 messages.
      </Text>
    </VStack>
  );
}
