import '/public/fonts/dm-sans.css';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import React, { useState } from 'react';
import { SettingsProvider } from '../contexts';
import DefaultLayout from '../layouts/DefaultLayout';
import theme from '../theme';

const WalletProvider = dynamic<React.PropsWithChildren>(
  () => import('../contexts/wallet').then((mod) => mod.WalletProvider),
  { ssr: false }
);

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SettingsProvider>
            <WalletProvider>
              <CssBaseline />
              <DefaultLayout>
                <Component {...pageProps} />
              </DefaultLayout>
            </WalletProvider>
          </SettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}
