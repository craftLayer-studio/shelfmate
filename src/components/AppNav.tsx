'use client';

import {usePathname, useRouter} from 'next/navigation';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {api} from '@/lib/api';

const STAFF_TABS = [
  {href: '/app/orders', label: 'Orders'},
  {href: '/app/bill', label: 'Bill'},
  {href: '/app/khata', label: 'Khata'},
  {href: '/app/stock', label: 'Stock'},
  {href: '/app/messages', label: 'Messages'},
];
const OWNER_TABS = [
  {href: '/app/dashboard', label: 'Dashboard'},
  {href: '/app/offers', label: 'Offers'},
  {href: '/app/settings', label: 'Settings'},
];

export function AppNav({storeName, userName, role, isDemo}: {storeName: string; userName: string; role: 'owner' | 'staff'; isDemo: boolean}) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = role === 'owner' ? [...STAFF_TABS, ...OWNER_TABS] : STAFF_TABS;
  const current = tabs.find((t) => pathname.startsWith(t.href))?.href ?? (pathname.startsWith('/app/invoices') ? '/app/bill' : pathname.startsWith('/app/qr') ? '/app/settings' : '');
  async function signOut() {
    await api('/api/auth/logout', {});
    router.replace('/login');
    router.refresh();
  }
  return (
    <VStack gap={2} data-print="hide">
      <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Text weight="bold">{storeName}</Text>
          {isDemo && <Badge label="Demo" variant="warning" />}
        </HStack>
        <HStack gap={2} vAlign="center">
          <Text type="supporting" color="secondary">
            {userName} ({role})
          </Text>
          <Button label="Sign out" size="sm" variant="ghost" clickAction={signOut} />
        </HStack>
      </HStack>
      <TabList value={current} onChange={(v) => router.push(v)} size="sm" hasDivider>
        {tabs.map((t) => (
          <Tab key={t.href} value={t.href} label={t.label} href={t.href} />
        ))}
      </TabList>
    </VStack>
  );
}
