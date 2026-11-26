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
import {List, ListItem} from '@astryxdesign/core/List';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {useToast} from '@astryxdesign/core/Toast';
import {GST_RATES_BP, formatINR, formatQty, formatRate, isLoose, type Unit} from '@/domain';
import {api, parseRupees} from '@/lib/api';

type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: Unit;
  price: number;
  mrp: number;
  hsn: string;
  gstRateBp: number;
  schedule: 'none' | 'H' | 'H1' | 'X';
  trackStock: boolean;
  stockMilli: number;
  minStockMilli: number;
  active: boolean;
};
interface Data {
  products: Product[];
  lowStock: {id: string; name: string; stock: string; min: string}[];
  expiring: {id: string; productName: string; batchNo: string; expiry: string; daysLeft: number; state: string; qty: string}[];
  reorderLink: string | null;
}

type Sheet = {type: 'stock'; p: Product} | {type: 'batch'; p: Product} | {type: 'product'; p: Product | null} | null;

const qtyToMilli = (s: string, unit: Unit) => {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const m = Math.round(n * 1000);
  return m % (isLoose(unit) ? 250 : 1000) === 0 ? m : null;
};

export function Inventory({data, isOwner}: {data: Data; isOwner: boolean}) {
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState('');
  const [qty, setQty] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState({trackStock: true, active: true});
  const [error, setError] = useState('');

  const open = (s: Sheet) => {
    setError('');
    setQty('');
    setBatchNo('');
    setExpiry('');
    if (s?.type === 'product') {
      const p = s.p;
      setForm({
        name: p?.name ?? '',
        brand: p?.brand ?? '',
        category: p?.category ?? '',
        unit: p?.unit ?? 'pack',
        price: p ? String(p.price / 100) : '',
        mrp: p ? String(p.mrp / 100) : '',
        hsn: p?.hsn ?? '',
        gst: String(p?.gstRateBp ?? 500),
        schedule: p?.schedule ?? 'none',
        stock: p ? String(p.stockMilli / 1000) : '0',
        min: p ? String(p.minStockMilli / 1000) : '0',
      });
      setFlags({trackStock: p?.trackStock ?? true, active: p?.active ?? true});
    }
    setSheet(s);
  };
  const done = (msg: string) => {
    setSheet(null);
    toast({body: msg});
    router.refresh();
  };
  const fail = (e: unknown) => setError((e as Error).message);

  async function moveStock(sign: 1 | -1) {
    if (sheet?.type !== 'stock') return;
    const m = qtyToMilli(qty, sheet.p.unit);
    if (!m) return setError(isLoose(sheet.p.unit) ? 'Enter a quantity in steps of 0.25' : 'Enter a whole number');
    try {
      await api(`/api/staff/products/${sheet.p.id}/stock`, {deltaMilli: sign * m});
      done(sign > 0 ? 'Stock received' : 'Stock written off');
    } catch (e) {
      fail(e);
    }
  }
  async function addBatch() {
    if (sheet?.type !== 'batch') return;
    const m = qtyToMilli(qty, sheet.p.unit);
    if (!m) return setError('Enter a valid quantity');
    try {
      await api(`/api/staff/products/${sheet.p.id}/batches`, {batchNo, expiry, qtyMilli: m});
      done('Batch added and stock increased');
    } catch (e) {
      fail(e);
    }
  }
  async function saveProduct() {
    if (sheet?.type !== 'product') return;
    const price = parseRupees(form.price);
    const mrp = parseRupees(form.mrp);
    if (!price || !mrp) return setError('Enter price and MRP in rupees');
    const body = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      unit: form.unit,
      price,
      mrp,
      hsn: form.hsn,
      gstRateBp: Number(form.gst),
      schedule: form.schedule,
      trackStock: flags.trackStock,
      stockMilli: Math.round(Number(form.stock || 0) * 1000),
      minStockMilli: Math.round(Number(form.min || 0) * 1000),
      active: flags.active,
    };
    try {
      if (sheet.p) await api(`/api/owner/products/${sheet.p.id}`, body, 'PUT');
      else await api('/api/owner/products', body);
      done('Item saved');
    } catch (e) {
      fail(e);
    }
  }
  async function clearBatch(id: string) {
    await api(`/api/staff/batches/${id}/clear`, {});
    router.refresh();
  }

  const shown = data.products.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()));
  const field = (key: string, label: string, extra: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <TextInput label={label} value={form[key] ?? ''} onChange={(v) => setForm((f) => ({...f, [key]: v}))} {...extra} />
  );

  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <Heading level={1}>Stock</Heading>
        {isOwner && <Button label="Add item" variant="primary" onClick={() => open({type: 'product', p: null})} />}
      </HStack>
      <Grid columns={{minWidth: 300, max: 2}} gap={4} align="start">
        <Card variant={data.lowStock.length ? 'orange' : 'default'}>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={2}>Low stock ({data.lowStock.length})</Heading>
              {data.reorderLink && <Button label="Reorder on WhatsApp" size="sm" href={data.reorderLink} target="_blank" rel="noopener noreferrer" />}
            </HStack>
            <List density="compact" edge="flush">
              {data.lowStock.map((p) => (
                <ListItem key={p.id} label={p.name} endContent={<Text type="supporting">{p.stock} left (min {p.min})</Text>} />
              ))}
            </List>
            {data.lowStock.length === 0 && <Text color="secondary">All tracked items are above their minimum.</Text>}
          </VStack>
        </Card>
        <Card variant={data.expiring.length ? 'red' : 'default'}>
          <VStack gap={2}>
            <Heading level={2}>Expiry in 30 days ({data.expiring.length})</Heading>
            <List density="compact" edge="flush">
              {data.expiring.map((b) => (
                <ListItem
                  key={b.id}
                  label={`${b.productName} (batch ${b.batchNo})`}
                  description={`${b.qty} · ${b.state === 'expired' ? `expired ${-b.daysLeft} d ago` : b.daysLeft === 0 ? 'expires today' : `expires in ${b.daysLeft} d`} (${b.expiry})`}
                  endContent={<Button label="Cleared" size="sm" variant="ghost" clickAction={() => clearBatch(b.id)} />}
                />
              ))}
            </List>
            {data.expiring.length === 0 && <Text color="secondary">Nothing expires in the next 30 days.</Text>}
          </VStack>
        </Card>
      </Grid>
      <TextInput label="Search items" isLabelHidden placeholder="Search items" value={query} onChange={setQuery} type="search" startIcon="search" hasClear />
      <List hasDividers density="compact" edge="flush">
        {shown.map((p) => (
          <ListItem
            key={p.id}
            label={p.active ? p.name : `${p.name} (hidden)`}
            description={`${formatINR(p.price)} · HSN ${p.hsn} · GST ${formatRate(p.gstRateBp)}${p.schedule !== 'none' ? ` · Sch. ${p.schedule}` : ''}`}
            endContent={
              <HStack gap={2} vAlign="center">
                {p.trackStock && <Badge label={formatQty(p.stockMilli, p.unit)} variant={p.stockMilli <= p.minStockMilli ? 'warning' : 'neutral'} />}
                <Button label={`Update ${p.name}`} size="sm" onClick={() => open({type: 'stock', p})}>
                  Update
                </Button>
              </HStack>
            }
          />
        ))}
      </List>
      <BottomSheet isOpen={sheet !== null} onOpenChange={(o) => !o && setSheet(null)} label="Stock action" purpose="form" padding={4}>
        <VStack gap={3}>
          {sheet?.type === 'stock' && (
            <>
              <Heading level={2}>{sheet.p.name}</Heading>
              <Text color="secondary">In stock: {formatQty(sheet.p.stockMilli, sheet.p.unit)}</Text>
              <TextInput label={`Quantity (${sheet.p.unit})`} inputMode="decimal" value={qty} onChange={setQty} />
              {error && <Banner status="error" title={error} collapsible={false} />}
              <HStack gap={2}>
                <Button label="Received" variant="primary" clickAction={() => moveStock(1)} />
                <Button label="Write off" variant="destructive" clickAction={() => moveStock(-1)} />
              </HStack>
              <HStack gap={2}>
                <Button label="Add batch with expiry" variant="ghost" onClick={() => open({type: 'batch', p: sheet.p})} />
                {isOwner && <Button label="Edit item" variant="ghost" onClick={() => open({type: 'product', p: sheet.p})} />}
              </HStack>
            </>
          )}
          {sheet?.type === 'batch' && (
            <>
              <Heading level={2}>New batch: {sheet.p.name}</Heading>
              <TextInput label="Batch number" value={batchNo} onChange={setBatchNo} />
              <TextInput label="Expiry date (YYYY-MM-DD)" value={expiry} onChange={setExpiry} placeholder="2027-03-31" />
              <TextInput label={`Quantity (${sheet.p.unit})`} inputMode="decimal" value={qty} onChange={setQty} />
              {error && <Banner status="error" title={error} collapsible={false} />}
              <Button label="Add batch" variant="primary" clickAction={addBatch} />
            </>
          )}
          {sheet?.type === 'product' && (
            <>
              <Heading level={2}>{sheet.p ? 'Edit item' : 'Add item'}</Heading>
              {field('name', 'Name')}
              {field('brand', 'Brand', {isOptional: true})}
              {field('category', 'Category', {placeholder: 'Atta, rice & dal'})}
              <Selector label="Unit" options={[{value: 'pack', label: 'Pack'}, {value: 'pc', label: 'Piece'}, {value: 'kg', label: 'Kg (loose)'}, {value: 'l', label: 'Litre (loose)'}]} value={form.unit} onChange={(v) => setForm((f) => ({...f, unit: v ?? 'pack'}))} />
              <HStack gap={2}>
                {field('price', 'Price ₹ (incl. GST)', {inputMode: 'decimal'})}
                {field('mrp', 'MRP ₹', {inputMode: 'decimal'})}
              </HStack>
              <HStack gap={2}>
                {field('hsn', 'HSN code', {inputMode: 'numeric'})}
                <Selector label="GST rate" options={GST_RATES_BP.map((r) => ({value: String(r), label: formatRate(r)}))} value={form.gst} onChange={(v) => setForm((f) => ({...f, gst: v ?? '500'}))} />
              </HStack>
              <Selector
                label="Drug schedule"
                options={[{value: 'none', label: 'Not a scheduled drug'}, {value: 'H', label: 'Schedule H (counter only)'}, {value: 'H1', label: 'Schedule H1 (counter only)'}, {value: 'X', label: 'Schedule X (counter only)'}]}
                value={form.schedule}
                onChange={(v) => setForm((f) => ({...f, schedule: v ?? 'none'}))}
              />
              <Switch label="Track stock" value={flags.trackStock} onChange={(v) => setFlags((f) => ({...f, trackStock: v}))} />
              <HStack gap={2}>
                {field('stock', 'Stock now', {inputMode: 'decimal'})}
                {field('min', 'Minimum stock', {inputMode: 'decimal'})}
              </HStack>
              <Switch label="Show in QR catalog and billing" value={flags.active} onChange={(v) => setFlags((f) => ({...f, active: v}))} />
              {error && <Banner status="error" title={error} collapsible={false} />}
              <Button label="Save item" variant="primary" clickAction={saveProduct} />
            </>
          )}
        </VStack>
      </BottomSheet>
    </VStack>
  );
}
