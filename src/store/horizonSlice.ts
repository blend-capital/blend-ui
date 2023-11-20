import { Horizon } from 'stellar-sdk';
import { StateCreator } from 'zustand';
import { DataStore } from './store';

export interface HorizonSlice {
  horizon: {
    url: string;
    opts?: Horizon.Server.Options;
  };
  horizonServer: () => Horizon.Server;
  setHorizon: (url: string, opts?: Horizon.Server.Options) => void;
  account: Horizon.AccountResponse | undefined;
  loadAccount: (id: string) => Promise<Horizon.AccountResponse>;
}

export const createHorizonSlice: StateCreator<DataStore, [], [], HorizonSlice> = (set, get) => ({
  horizon: {
    url: 'https://horizon-testnet.stellar.org',
    opts: undefined,
  },
  horizonServer: () => {
    let horizon = get().horizon;
    return new Horizon.Server(horizon.url, horizon.opts);
  },
  setHorizon: (newUrl, newOpts) => {
    set({ horizon: { url: newUrl, opts: newOpts } });
  },
  account: undefined,
  loadAccount: async (id) => {
    let horizon = get().horizonServer();
    let account = await horizon.loadAccount(id);
    set({ account });
    return account;
  },
});