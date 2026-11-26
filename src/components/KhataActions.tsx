'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Switch} from '@astryxdesign/core/Switch';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {useToast} from '@astryxdesign/core/Toast';
import {CONSENT_NOTICE, normalizeIndianPhone} from '@/domain';
import {api, parseRupees} from '@/lib/api';

export function KhataActions({dueCount}: {dueCount: number}) {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [khata, setKhata] = useState(true);
  const [limit, setLimit] = useState('');
  const [service, setService] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState('');

  async function remindAll() {
    const r = await api<{sent: number; skipped: number}>('/api/staff/reminders', {});
    toast({body: `Reminders sent: ${r.sent}. Skipped (no consent): ${r.skipped}. See Messages.`});
    router.refresh();
  }
  async function add() {
    setError('');
    const e164 = normalizeIndianPhone(phone);
    if (!e164) return setError('Enter a 10-digit mobile number.');
    const creditLimit = limit ? parseRupees(limit) : 0;
    if (creditLimit === null) return setError('Credit limit must be an amount in rupees.');
    try {
      const r = await api<{id: string}>('/api/staff/customers', {phone: e164, name, khataEnabled: khata, creditLimit, consentService: service, consentMarketing: marketing});
      setIsOpen(false);
      router.push(`/app/khata/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <HStack gap={2}>
      <Button label={`Remind all who owe (${dueCount})`} clickAction={remindAll} isDisabled={dueCount === 0} />
      <Button label="Add customer" variant="primary" onClick={() => setIsOpen(true)} />
      <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen} label="Add customer" purpose="form" padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Add customer</Heading>
          <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} isRequired />
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <Switch label="Allow khata (credit)" value={khata} onChange={setKhata} />
          {khata && <TextInput label="Credit limit in ₹" inputMode="decimal" value={limit} onChange={setLimit} isOptional description="Leave empty for no limit" />}
          <CheckboxInput label={`Customer agrees: ${CONSENT_NOTICE.service}`} value={service} onChange={setService} />
          <CheckboxInput label={`Customer agrees: ${CONSENT_NOTICE.marketing}`} value={marketing} onChange={setMarketing} />
          {error && <Banner status="error" title={error} collapsible={false} />}
          <Button label="Save customer" variant="primary" clickAction={add} />
        </VStack>
      </BottomSheet>
    </HStack>
  );
}
