import { Server } from 'soroban-client';
import { StateCreator } from 'zustand';
import { DataStore } from './store';

export interface NetworkSlice {
  rpcUrl: string;
  passphrase: string;
  rpcServer: () => Server;
  setNetwork: (rpcUrl: string, newPassphrase: string) => void;
}

export const createNetworkSlice: StateCreator<DataStore, [], [], NetworkSlice> = (set, get) => ({
  rpcUrl: 'https://rpc-futurenet.stellar.org',
  passphrase: 'Test SDF Future Network ; October 2022',
  // rpcUrl: 'http://localhost:8000/soroban/rpc',
  // passphrase: 'Standalone Network ; February 2017',
  rpcServer: () => {
    return new Server(get().rpcUrl, { allowHttp: true });
  },
  setNetwork: (newUrl, newPassphrase) => set({ rpcUrl: newUrl, passphrase: newPassphrase }),
});
