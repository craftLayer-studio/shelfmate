'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Center} from '@astryxdesign/core/Center';
import {VStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {normalizeIndianPhone} from '@/domain';
import {api} from '@/lib/api';

export function LoginForm({initialPhone, demo}: {initialPhone: string; demo: {owner: string; staff: string} | null}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function sendCode() {
    setError('');
    const e164 = normalizeIndianPhone(phone);
    if (!e164) return setError('Enter a 10-digit mobile number.');
    try {
      const r = await api<{demoCode: string | null}>('/api/auth/otp', {phone: e164});
      setDemoCode(r.demoCode);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function verify() {
    setError('');
    try {
      await api('/api/auth/verify', {phone: normalizeIndianPhone(phone), code});
      router.replace('/app/orders');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Center role="main" axis="both" padding={4}>
      <VStack gap={4} hAlign="stretch" maxWidth="26rem" width="100%">
        <VStack gap={1} hAlign="center">
          <Text weight="bold" size="lg">
            ShelfMate
          </Text>
          <Text type="supporting" color="secondary">
            Shop owner and staff sign-in
          </Text>
        </VStack>
        <Card padding={6} width="100%">
          <VStack gap={4} hAlign="stretch">
            <Heading level={1}>Sign in</Heading>
            {error && <Banner status="error" title={error} collapsible={false} />}
            {step === 'phone' ? (
              <>
                <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="98765 43210" size="lg" onEnter={sendCode} hasAutoFocus />
                <Button label="Send code" variant="primary" size="lg" clickAction={sendCode} />
              </>
            ) : (
              <>
                <Text color="secondary">We sent a 6-digit code to +91 {phone}.</Text>
                {demoCode && (
                  <Banner status="info" title={`Demo code: ${demoCode}`} description="Shown on screen only in the demo. A live store gets it by SMS." collapsible={false} />
                )}
                <TextInput label="Code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={setCode} size="lg" onEnter={verify} hasAutoFocus />
                <Button label="Verify and continue" variant="primary" size="lg" clickAction={verify} />
                <Button label="Use another number" variant="ghost" onClick={() => setStep('phone')} />
              </>
            )}
          </VStack>
        </Card>
        {demo && (
          <Card variant="muted" width="100%">
            <VStack gap={2}>
              <Text weight="semibold">Demo store logins</Text>
              <Text type="supporting">Owner (Ramesh): {demo.owner}</Text>
              <Text type="supporting">Counter staff (Sachin): {demo.staff}</Text>
              <Button label="Fill owner number" size="sm" onClick={() => setPhone(demo.owner)} />
            </VStack>
          </Card>
        )}
        <Link href="/">Back to ShelfMate home</Link>
      </VStack>
    </Center>
  );
}
