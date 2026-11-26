import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {pageCtx} from '@/server/session';
import {schema} from '@/server/db';
import {eq} from 'drizzle-orm';
import {AppNav} from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const ctx = await pageCtx();
  const [org] = await ctx.db.select({name: schema.orgs.name, isDemo: schema.orgs.isDemo}).from(schema.orgs).where(eq(schema.orgs.id, ctx.orgId));
  return (
    <Layout
      height="auto"
      contentWidth="72rem"
      header={
        <LayoutHeader padding={3} hasDivider>
          <AppNav storeName={org.name} userName={ctx.name} role={ctx.role} isDemo={org.isDemo} />
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          {children}
        </LayoutContent>
      }
    />
  );
}
