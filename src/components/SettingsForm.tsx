'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Switch} from '@astryxdesign/core/Switch';
import {Selector} from '@astryxdesign/core/Selector';
import {formatPhone, minuteLabel, normalizeIndianPhone} from '@/domain';
import {api, parseRupees} from '@/lib/api';

interface S {
  name: string;
  address: string;
  city: string;
  whatsappPhone: string;
  upiVpa: string;
  gstin: string;
  composition: boolean;
  deliveryRadiusKm: number;
  minOrder: number;
  openMinute: number;
  closeMinute: number;
  slotMinutes: number;
}

const HOURS = Array.from({length: 49}, (_, i) => i * 30).map((m) => ({value: String(m), label: minuteLabel(m === 1440 ? 1439 : m)}));

export function SettingsForm({initial, catalogUrl, staff}: {initial: S; catalogUrl: string; staff: {id: string; name: string; phone: string; role: string}[]}) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [minOrder, setMinOrder] = useState(String(initial.minOrder / 100));
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({...x, [k]: v}));

  async function save() {
    setMsg(null);
    const wa = normalizeIndianPhone(s.whatsappPhone);
    const min = parseRupees(minOrder || '0');
    if (!wa) return setMsg({ok: false, text: 'Enter a valid WhatsApp number'});
    if (min === null) return setMsg({ok: false, text: 'Minimum order must be an amount'});
    try {
      await api('/api/owner/settings', {...s, whatsappPhone: wa, minOrder: min}, 'PUT');
      setMsg({ok: true, text: 'Saved'});
      router.refresh();
    } catch (e) {
      setMsg({ok: false, text: (e as Error).message});
    }
  }

  return (
    <VStack gap={4} maxWidth="44rem">
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <Heading level={1}>Settings</Heading>
        <Button label="Print QR standee" variant="primary" href="/app/qr" />
      </HStack>
      <Text type="supporting">
        Your catalog link: <Link href={catalogUrl}>{catalogUrl}</Link>
      </Text>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>Shop</Heading>
          <TextInput label="Shop name" value={s.name} onChange={(v) => set('name', v)} />
          <TextInput label="Address" value={s.address} onChange={(v) => set('address', v)} />
          <TextInput label="City, state, PIN" value={s.city} onChange={(v) => set('city', v)} />
          <TextInput label="WhatsApp number for orders" type="tel" value={s.whatsappPhone} onChange={(v) => set('whatsappPhone', v)} />
          <TextInput label="UPI ID" value={s.upiVpa} onChange={(v) => set('upiVpa', v)} description="Customers pay to this UPI ID. ShelfMate takes no commission." />
        </VStack>
      </Card>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>Delivery</Heading>
          <TextInput label="Delivery radius (km)" inputMode="numeric" value={String(s.deliveryRadiusKm)} onChange={(v) => set('deliveryRadiusKm', Number(v) || 0)} />
          <TextInput label="Minimum order ₹" inputMode="decimal" value={minOrder} onChange={setMinOrder} />
          <HStack gap={2} wrap="wrap">
            <Selector label="Opens" options={HOURS} value={String(s.openMinute)} onChange={(v) => set('openMinute', Number(v))} />
            <Selector label="Closes" options={HOURS} value={String(s.closeMinute)} onChange={(v) => set('closeMinute', Number(v))} />
            <Selector
              label="Slot length"
              options={[{value: '30', label: '30 min'}, {value: '60', label: '1 hour'}, {value: '120', label: '2 hours'}]}
              value={String(s.slotMinutes)}
              onChange={(v) => set('slotMinutes', Number(v))}
            />
          </HStack>
        </VStack>
      </Card>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>GST</Heading>
          <TextInput label="GSTIN" value={s.gstin} onChange={(v) => set('gstin', v.toUpperCase())} isOptional />
          <Switch label="Composition scheme (issue bill of supply, no tax shown)" value={s.composition} onChange={(v) => set('composition', v)} />
        </VStack>
      </Card>
      {msg && <Banner status={msg.ok ? 'success' : 'error'} title={msg.text} collapsible={false} />}
      <Button label="Save settings" variant="primary" size="lg" clickAction={save} />
      <Card>
        <VStack gap={2}>
          <Heading level={2}>Staff</Heading>
          <List density="compact" edge="flush">
            {staff.map((u) => (
              <ListItem key={u.id} label={u.name} description={`${formatPhone(u.phone)} · ${u.role}`} />
            ))}
          </List>
          <Text type="supporting" color="secondary">
            Staff sign in with their phone and a one-time code. They can run orders, billing, khata and stock; prices, offers, settings and the dashboard are owner-only.
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}
