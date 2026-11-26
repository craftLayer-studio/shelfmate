import type {Metadata} from 'next';
import {getDb} from '@/server/db';
import {getStatement} from '@/server/store';
import {orNotFound} from '@/server/pages';
import {Statement} from '@/components/Statement';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Khata statement', robots: {index: false}};

export default async function StatementPage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const data = await orNotFound(getStatement(await getDb(), token));
  return <Statement token={token} data={data} />;
}
