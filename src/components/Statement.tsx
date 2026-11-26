'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Switch} from '@astryxdesign/core/Switch';
import {Table} from '@astryxdesign/core/Table';
import {CONSENT_NOTICE, formatDateIST, formatINR, type ConsentPurpose} from '@/domain';
import {api} from '@/lib/api';

interface Data {
  store: {name: string; isDemo: boolean; catalogToken: string};
  customer: {name: string};
  balance: number;
  entries: {kind: 'credit' | 'payment'; amount: number; createdAt: number; note: string; balance: number}[];
  upiLink: string | null;
  consent: Record<ConsentPurpose, boolean>;
  demoPayments: boolean;
}

export function Statement({token, data}: {token: string; data: Data}) {
  const router = useRouter();
  const [consent, setConsent] = useState(data.consent);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function toggle(purpose: ConsentPurpose, granted: boolean) {
    setError('');
    try {
      setConsent(await api(`/api/public/statements/${token}/consent`, {purpose, granted}));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function stopAll() {
    setConsent(await api(`/api/public/statements/${token}/consent`, {stop: true}));
    setMessage('You will not get any more WhatsApp messages from this shop.');
  }
  async function simulatePay() {
    setError('');
    try {
      await api(`/api/public/statements/${token}/pay`, {amount: data.balance});
      setMessage('Payment recorded. Thank you!');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Layout
      height="auto"
      contentWidth="48rem"
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={1}>Khata at {data.store.name}</Heading>
              {data.store.isDemo && <Badge label="Demo" variant="warning" />}
            </HStack>
            <Text color="secondary">Namaste {data.customer.name}</Text>
            <Card variant={data.balance > 0 ? 'yellow' : 'green'}>
              <VStack gap={2}>
                <Text type="label">{data.balance > 0 ? 'Balance due' : data.balance < 0 ? 'Advance with shop' : 'All settled'}</Text>
                <Text size="2xl" weight="bold" hasTabularNumbers>
                  {formatINR(Math.abs(data.balance))}
                </Text>
                {data.upiLink && <Button label={`Pay ${formatINR(data.balance)} by UPI`} variant="primary" size="lg" href={data.upiLink} />}
                {data.upiLink && data.demoPayments && (
                  <Button label="Simulate UPI payment success (demo)" variant="ghost" clickAction={simulatePay} />
                )}
              </VStack>
            </Card>
            {message && <Banner status="success" title={message} collapsible={false} />}
            {error && <Banner status="error" title={error} collapsible={false} />}
            <Table
              density="compact"
              idKey={(e) => `${e.createdAt}-${e.kind}-${e.amount}`}
              data={data.entries}
              columns={[
                {key: 'createdAt', header: 'Date', renderCell: (e) => formatDateIST(e.createdAt)},
                {key: 'note', header: 'Details', renderCell: (e) => (e.kind === 'credit' ? `Udhaar: ${e.note}` : `Paid: ${e.note}`)},
                {key: 'amount', header: 'Amount', align: 'end', renderCell: (e) => `${e.kind === 'credit' ? '+' : '−'}${formatINR(e.amount)}`},
                {key: 'balance', header: 'Balance', align: 'end', renderCell: (e) => formatINR(e.balance)},
              ]}
              emptyState={<Text color="secondary">No entries yet.</Text>}
            />
            <VStack gap={3}>
              <Heading level={2}>WhatsApp messages from this shop</Heading>
              <Switch label={CONSENT_NOTICE.service} value={consent.service} onChange={(v) => toggle('service', v)} />
              <Switch label={CONSENT_NOTICE.marketing} value={consent.marketing} onChange={(v) => toggle('marketing', v)} />
              <Button label="Stop all messages" variant="destructive" clickAction={stopAll} />
              <Text type="supporting" color="secondary">
                Your choices are recorded with the date and notice version, as the DPDP Act 2023 requires. The shop cannot message you for a purpose you have switched off.
              </Text>
            </VStack>
            <Button label="Order from this shop" variant="secondary" href={`/s/${data.store.catalogToken}`} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
