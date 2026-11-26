'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {List, ListItem} from '@astryxdesign/core/List';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Divider} from '@astryxdesign/core/Divider';
import {CONSENT_NOTICE, formatINR, formatQty, lineAmount, normalizeIndianPhone, qtyStep, type Unit} from '@/domain';
import {api} from '@/lib/api';
import styles from './shell.module.css';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: Unit;
  price: number;
  mrp: number;
  available: boolean;
}

interface Data {
  store: {name: string; address: string; city: string; isDemo: boolean; deliveryRadiusKm: number; minOrder: number; upi: string};
  products: Product[];
  slots: {start: number; end: number; label: string}[];
}

export function Storefront({token, data}: {token: string; data: Data}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('delivery');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [slot, setSlot] = useState<string | undefined>(data.slots[0] ? String(data.slots[0].start) : undefined);
  const [payment, setPayment] = useState('upi');
  const [note, setNote] = useState('');
  const [consentService, setConsentService] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const byId = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);
  const categories = useMemo(() => ['All', ...new Set(data.products.map((p) => p.category))], [data.products]);
  const visible = data.products.filter(
    (p) => (category === 'All' || p.category === category) && (!query || `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())),
  );
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + lineAmount(byId.get(id)!.price, q), 0);
  const count = lines.length;

  const change = (p: Product, dir: 1 | -1) =>
    setCart((c) => ({...c, [p.id]: Math.max(0, (c[p.id] ?? 0) + dir * qtyStep(p.unit))}));

  async function placeOrder() {
    setError('');
    const e164 = normalizeIndianPhone(phone);
    if (!name.trim()) return setError('Please enter your name.');
    if (!e164) return setError('Please enter a 10-digit mobile number.');
    if (fulfilment === 'delivery' && address.trim().length < 5) return setError('Please enter your delivery address.');
    if (!slot) return setError('Please pick a time slot.');
    setIsSending(true);
    try {
      const res = await api<{token: string}>(`/api/public/stores/${token}/orders`, {
        name,
        phone: e164,
        address,
        fulfilment,
        slotStart: Number(slot),
        paymentMode: payment,
        note,
        lines: lines.map(([productId, qtyMilli]) => ({productId, qtyMilli})),
        consentService,
        consentMarketing,
      });
      router.push(`/o/${res.token}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      setIsSending(false);
    }
  }

  const stepper = (p: Product) => {
    const q = cart[p.id] ?? 0;
    if (!p.available) return <Badge label="Out of stock" variant="neutral" />;
    if (q === 0) return <Button label="Add" size="sm" variant="primary" onClick={() => change(p, 1)} />;
    return (
      <HStack gap={1} vAlign="center">
        <Button label={`Less ${p.name}`} size="sm" onClick={() => change(p, -1)}>−</Button>
        <Text weight="semibold" hasTabularNumbers>
          {formatQty(q, p.unit)}
        </Text>
        <Button label={`More ${p.name}`} size="sm" onClick={() => change(p, 1)}>+</Button>
      </HStack>
    );
  };

  return (
    <Layout
      height="auto"
      contentWidth="48rem"
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          <VStack gap={4}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Heading level={1}>{data.store.name}</Heading>
                {data.store.isDemo && <Badge label="Demo" variant="warning" />}
              </HStack>
              <Text type="supporting" color="secondary">
                {data.store.address}, {data.store.city}
              </Text>
              <Text type="supporting" color="secondary">
                Home delivery within {data.store.deliveryRadiusKm} km or pickup. Pay by UPI, cash or khata. No app needed.
                {data.store.minOrder > 0 ? ` Minimum order ${formatINR(data.store.minOrder)}.` : ''}
              </Text>
            </VStack>

            <TextInput label="Search items" isLabelHidden placeholder="Search atta, milk, soap…" value={query} onChange={setQuery} type="search" startIcon="search" hasClear />
            <TabList value={category} onChange={setCategory} size="sm" hasDivider>
              {categories.map((c) => (
                <Tab key={c} value={c} label={c} />
              ))}
            </TabList>

            <List hasDividers density="compact" edge="flush">
              {visible.map((p) => (
                <ListItem
                  key={p.id}
                  label={p.name}
                  description={
                    <Text type="supporting" color="secondary">
                      {formatINR(p.price)} / {p.unit === 'kg' || p.unit === 'l' ? p.unit : p.unit === 'pc' ? 'piece' : 'pack'}
                      {p.mrp > p.price ? ` · MRP ${formatINR(p.mrp)}` : ''}
                      {p.brand ? ` · ${p.brand}` : ''}
                    </Text>
                  }
                  endContent={stepper(p)}
                />
              ))}
            </List>
            {visible.length === 0 && <Text color="secondary">No items match your search.</Text>}
            <Text type="supporting" color="secondary" justify="center">
              Prescription medicines are sold at the counter only. Powered by ShelfMate.
            </Text>
          </VStack>
          {count > 0 && (
            <VStack className={styles.cartBar}>
              <Button
                variant="primary"
                size="lg"
                width="100%"
                label={`View cart: ${count} item${count > 1 ? 's' : ''}, ${formatINR(total)}`}
                onClick={() => setIsOpen(true)}
              />
            </VStack>
          )}
          <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen} label="Your order" purpose="form" height="tall" padding={4}>
            <VStack gap={4}>
              <Heading level={2}>Your order</Heading>
              <List density="compact" edge="flush">
                {lines.map(([id, q]) => {
                  const p = byId.get(id)!;
                  return <ListItem key={id} label={p.name} description={`${formatQty(q, p.unit)} × ${formatINR(p.price)}`} endContent={stepper(p)} />;
                })}
              </List>
              <HStack hAlign="between">
                <Text weight="semibold">Total</Text>
                <Text weight="bold" hasTabularNumbers>
                  {formatINR(total)}
                </Text>
              </HStack>
              <Divider />
              <SegmentedControl label="Delivery or pickup" value={fulfilment} onChange={(v) => setFulfilment(v as 'delivery' | 'pickup')} layout="fill">
                <SegmentedControlItem value="delivery" label="Home delivery" />
                <SegmentedControlItem value="pickup" label="Pickup from shop" />
              </SegmentedControl>
              <TextInput label="Your name" value={name} onChange={setName} autoComplete="name" isRequired />
              <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="98765 43210" autoComplete="tel" isRequired />
              {fulfilment === 'delivery' && <TextArea label="Delivery address" value={address} onChange={setAddress} placeholder="Flat, building, lane, landmark" isRequired />}
              <Selector
                label={fulfilment === 'delivery' ? 'Delivery slot' : 'Pickup slot'}
                options={data.slots.map((s) => ({value: String(s.start), label: s.label}))}
                value={slot}
                onChange={(v) => setSlot(v ?? undefined)}
                presentation="adaptive"
                emptyText="No slots left today or tomorrow"
              />
              <RadioList label="Payment" value={payment} onChange={setPayment}>
                <RadioListItem value="upi" label="UPI" description="Pay with any UPI app after placing the order" />
                <RadioListItem value="cod" label={fulfilment === 'delivery' ? 'Cash on delivery' : 'Cash at pickup'} />
                <RadioListItem value="khata" label="Add to my khata" description="Only if the shop has opened a khata for your number" />
              </RadioList>
              <TextInput label="Note for the shop" value={note} onChange={setNote} isOptional placeholder="Substitutes OK, ring the bell…" />
              <VStack gap={2}>
                <Text type="label">WhatsApp messages (optional)</Text>
                <CheckboxInput label={CONSENT_NOTICE.service} value={consentService} onChange={setConsentService} />
                <CheckboxInput label={CONSENT_NOTICE.marketing} value={consentMarketing} onChange={setConsentMarketing} />
                <Text type="supporting" color="secondary">
                  Your number is used by {data.store.name} to deliver this order. Ticking a box lets the shop message you for that purpose only. Reply STOP anytime to opt out.
                </Text>
              </VStack>
              {error && <Banner status="error" title={error} />}
              <Button label={`Place order, ${formatINR(total)}`} variant="primary" size="lg" isLoading={isSending} onClick={placeOrder} isDisabled={count === 0} />
            </VStack>
          </BottomSheet>
        </LayoutContent>
      }
    />
  );
}
