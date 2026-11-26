import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Grid} from '@astryxdesign/core/Grid';
import {pageCtx} from '@/server/session';
import {getQrSheet} from '@/server/store';
import {InvoiceActions} from '@/components/InvoiceActions';

export const metadata: Metadata = {title: 'QR standee'};

export default async function QrPage() {
  const ctx = await pageCtx('owner');
  const qr = await getQrSheet(ctx);
  const src = `data:image/svg+xml;base64,${Buffer.from(qr.svg).toString('base64')}`;
  const standee = (title: string) => (
    <Card padding={6}>
      <VStack gap={3} hAlign="center">
        {qr.isDemo && <Badge label="Demo" variant="warning" />}
        <Heading level={2} justify="center">
          {title}
        </Heading>
        <Text weight="bold" justify="center">
          {qr.name}
        </Text>
        <VStack maxWidth="18rem" width="100%">
          <img src={src} alt={`QR code that opens ${qr.name} catalog`} width="100%" />
        </VStack>
        <Text justify="center">Scan with your phone camera. Home delivery or pickup. Pay by UPI, cash or khata.</Text>
        <Text type="supporting" justify="center">
          No app needed · {qr.url}
        </Text>
      </VStack>
    </Card>
  );
  return (
    <VStack gap={4}>
      <InvoiceActions shareLink={null} newBill={false} />
      <Grid columns={{minWidth: 300, max: 2}} gap={4}>
        {standee('Order from home')}
        {standee('Scan to order')}
      </Grid>
      <Text type="supporting" color="secondary">
        Print on A4 and cut in half: one standee for the counter, one sticker for the shutter or door.
      </Text>
    </VStack>
  );
}
