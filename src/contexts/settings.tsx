import { Network, Version } from '@blend-capital/blend-sdk';
import { useMediaQuery, useTheme } from '@mui/material';
import { Horizon, rpc } from '@stellar/stellar-sdk';
import React, { useContext, useMemo, useState } from 'react';
import { useLocalStorageState } from '../hooks';
import { PoolMeta } from '../hooks/types';

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org';
const DEFAULT_HORIZON =
  process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const DEFAULT_PASSPHRASE =
  process.env.NEXT_PUBLIC_PASSPHRASE || 'Test SDF Network ; September 2015';

export enum ViewType {
  MOBILE,
  COMPACT,
  REGULAR,
}

export interface TrackedPool {
  id: string;
  name: string;
  version: Version;
}

export interface NetworkUrls {
  horizonUrl: string;
  rpc: string;
  opts?: Horizon.Server.Options;
}

export interface ISettingsContext {
  viewType: ViewType;
  network: Network & { horizonUrl: string };
  setNetwork: (rpcUrl: string, newHorizonUrl: string, opts?: rpc.Server.Options) => void;
  setDefaultNetwork: () => void;
  getRPCServer: () => rpc.Server;
  getHorizonServer: () => rpc.Server;
  lastPool: TrackedPool | undefined;
  setLastPool: (poolMeta: PoolMeta) => void;
  trackedPools: TrackedPool[];
  trackPool: (poolMeta: PoolMeta) => void;
  untrackPool: (id: string) => void;
  showLend: boolean;
  setShowLend: (showLend: boolean) => void;
  showJoinPool: boolean;
  setShowJoinPool: (showJoinPool: boolean) => void;
  blockedPools: string[];
  configuredPools: TrackedPool[];
  isV2Enabled: boolean;
}

const SettingsContext = React.createContext<ISettingsContext | undefined>(undefined);

export const SettingsProvider = ({ children = null as any }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('lg')); // hook causes refresh on change
  const mobile = useMediaQuery(theme.breakpoints.down('sm')); // hook causes refresh on change

  const [lastPoolString, setLastPoolString] = useLocalStorageState('lastPool', undefined);
  const [trackedPoolsString, setTrackedPoolsString] = useLocalStorageState(
    'trackedPools',
    undefined
  );
  const [networkString, setNetworkString] = useLocalStorageState('network', undefined);

  const [showLend, setShowLend] = useState<boolean>(true);
  const [showJoinPool, setShowJoinPool] = useState<boolean>(true);

  const lastPool = useMemo(() => {
    try {
      return lastPoolString ? (JSON.parse(lastPoolString) as TrackedPool) : undefined;
    } catch (e) {
      console.warn('Failed to parse lastPool:', e);
      return undefined;
    }
  }, [lastPoolString]);
  const storedPools = useMemo(() => {
    try {
      return JSON.parse(trackedPoolsString ?? '[]') as TrackedPool[];
    } catch (e) {
      console.warn('Failed to parse trackedPools:', e);
      return [];
    }
  }, [trackedPoolsString]);
  const configuredPools = useMemo(() => {
    try {
      return JSON.parse(process.env.NEXT_PUBLIC_CONFIGURED_POOLS ?? '[]') as TrackedPool[];
    } catch (e) {
      console.warn('Failed to parse NEXT_PUBLIC_CONFIGURED_POOLS:', e);
      return [];
    }
  }, []);
  const trackedPools = useMemo(() => {
    const pools = new Map(storedPools.map((pool) => [pool.id, pool]));
    configuredPools.forEach((pool) => pools.set(pool.id, pool));
    return Array.from(pools.values());
  }, [configuredPools, storedPools]);
  const network = useMemo(() => {
    try {
      let urls = JSON.parse(networkString ?? '{}') as NetworkUrls;
      return {
        rpc: urls.rpc ?? DEFAULT_RPC,
        passphrase: DEFAULT_PASSPHRASE,
        opts: urls.opts,
        horizonUrl: urls.horizonUrl ?? DEFAULT_HORIZON,
      };
    } catch (e) {
      console.warn('Failed to parse urls:', e);
      return {
        rpc: DEFAULT_RPC,
        horizonUrl: DEFAULT_HORIZON,
        passphrase: DEFAULT_PASSPHRASE,
        opts: undefined,
      };
    }
  }, [networkString]);

  const [blockedPools, _] = useState<string[]>(
    (process.env.NEXT_PUBLIC_BLOCKED_POOLS || '').split(',')
  );

  const isV2Enabled = process.env.NEXT_PUBLIC_BACKSTOP_V2 !== undefined;

  let viewType: ViewType;
  if (mobile) viewType = ViewType.MOBILE;
  else if (compact) viewType = ViewType.COMPACT;
  else viewType = ViewType.REGULAR;

  function handleSetNetwork(newRpcUrl: string, newHorizonUrl: string, opts?: rpc.Server.Options) {
    if (newRpcUrl === DEFAULT_RPC && newHorizonUrl === DEFAULT_HORIZON) {
      handleSetDefaultNetwork();
    } else {
      setNetworkString(JSON.stringify({ rpc: newRpcUrl, horizonUrl: newHorizonUrl, opts }));
    }
  }

  function handleSetDefaultNetwork() {
    setNetworkString(undefined);
  }

  function getRPCServer() {
    return new rpc.Server(network.rpc, network.opts);
  }

  function getHorizonServer() {
    return new rpc.Server(network.horizonUrl, network.opts);
  }

  function trackPool(poolMeta: PoolMeta) {
    let index = storedPools.findIndex((pool) => pool.id === poolMeta.id);
    if (index !== -1) {
      if (
        storedPools[index].version !== poolMeta.version ||
        storedPools[index].name !== poolMeta.name
      ) {
        const updated = [...storedPools];
        updated[index] = { id: poolMeta.id, name: poolMeta.name, version: poolMeta.version };
        setTrackedPoolsString(JSON.stringify(updated));
      }
    } else {
      setTrackedPoolsString(
        JSON.stringify([
          ...storedPools,
          { id: poolMeta.id, name: poolMeta.name, version: poolMeta.version },
        ])
      );
    }
  }

  function untrackPool(id: string) {
    const index = storedPools.findIndex((pool) => pool.id === id);
    if (index !== -1) {
      setTrackedPoolsString(JSON.stringify(storedPools.filter((pool) => pool.id !== id)));
    }
  }

  function setLastPool(poolMeta: PoolMeta) {
    setLastPoolString(
      JSON.stringify({ id: poolMeta.id, name: poolMeta.name, version: poolMeta.version })
    );
  }

  return (
    <SettingsContext.Provider
      value={{
        viewType,
        network,
        setNetwork: handleSetNetwork,
        setDefaultNetwork: handleSetDefaultNetwork,
        getRPCServer,
        getHorizonServer,
        lastPool,
        setLastPool,
        trackedPools,
        trackPool,
        untrackPool,
        showLend,
        setShowLend,
        showJoinPool,
        setShowJoinPool,
        blockedPools,
        configuredPools,
        isV2Enabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('Component rendered outside the provider tree');
  }

  return context;
};
