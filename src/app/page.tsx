import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Badge} from '@astryxdesign/core/Badge';
import {Link} from '@astryxdesign/core/Link';
import {Divider} from '@astryxdesign/core/Divider';

const FEATURES = [
  {title: 'QR catalog orders', body: 'A standee at the counter and a sticker on the shutter open your catalog in the browser. Customers pick items, a delivery or pickup slot, and pay by UPI, cash or khata. No app, no commission.'},
  {title: 'Order queue', body: 'New orders appear on your phone within seconds. Accept, pack, send out for delivery and mark delivered. Each step can update the customer on WhatsApp.'},
  {title: 'Digital khata', body: 'Every credit sale lands in the customer ledger. See who owes what, set credit limits, and send a polite WhatsApp reminder with a UPI pay link.'},
  {title: 'GST bills in seconds', body: 'Tap items, pick cash, UPI or khata, and print or WhatsApp a GST invoice with HSN codes and CGST/SGST split. Composition dealers get a bill of supply.'},
  {title: 'Stock and expiry alerts', body: 'Know what is running low before it runs out, and which batches expire this month. Send the reorder list to your distributor on WhatsApp.'},
  {title: 'Owner dashboard', body: "Today's sales, udhaar outstanding and recovered, top items and repeat customers, plus results of every offer you send."},
];

const STEPS = [
  {n: '1', title: 'Customer scans', body: 'Your QR opens your own catalog on their phone.'},
  {n: '2', title: 'You pack and deliver', body: 'The order shows up live; tap through the steps.'},
  {n: '3', title: 'Money comes back', body: 'UPI, cash, or khata with reminders that get paid.'},
];

export default function Home() {
  return (
    <Layout
      height="auto"
      contentWidth="72rem"
      content={
        <LayoutContent role="main" padding={5} isScrollable={false}>
          <VStack gap={10}>
            <HStack hAlign="between" vAlign="center">
              <Text weight="bold" size="lg">
                ShelfMate
              </Text>
              <Button label="Shop sign in" variant="ghost" href="/login" />
            </HStack>
            <VStack gap={5} hAlign="center">
              <Badge label="For kirana, general stores and small pharmacies" variant="yellow" />
              <Heading level={1} type="display-2" justify="center" textWrap="balance">
                Your shop on every customer&apos;s phone
              </Heading>
              <Text color="secondary" justify="center" textWrap="balance">
                Take local delivery and pickup orders from a QR code, keep your khata and get udhaar back on time, print GST bills, and never run out of fast movers. Built for cheap Android phones and slow networks.
              </Text>
              <HStack gap={3} wrap="wrap" hAlign="center">
                <Button label="Try the demo" variant="primary" size="lg" href="/demo" />
                <Button label="See pricing" size="lg" href="#pricing" />
              </HStack>
            </VStack>
            <Grid columns={{minWidth: 220, max: 3}} gap={4}>
              {STEPS.map((s) => (
                <VStack key={s.n} gap={1}>
                  <Text size="2xl" weight="bold" color="accent">
                    {s.n}
                  </Text>
                  <Heading level={3}>{s.title}</Heading>
                  <Text color="secondary">{s.body}</Text>
                </VStack>
              ))}
            </Grid>
            <VStack gap={4}>
              <Heading level={2}>What you get</Heading>
              <Grid columns={{minWidth: 260, max: 3}} gap={4}>
                {FEATURES.map((f) => (
                  <Card key={f.title}>
                    <VStack gap={2}>
                      <Heading level={3}>{f.title}</Heading>
                      <Text color="secondary">{f.body}</Text>
                    </VStack>
                  </Card>
                ))}
              </Grid>
            </VStack>
            <VStack gap={4}>
              <Heading level={2} id="pricing">
                Pricing
              </Heading>
              <Grid columns={{minWidth: 220, max: 4}} gap={4}>
                {[
                  ['Free', '₹0', 'Khata and a 50-item QR catalog, manual reminders'],
                  ['Dukaan', '₹299/month', 'Unlimited catalog, orders, automated reminders, GST bills'],
                  ['Dukaan Pro', '₹699/month', 'Adds inventory, expiry, distributor reorder, offers'],
                  ['Pharmacy Pro', '₹999/month', 'Adds batch and expiry by default, H1 register, refill reminders'],
                ].map(([name, price, body]) => (
                  <Card key={name}>
                    <VStack gap={1}>
                      <Text weight="semibold">{name}</Text>
                      <Text size="2xl" weight="bold">{price}</Text>
                      <Text type="supporting" color="secondary">
                        {body}
                      </Text>
                    </VStack>
                  </Card>
                ))}
              </Grid>
              <Text type="supporting" color="secondary">
                Zero commission on orders. WhatsApp message packs are billed separately. Yearly plans get about two months free.
              </Text>
            </VStack>
            <Divider />
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                ShelfMate is an MVP by CraftLayer Studio. The demo store, its customers and numbers are fictional; WhatsApp and payments are simulated.
              </Text>
              <HStack gap={4} wrap="wrap">
                <Link href="https://craftlayer.store">craftlayer.store</Link>
                <Link href="mailto:shelfmate@craftlayer.store">shelfmate@craftlayer.store</Link>
                <Link href="mailto:hello@craftlayer.store">hello@craftlayer.store</Link>
                <Link href="mailto:licensing@craftlayer.store">Commercial licence</Link>
              </HStack>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
