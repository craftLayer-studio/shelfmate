'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Table} from '@astryxdesign/core/Table';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Switch} from '@astryxdesign/core/Switch';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {useToast} from '@astryxdesign/core/Toast';
import {formatDateIST, formatDateTimeIST, formatINR, formatPhone, type ConsentPurpose} from '@/domain';
import {api, parseRupees} from '@/lib/api';

interface Data {
  customer: {id: string; name: string; phone: string; address: string; khataEnabled: boolean; creditLimit: number; statementUrl: string};
  balance: number;
  daysOverdue: number | null;
  ledger: {id: string; kind: 'credit' | 'payment'; amount: number; createdAt: number; note: string; method: string; invoiceId: string | null; balance: number}[];
  consent: Record<ConsentPurpose, boolean>;
  consentLog: {purpose: string; granted: boolean; channel: string; noticeVersion: string; createdAt: number}[];
  messages: {id: string; kind: string; body: string; status: string; reason: string | null; createdAt: number}[];
}

export function CustomerDetail({data}: {data: Data}) {
  const router = useRouter();
  const toast = useToast();
  const c = data.customer;
  const [kind, setKind] = useState('credit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [limit, setLimit] = useState(c.creditLimit ? String(c.creditLimit / 100) : '');
  const [error, setError] = useState('');
  const base = `/api/staff/customers/${c.id}`;

  async function addEntry() {
    setError('');
    const paise = parseRupees(amount);
    if (!paise) return setError('Enter an amount in rupees.');
    try {
      await api(`${base}/entries`, {kind, amount: paise, method, note});
      setAmount('');
      setNote('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remind() {
    try {
      const r = await api<{sent: boolean; reason?: string}>(`${base}/remind`, {});
      toast({body: r.sent ? 'Reminder sent on WhatsApp (simulated). See Messages.' : `Not sent: ${r.reason}`, type: r.sent ? 'info' : 'error'});
      router.refresh();
    } catch (e) {
      toast({body: (e as Error).message, type: 'error'});
    }
  }
  async function saveKhata(enabled: boolean) {
    const creditLimit = limit ? parseRupees(limit) : 0;
    if (creditLimit === null) return setError('Credit limit must be an amount in rupees.');
    await api(base, {khataEnabled: enabled, creditLimit}, 'PATCH');
    router.refresh();
  }
  async function consent(purpose: ConsentPurpose | 'stop', granted: boolean) {
    await api(`${base}/consent`, {purpose, granted});
    router.refresh();
  }

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Link href="/app/khata">All customers</Link>
        <Heading level={1}>{c.name}</Heading>
        <Text color="secondary">
          {formatPhone(c.phone)}
          {c.address ? ` · ${c.address}` : ''}
        </Text>
      </VStack>
      <Grid columns={{minWidth: 300, max: 2}} gap={4} align="start">
        <VStack gap={4}>
          <Card variant={data.balance > 0 ? 'yellow' : 'default'}>
            <VStack gap={2}>
              <Text type="label">{data.balance >= 0 ? 'Balance due' : 'Advance'}</Text>
              <Text size="2xl" weight="bold">{formatINR(Math.abs(data.balance))}</Text>
              {data.daysOverdue !== null && <Text type="supporting">{data.daysOverdue} days since last payment</Text>}
              <HStack gap={2} wrap="wrap">
                <Button label="Send WhatsApp reminder" variant="primary" clickAction={remind} isDisabled={data.balance <= 0} />
                <Button label="Statement link" variant="ghost" href={c.statementUrl} target="_blank" />
              </HStack>
            </VStack>
          </Card>
          <Card>
            <VStack gap={3}>
              <Heading level={2}>Add entry</Heading>
              <SegmentedControl label="Entry type" value={kind} onChange={setKind} layout="fill">
                <SegmentedControlItem value="credit" label="Gave udhaar" />
                <SegmentedControlItem value="payment" label="Got payment" />
              </SegmentedControl>
              <TextInput label="Amount in ₹" inputMode="decimal" value={amount} onChange={setAmount} />
              {kind === 'payment' && (
                <SegmentedControl label="Paid by" value={method} onChange={setMethod} size="sm">
                  <SegmentedControlItem value="cash" label="Cash" />
                  <SegmentedControlItem value="upi" label="UPI" />
                </SegmentedControl>
              )}
              <TextInput label="Note" value={note} onChange={setNote} isOptional placeholder="Milk and bread" />
              {error && <Banner status="error" title={error} collapsible={false} />}
              <Button label="Save entry" clickAction={addEntry} />
            </VStack>
          </Card>
          <Card>
            <VStack gap={3}>
              <Heading level={2}>Khata settings</Heading>
              <Switch label="Khata (credit) allowed" value={c.khataEnabled} onChange={(v) => saveKhata(v)} />
              <HStack gap={2} vAlign="end">
                <TextInput label="Credit limit in ₹" inputMode="decimal" value={limit} onChange={setLimit} description="Empty means no limit" />
                <Button label="Save limit" clickAction={() => saveKhata(c.khataEnabled)} />
              </HStack>
            </VStack>
          </Card>
          <Card>
            <VStack gap={3}>
              <Heading level={2}>WhatsApp consent</Heading>
              <Switch label="Order updates and payment reminders" value={data.consent.service} onChange={(v) => consent('service', v)} />
              <Switch label="Offers and new stock" value={data.consent.marketing} onChange={(v) => consent('marketing', v)} />
              <Button label="Customer replied STOP" variant="destructive" size="sm" clickAction={() => consent('stop', false)} />
              <List density="compact" edge="flush" header={<Text type="label">Consent log</Text>}>
                {data.consentLog.map((r, i) => (
                  <ListItem
                    key={i}
                    label={`${r.purpose === 'service' ? 'Updates' : 'Offers'}: ${r.granted ? 'opted in' : 'opted out'}`}
                    description={`${formatDateTimeIST(r.createdAt)} · via ${r.channel} · notice ${r.noticeVersion}`}
                  />
                ))}
              </List>
            </VStack>
          </Card>
        </VStack>
        <VStack gap={4}>
          <Heading level={2}>Ledger</Heading>
          <Table
            density="compact"
            idKey="id"
            data={data.ledger}
            columns={[
              {key: 'createdAt', header: 'Date', renderCell: (e) => formatDateIST(e.createdAt)},
              {
                key: 'note',
                header: 'Entry',
                renderCell: (e) => (e.invoiceId ? <Link href={`/app/invoices/${e.invoiceId}`}>{e.note}</Link> : e.note || (e.kind === 'credit' ? 'Udhaar' : `Payment (${e.method})`)),
              },
              {key: 'amount', header: 'Amount', align: 'end', renderCell: (e) => <Badge label={`${e.kind === 'credit' ? '+' : '−'}${formatINR(e.amount)}`} variant={e.kind === 'credit' ? 'orange' : 'green'} />},
              {key: 'balance', header: 'Balance', align: 'end', renderCell: (e) => formatINR(e.balance)},
            ]}
            emptyState={<Text color="secondary">No khata entries yet.</Text>}
          />
          <Heading level={2}>Recent messages</Heading>
          <List hasDividers density="compact" edge="flush">
            {data.messages.map((m) => (
              <ListItem
                key={m.id}
                label={m.body}
                description={`${formatDateTimeIST(m.createdAt)} · ${m.status === 'sent' ? 'sent (simulated)' : `skipped: ${m.reason}`}`}
              />
            ))}
          </List>
          {data.messages.length === 0 && <Text color="secondary">No messages yet.</Text>}
        </VStack>
      </Grid>
    </VStack>
  );
}
