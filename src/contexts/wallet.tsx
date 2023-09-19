import { getPublicKey, signTransaction } from '@stellar/freighter-api';
import React, { useContext, useEffect, useState } from 'react';
import { Operation, Transaction, TransactionBuilder, xdr } from 'soroban-client';
import { useStore } from '../store/store';

export interface IWalletContext {
  connected: boolean;
  walletAddress: string;
  txStatus: TxStatus;
  connect: () => void;
  disconnect: () => void;
  setTxStatus: (newTxStatus: TxStatus) => void;
  userSignTransaction: (xdr: string, network: string, signWith: string) => Promise<string>;
  submitTransaction: (operation: xdr.Operation<Operation.InvokeHostFunction>) => Promise<void>;
}

export enum TxStatus {
  NONE,
  SIGNING,
  SUBMITTING,
  SUCCESS,
  FAIL,
}

const WalletContext = React.createContext<IWalletContext | undefined>(undefined);

export const WalletProvider = ({ children = null as any }) => {
  const rpcServer = useStore((state) => state.rpcServer);
  const passphrase = useStore((state) => state.passphrase);
  const removeUserState = useStore((state) => state.removeUserData);

  const [connected, setConnected] = useState<boolean>(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.NONE);

  // wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    if (autoConnect) {
      setAutoConnect(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  /**
   * Connects a browser wallet by fetching the public key from the wallet.
   * returns The public key of the wallet
   */
  async function connect() {
    let publicKey = '';
    let error = '';
    try {
      publicKey = await getPublicKey();
      setWalletAddress(publicKey);
      setConnected(true);
    } catch (e: any) {
      error = e?.message ?? 'Failed to connect wallet.';
    }
    if (error) {
      return error;
    }
    return publicKey;
  }

  function disconnect() {
    removeUserState();
    setWalletAddress('');
    setConnected(false);
  }

  /**
   * Signs a transaction with a connected wallet.
   * param xdr = The xdr-encoded transaction envelope to sign.
   * returns The signed_xdr of the transaction
   */

  async function userSignTransaction(xdr: string, network: string, signWith: string) {
    let signedTransaction = '';
    let error = '';

    try {
      signedTransaction = await signTransaction(xdr, {
        network,
        accountToSign: signWith,
      });
    } catch (e: any) {
      error = e?.message ?? 'Failed to sign transaction.';
    }
    if (error) {
      return error;
    }
    return signedTransaction;
  }

  /**
   * Submits tx
   * Returns txStatus and hash
   */
  async function submitTransaction(operation: xdr.Operation<Operation.InvokeHostFunction>) {
    if (connected) {
      try {
        let stellar = rpcServer();
        let account = await stellar.getAccount(walletAddress);

        let txBuilder = new TransactionBuilder(account, {
          fee: '10000',
          timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 5 * 60 * 1000 },
          networkPassphrase: passphrase,
        });
        txBuilder.addOperation(operation);
        // simulate and rebuild tx
        let tx_no_footprint = txBuilder.build();
        let tx_footprint = await stellar.prepareTransaction(tx_no_footprint, passphrase);
        console.log('prepped_tx: ', tx_footprint.toXDR());
        // fetch signature from wallet
        setTxStatus(TxStatus.SIGNING);
        let tx_signed = await signTransaction(tx_footprint.toXDR(), {
          networkPassphrase: passphrase,
        });
        setTxStatus(TxStatus.SUBMITTING);
        let response = await stellar.sendTransaction(new Transaction(tx_signed, passphrase));
        console.log('tx_resp: ', JSON.stringify(response));
        let status = response.status as string;
        let tx_hash = response.hash;
        // Poll this until the status is not "pending"
        while (status === 'PENDING' || status == 'NOT_FOUND') {
          // See if the transaction is complete
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log('checking tx...');
          let getResponse = await stellar.getTransaction(tx_hash);
          status = getResponse.status;
        }

        if (status === 'SUCCESS') {
          setTxStatus(TxStatus.SUCCESS);
        } else {
          console.log('Transaction failed: ', status);
          setTxStatus(TxStatus.FAIL);
        }
      } catch (e) {
        console.error('Failed submitting transaction: ', e);
        setTxStatus(TxStatus.FAIL);
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        connected,
        walletAddress,
        txStatus,
        connect,
        disconnect,
        setTxStatus,
        userSignTransaction,
        submitTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error('Component rendered outside the provider tree');
  }

  return context;
};
