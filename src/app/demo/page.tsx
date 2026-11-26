import type {Metadata} from 'next';
import QRCode from 'qrcode';
import {and, eq, gt} from 'drizzle-orm';
import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Badge} from '@astryxdesign/core/Badge';
import {List, ListItem} from '@astryxdesign/core/List';
import {formatPhone} from '@/domain';
import {appUrl} from '@/server/config';
import {getDb, schema} from '@/server/db';
import {DEMO_OWNER_PHONE, DEMO_QR_TOKEN, DEMO_STAFF_PHONE} from '@/server/db/seed';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Try the demo'};

export default async function DemoPage() {
  const db = await getDb();
  const catalog = `${appUrl()}/s/${DEMO_QR_TOKEN}`;
  const qr = `data:image/svg+xml;base64,${Buffer.from(await QRCode.toString(catalog, {type: 'svg', margin: 1})).toString('base64')}`;
  const [org] = await db.select().from(schema.orgs).where(eq(schema.orgs.qrToken, DEMO_QR_TOKEN));
  const [sample] = org
    ? await db
        .select({token: schema.customers.publicToken, name: schema.customers.name})
        .from(schema.customers)
        .innerJoin(schema.khataEntries, eq(schema.khataEntries.customerId, schema.customers.id))
        .where(and(eq(schema.customers.orgId, org.id), gt(schema.khataEntries.amountPaise, 0), eq(schema.khataEntries.kind, 'credit')))
        .limit(1)
    : [];
  return (
    <Layout
      height="auto"
      contentWidth="72rem"
      content={
        <LayoutContent role="main" padding={5} isScrollable={false}>
          <VStack gap={6}>
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Heading level={1}>Try ShelfMate</Heading>
                <Badge label="Demo" variant="warning" />
              </HStack>
              <Text color="secondary">
                Annapurna Kirana Stores is a fictional shop in Kothrud, Pune. Open the customer side on your phone and the shop side on another device to watch orders arrive live.
              </Text>
            </VStack>
            <Grid columns={{minWidth: 280, max: 3}} gap={4} align="start">
              <Card>
                <VStack gap={3} hAlign="center">
                  <Heading level={2}>1. Order as a customer</Heading>
                  <VStack maxWidth="8rem" width="100%">
                    <img src={qr} alt="QR code for the demo store catalog" width="100%" />
                  </VStack>
                  <Text type="supporting" justify="center">
                    Scan with your phone, or open the link. Add items, pick a slot, tick the WhatsApp boxes if you like, and place the order.
                  </Text>
                  <Button label="Open the store catalog" variant="primary" href={`/s/${DEMO_QR_TOKEN}`} />
                </VStack>
              </Card>
              <Card>
                <VStack gap={3}>
                  <Heading level={2}>2. Run the counter</Heading>
                  <Text type="supporting">
                    Sign in as counter staff with {formatPhone(DEMO_STAFF_PHONE)}. The one-time code shows on screen in the demo.
                  </Text>
                  <List density="compact" edge="flush" listStyle="decimal">
                    <ListItem label="Orders: accept, pack, out for delivery, delivered" />
                    <ListItem label="Bill: tap items, print a GST invoice" />
                    <ListItem label="Khata: add udhaar, send a reminder" />
                    <ListItem label="Stock: low-stock and expiry alerts" />
                    <ListItem label="Messages: the simulated WhatsApp outbox" />
                  </List>
                  <Button label="Sign in as staff" href="/login?as=staff" />
                </VStack>
              </Card>
              <Card>
                <VStack gap={3}>
                  <Heading level={2}>3. See it as the owner</Heading>
                  <Text type="supporting">Sign in as the owner with {formatPhone(DEMO_OWNER_PHONE)} for the dashboard, offers, settings and the printable QR standee.</Text>
                  <Button label="Sign in as owner" variant="primary" href="/login?as=owner" />
                  {sample && (
                    <>
                      <Text type="supporting">This is what a customer sees when they tap a khata reminder:</Text>
                      <Button label={`Khata statement of ${sample.name}`} variant="ghost" href={`/k/${sample.token}`} />
                    </>
                  )}
                </VStack>
              </Card>
            </Grid>
            <Text type="supporting" color="secondary">
              Demo data only. WhatsApp, SMS and payment confirmations are simulated and written to an outbox; nothing is sent. Run `pnpm db:seed` to reset.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
