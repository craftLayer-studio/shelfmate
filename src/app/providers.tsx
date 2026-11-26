'use client';

import NextLink from 'next/link';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {ToastViewport} from '@astryxdesign/core/Toast';
import {themes, defaultThemeSlug} from '../astryx-themes';
import type {ReactNode} from 'react';

export function Providers({children}: {children: ReactNode}) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <LinkProvider component={NextLink}>
        {children}
        <ToastViewport />
      </LinkProvider>
    </Theme>
  );
}
