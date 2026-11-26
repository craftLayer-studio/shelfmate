import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentCtx} from '@/server/session';
import {isDemoMode} from '@/server/config';
import {DEMO_OWNER_PHONE, DEMO_STAFF_PHONE} from '@/server/db/seed';
import {LoginForm} from '@/components/LoginForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Sign in'};

export default async function LoginPage({searchParams}: {searchParams: Promise<{as?: string}>}) {
  if (await currentCtx()) redirect('/app/orders');
  const as = (await searchParams).as;
  const demo = isDemoMode();
  const initial = demo ? (as === 'staff' ? DEMO_STAFF_PHONE : as === 'owner' ? DEMO_OWNER_PHONE : '') : '';
  return <LoginForm initialPhone={initial.replace('+91', '')} demo={demo ? {owner: DEMO_OWNER_PHONE.slice(3), staff: DEMO_STAFF_PHONE.slice(3)} : null} />;
}
