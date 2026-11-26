'use client';

import {HStack} from '@astryxdesign/core/Layout';
import {Button} from '@astryxdesign/core/Button';

export function InvoiceActions({shareLink, newBill = true}: {shareLink: string | null; newBill?: boolean}) {
  return (
    <HStack gap={2} wrap="wrap" data-print="hide">
      <Button label="Print" variant="primary" onClick={() => window.print()} />
      {shareLink && <Button label="Send on WhatsApp" href={shareLink} target="_blank" rel="noopener noreferrer" />}
      {newBill && <Button label="New bill" variant="ghost" href="/app/bill" />}
    </HStack>
  );
}
