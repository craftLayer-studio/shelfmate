import type {Metadata} from 'next';
import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Divider} from '@astryxdesign/core/Divider';
import {PAYMENT_LABELS, formatDateTimeIST, formatINR, formatTimeIST, statusLabel, type OrderStatus} from '@/domain';
import {getDb} from '@/server/db';
import {getOrderPublic} from '@/server/store';
import {orNotFound} from '@/server/pages';
import {AutoRefresh} from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Your order', robots: {index: false}};

const STEPS: Record<string, OrderStatus[]> = {
  delivery: ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered'],
  pickup: ['placed', 'accepted', 'packed', 'delivered'],
};

export default async function OrderPage({params, searchParams}: {params: Promise<{token: string}>; searchParams: Promise<{new?: string}>}) {
  const {token} = await params;
  const isNew = (await searchParams).new === '1';
  const data = await orNotFound(getOrderPublic(await getDb(), token));
  const {order, store} = data;
  const steps = STEPS[order.fulfilment];
  const stepIndex = steps.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  return (
    <Layout
      height="auto"
      contentWidth="48rem"
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          {!isCancelled && order.status !== 'delivered' && <AutoRefresh seconds={10} />}
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={1}>Order #{order.number}</Heading>
              {store.isDemo && <Badge label="Demo" variant="warning" />}
            </HStack>
            <Text color="secondary">{store.name}</Text>
            {isNew && (
              <Banner
                status="success"
                title="Order placed"
                description="The shop sees it now. Tap below to also send it on WhatsApp (optional, free)."
                collapsible={false}
              />
            )}
            <Card>
              <VStack gap={3}>
                <HStack hAlign="between" vAlign="center">
                  <Text weight="semibold">{statusLabel(order.status, order.fulfilment)}</Text>
                  <Badge label={isCancelled ? 'Cancelled' : order.status === 'delivered' ? 'Done' : 'In progress'} variant={isCancelled ? 'error' : order.status === 'delivered' ? 'success' : 'info'} />
                </HStack>
                {!isCancelled && <ProgressBar label="Order progress" isLabelHidden value={((stepIndex + 1) / steps.length) * 100} />}
                <Text type="supporting" color="secondary">
                  {order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}: {formatDateTimeIST(order.slotStart)} to {formatTimeIST(order.slotEnd)}
                </Text>
                <List density="compact" edge="flush">
                  {data.events.map((e, i) => (
                    <ListItem key={i} label={statusLabel(e.status as OrderStatus, order.fulfilment)} endContent={<Text type="supporting">{formatTimeIST(e.at)}</Text>} />
                  ))}
                </List>
              </VStack>
            </Card>
            <List hasDividers density="compact" edge="flush" header={<Heading level={2}>Items</Heading>}>
              {data.items.map((i, k) => (
                <ListItem key={k} label={i.name} description={i.qty} endContent={<Text hasTabularNumbers>{formatINR(i.amount)}</Text>} />
              ))}
            </List>
            <Divider />
            <HStack hAlign="between">
              <Text weight="semibold">Total ({PAYMENT_LABELS[order.paymentMode]})</Text>
              <Text weight="bold">{formatINR(order.total)}</Text>
            </HStack>
            {data.upiLink && (
              <VStack gap={2}>
                <Button label={`Pay ${formatINR(order.total)} by UPI`} variant="primary" size="lg" href={data.upiLink} />
                <Text type="supporting" color="secondary">
                  Opens your UPI app (GPay, PhonePe, Paytm, BHIM). The shop confirms when the money arrives.
                </Text>
              </VStack>
            )}
            {order.paid && <Banner status="success" title="Payment received" collapsible={false} />}
            <Button label="Send order on WhatsApp" href={data.whatsappLink} target="_blank" rel="noopener noreferrer" />
            <HStack gap={3} wrap="wrap">
              <Button label="Order again" variant="ghost" href={`/s/${store.catalogToken}`} />
              {data.statementToken && <Button label="My khata and message settings" variant="ghost" href={`/k/${data.statementToken}`} />}
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
