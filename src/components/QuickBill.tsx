'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {List, ListItem} from '@astryxdesign/core/List';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {computeInvoice, formatINR, formatQty, formatRate, normalizeIndianPhone, qtyStep, type Unit} from '@/domain';
import {api} from '@/lib/api';

interface P {
  id: string;
  name: string;
  unit: Unit;
  price: number;
  hsn: string;
  gstRateBp: number;
  stockMilli: number | null;
  schedule: string;
}

export function QuickBill({products}: {products: P[]}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Record<string, number>>({});
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('cash');
  const [error, setError] = useState('');
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = query ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : products.slice(0, 8);
  const entries = Object.entries(lines).filter(([, q]) => q > 0);
  const preview = computeInvoice(
    entries.map(([id, q]) => {
      const p = byId.get(id)!;
      return {name: p.name, hsn: p.hsn, qtyMilli: q, unitPrice: p.price, gstRateBp: p.gstRateBp};
    }),
    {composition: false},
  );
  const change = (p: P, dir: 1 | -1) => setLines((l) => ({...l, [p.id]: Math.max(0, (l[p.id] ?? 0) + dir * qtyStep(p.unit))}));

  async function createBill() {
    setError('');
    const e164 = phone ? normalizeIndianPhone(phone) : null;
    if (phone && !e164) return setError('Enter a valid 10-digit mobile or leave it empty for walk-in.');
    if (mode === 'khata' && !e164) return setError('Khata bills need the customer mobile number.');
    try {
      const r = await api<{id: string}>('/api/staff/bills', {
        lines: entries.map(([productId, qtyMilli]) => ({productId, qtyMilli})),
        paymentMode: mode,
        customerPhone: e164 ?? '',
        customerName: name,
      });
      router.push(`/app/invoices/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Grid columns={{minWidth: 300, max: 2}} gap={4} align="start">
      <VStack gap={3}>
        <Heading level={1}>Quick bill</Heading>
        <TextInput label="Find item" isLabelHidden placeholder="Type to search items" value={query} onChange={setQuery} type="search" startIcon="search" hasClear />
        <List hasDividers density="compact" edge="flush">
          {matches.map((p) => (
            <ListItem
              key={p.id}
              label={p.name}
              description={`${formatINR(p.price)} · HSN ${p.hsn} · GST ${formatRate(p.gstRateBp)}${p.stockMilli !== null ? ` · ${formatQty(p.stockMilli, p.unit)} in stock` : ''}`}
              endContent={
                <HStack gap={1} vAlign="center">
                  {p.schedule !== 'none' && <Badge label={`Sch. ${p.schedule}`} variant="red" />}
                  <Button label={`Add ${p.name}`} size="sm" onClick={() => change(p, 1)}>
                    Add
                  </Button>
                </HStack>
              }
            />
          ))}
        </List>
      </VStack>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>This bill</Heading>
          {entries.length === 0 && <Text color="secondary">Tap Add on items to start a bill.</Text>}
          <List density="compact" edge="flush">
            {entries.map(([id, q]) => {
              const p = byId.get(id)!;
              return (
                <ListItem
                  key={id}
                  label={p.name}
                  description={`${formatQty(q, p.unit)} × ${formatINR(p.price)}`}
                  endContent={
                    <HStack gap={1} vAlign="center">
                      <Button label={`Less ${p.name}`} size="sm" onClick={() => change(p, -1)}>
                        −
                      </Button>
                      <Button label={`More ${p.name}`} size="sm" onClick={() => change(p, 1)}>
                        +
                      </Button>
                    </HStack>
                  }
                />
              );
            })}
          </List>
          {entries.length > 0 && (
            <VStack gap={1}>
              <HStack hAlign="between">
                <Text type="supporting">Taxable value</Text>
                <Text type="supporting">{formatINR(preview.taxable)}</Text>
              </HStack>
              <HStack hAlign="between">
                <Text type="supporting">CGST + SGST</Text>
                <Text type="supporting">{formatINR(preview.cgst + preview.sgst)}</Text>
              </HStack>
              <HStack hAlign="between">
                <Text weight="bold">Total</Text>
                <Text weight="bold">{formatINR(preview.total)}</Text>
              </HStack>
            </VStack>
          )}
          <TextInput label="Customer mobile" isOptional type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="Leave empty for walk-in" />
          <TextInput label="Customer name" isOptional value={name} onChange={setName} />
          <SegmentedControl label="Payment" value={mode} onChange={setMode} layout="fill">
            <SegmentedControlItem value="cash" label="Cash" />
            <SegmentedControlItem value="upi" label="UPI" />
            <SegmentedControlItem value="khata" label="Khata" />
          </SegmentedControl>
          {error && <Banner status="error" title={error} collapsible={false} />}
          <Button label={`Create bill${entries.length ? `, ${formatINR(preview.total)}` : ''}`} variant="primary" size="lg" isDisabled={entries.length === 0} clickAction={createBill} />
        </VStack>
      </Card>
    </Grid>
  );
}
