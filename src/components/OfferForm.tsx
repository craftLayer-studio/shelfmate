'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {api} from '@/lib/api';

export function OfferForm({optedIn, total}: {optedIn: number; total: number}) {
  const router = useRouter();
  const [message, setMessage] = useState('Fresh atta and new-season rice arrived. 5% off on orders above ₹500 this week.');
  const [segment, setSegment] = useState('inactive_21d');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function send() {
    setError('');
    try {
      const r = await api<{sent: number; skipped: number}>('/api/owner/campaigns', {message, segment});
      setResult(`Sent to ${r.sent} customers. Skipped ${r.skipped} without marketing consent. Results show on the dashboard.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <VStack gap={4} maxWidth="40rem">
      <Heading level={1}>Send an offer</Heading>
      <Text color="secondary">
        {optedIn} of {total} customers agreed to offers on WhatsApp. Only they receive this message; everyone else is skipped and logged.
      </Text>
      <Card>
        <VStack gap={3}>
          <TextArea label="Message" value={message} onChange={setMessage} description="The shop name, catalog link and STOP opt-out are added automatically." />
          <RadioList label="Who" value={segment} onChange={setSegment}>
            <RadioListItem value="inactive_21d" label="Customers who have not ordered in 21 days" />
            <RadioListItem value="all" label="All customers who opted in" />
          </RadioList>
          {error && <Banner status="error" title={error} collapsible={false} />}
          {result && <Banner status="success" title={result} collapsible={false} />}
          <Button label="Send offer (simulated WhatsApp)" variant="primary" clickAction={send} isDisabled={message.trim().length < 5} />
        </VStack>
      </Card>
    </VStack>
  );
}
