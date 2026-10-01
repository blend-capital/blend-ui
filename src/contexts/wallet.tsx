import {
  addReflectorEntries,
  BackstopClaimV1Args,
  BackstopClaimV2Args,
  BackstopContractV1,
  BackstopContractV2,
  ContractErrorType,
  Network,
  parseError,
  PoolBackstopActionArgs,
  PoolClaimArgs,
  PoolContractV2,
  Positions,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import { SwkAppDarkTheme } from '@creit.tech/stellar-wallets-kit';
import {
  Asset,
  Networks,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import React, { useContext, useEffect, useState } from 'react';
import { useLocalStorageState } from '../hooks';
import { useQueryClientCacheCleaner } from '../hooks/api';
import { PoolMeta } from '../hooks/types';
import { CometClient, CometLiquidityArgs, CometSingleSidedDepositArgs } from '../utils/comet';
import { useSettings } from './settings';
import { BACKSTOP_IDS, isV2Contracts, Version } from '../utils/version';

type WalletKit = typeof import('@creit.tech/stellar-wallets-kit').StellarWalletsKit;
type WalletKitNetwork = import('@creit.tech/stellar-wallets-kit').Networks;
type WalletConnectModuleInstance = import('@creit.tech/stellar-wallets-kit').ModuleInterface & {
  disconnect(): Promise<void>;
};

const WALLET_CONNECT_ID = 'wallet_connect';

export interface IWalletContext {
  connected: boolean;
  walletAddress: string;
  txStatus: TxStatus;
  lastTxHash: string | undefined;
  lastTxFailure: string | undefined;
  txType: TxType;
  walletId: string | undefined;
  txInclusionFee: InclusionFee;

  isLoading: boolean;
  connect: (handleSuccess: (success: boolean) => void) => Promise<void>;
  disconnect: () => void;
  refresh: (handleSuccess: (success: boolean) => void) => Promise<void>;
  clearLastTx: () => void;
  restore: (sim: rpc.Api.SimulateTransactionRestoreResponse) => Promise<void>;
  poolSubmit: (
    poolMeta: PoolMeta,
    submitArgs: SubmitArgs,
    sim: boolean
  ) => Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  poolClaim: (
    poolMeta: PoolMeta,
    claimArgs: PoolClaimArgs,
    sim: boolean
  ) => Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  backstopDeposit(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  backstopWithdraw(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  backstopQueueWithdrawal(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  backstopDequeueWithdrawal(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  backstopClaim(
    poolMeta: PoolMeta,
    args: BackstopClaimV1Args | BackstopClaimV2Args,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  cometSingleSidedDeposit(
    cometPoolId: string,
    args: CometSingleSidedDepositArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  cometJoin(
    cometPoolId: string,
    args: CometLiquidityArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  cometExit(
    cometPoolId: string,
    args: CometLiquidityArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined>;
  faucet(): Promise<undefined>;
  createTrustlines(asset: Asset[]): Promise<void>;
  getNetworkDetails(): Promise<Network & { horizonUrl: string }>;
  setTxInclusionFee: (inclusionFee: InclusionFee) => void;
}

export enum TxStatus {
  NONE,
  BUILDING,
  SIGNING,
  SUBMITTING,
  SUCCESS,
  FAIL,
}

export enum TxType {
  // Submit a contract invocation
  CONTRACT,
  // A transaction that is a pre-requisite for another transaction
  PREREQ,
}

export interface InclusionFee {
  type: 'Low' | 'Medium' | 'High';
  fee: string;
}

// Lazy-initialized wallet kit modules. These are only created in the browser
// to avoid running wallet kit constructors during Next.js static page generation.
let walletConnectModule: WalletConnectModuleInstance | undefined;
let walletKitPromise: Promise<WalletKit> | undefined;

async function getWalletKit(): Promise<WalletKit> {
  if (!walletKitPromise) {
    walletKitPromise = initializeWalletKit();
  }
  return walletKitPromise;
}

async function initializeWalletKit(): Promise<WalletKit> {
  const [
    { Networks: WalletKitNetworks, StellarWalletsKit },
    { AlbedoModule },
    { FreighterModule },
    { HanaModule },
    { HotWalletModule },
    { LedgerModule },
    { LobstrModule },
    { WalletConnectModule, WalletConnectTargetChain },
    { XBULL_ID, xBullModule },
  ] = await Promise.all([
    import('@creit.tech/stellar-wallets-kit'),
    import('@creit.tech/stellar-wallets-kit/modules/albedo'),
    import('@creit.tech/stellar-wallets-kit/modules/freighter'),
    import('@creit.tech/stellar-wallets-kit/modules/hana'),
    import('@creit.tech/stellar-wallets-kit/modules/hotwallet'),
    import('@creit.tech/stellar-wallets-kit/modules/ledger'),
    import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
    import('@creit.tech/stellar-wallets-kit/modules/wallet-connect'),
    import('@creit.tech/stellar-wallets-kit/modules/xbull'),
  ]);

  if (!walletConnectModule) {
    walletConnectModule = new WalletConnectModule({
      projectId: 'a0fd1483122937b5cabbe0d85fa9c34e',
      metadata: {
        name: process.env.NEXT_PUBLIC_WALLET_CONNECT_NAME ?? 'Blend',
        description: `Blend is a liquidity protocol primitive, enabling the creation of money markets for any use case.`,
        url: process.env.NEXT_PUBLIC_WALLET_CONNECT_URL ?? 'https://blend.capital',
        icons: [
          'https://docs.blend.capital/~gitbook/image?url=https%3A%2F%2F3627113658-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FlsteMPgIzWJ2y9ruiTJy%252Fuploads%252FVsvCoCALpHWAw8LpU12e%252FBlend%2520Logo%25403x.png%3Falt%3Dmedia%26token%3De8c06118-43b7-4ddd-9580-6c0fc47ce971&width=768&dpr=2&quality=100&sign=f4bb7bc2&sv=1',
        ],
      },
      allowedChains: [
        process.env.NEXT_PUBLIC_PASSPHRASE === WalletKitNetworks.PUBLIC
          ? WalletConnectTargetChain.PUBLIC
          : WalletConnectTargetChain.TESTNET,
      ],
    });

    StellarWalletsKit.init({
      theme: SwkAppDarkTheme,
      network: (process.env.NEXT_PUBLIC_PASSPHRASE ??
        WalletKitNetworks.TESTNET) as WalletKitNetwork,
      selectedWalletId: XBULL_ID,
      modules: [
        new xBullModule(),
        new FreighterModule(),
        new LobstrModule(),
        new AlbedoModule(),
        new HanaModule(),
        new LedgerModule(),
        walletConnectModule,
        new HotWalletModule(),
      ],
    });
  }
  return StellarWalletsKit;
}

const WalletContext = React.createContext<IWalletContext | undefined>(undefined);

export const WalletProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { network } = useSettings();

  const { cleanWalletCache, cleanBackstopCache, cleanPoolCache, cleanBackstopPoolCache } =
    useQueryClientCacheCleaner();

  const stellarRpc = new rpc.Server(network.rpc, network.opts);

  const [connected, setConnected] = useState<boolean>(false);
  const [autoConnect, setAutoConnect] = useLocalStorageState('autoConnectWallet', 'false');
  const [loading, setLoading] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.NONE);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [txFailure, setTxFailure] = useState<string | undefined>(undefined);
  const [txType, setTxType] = useState<TxType>(TxType.CONTRACT);
  const [txInclusionFee, setTxInclusionFee] = useState<InclusionFee>({
    type: 'Medium',
    fee: '2000',
  });

  // wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    // @dev: timeout ensures chrome has the ability to load extensions
    // if the wallet is already connected, this will be a no-op
    if (!connected) {
      if (
        autoConnect !== undefined &&
        autoConnect !== 'false' &&
        autoConnect !== WALLET_CONNECT_ID
      ) {
        // attempt to auto-connect wallet
        setTimeout(() => {
          getWalletKit()
            .then((walletKit) => {
              walletKit.setWallet(autoConnect);
              handleSetWalletAddress();
            })
            .catch((e) => console.error('Unable to initialize wallet kit: ', e));
        }, 750);
      } else {
        // initialize wallet kit
        setTimeout(() => {
          getWalletKit().catch((e) => console.error('Unable to initialize wallet kit: ', e));
        }, 750);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  function setFailureMessage(message: string | undefined) {
    if (message) {
      // some contract failures include diagnostic information. If so, try and remove it.
      let substrings = message.split('Event log (newest first):');
      if (substrings.length > 1) {
        setTxFailure(`Contract Error: ${substrings[0].trimEnd()}`);
      } else {
        setTxFailure(`Stellar Error: ${message}`);
      }
    }
  }

  /**
   * Connect a wallet to the application via the walletKit
   */
  async function handleSetWalletAddress(): Promise<boolean> {
    try {
      const walletKit = await getWalletKit();
      const { address: publicKey } = await walletKit.fetchAddress();
      if (publicKey === '' || publicKey == undefined) {
        console.error('Unable to load wallet key: ', publicKey);
        return false;
      }
      setWalletAddress(publicKey);
      setConnected(true);
      return true;
    } catch (e: any) {
      console.error('Unable to load wallet information: ', e);
      return false;
    }
  }

  /**
   * Open up a modal to connect the user's browser wallet
   */
  async function connect(handleSuccess: (success: boolean) => void) {
    try {
      setLoading(true);
      const walletKit = await getWalletKit();
      // clear any existing WalletConnect session before establishing a new one,
      // otherwise the kit accumulates stale sessions for the same address
      if (walletConnectModule !== undefined) {
        try {
          await walletConnectModule.disconnect();
        } catch (e) {
          console.error('Error disconnecting existing WalletConnect sessions:', e);
        }
      }
      const { address: publicKey } = await walletKit.authModal();
      if (publicKey === '' || publicKey == undefined) {
        console.error('Unable to load wallet key: ', publicKey);
        handleSuccess(false);
        setLoading(false);
        return;
      }
      const selectedWalletId = walletKit.selectedModule.productId;
      setWalletAddress(publicKey);
      setConnected(true);
      setAutoConnect(selectedWalletId);
      handleSuccess(true);
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      handleSuccess(false);
      // the kit rejects with { code: -1 } when the user simply closes the modal
      if (e?.code !== -1) {
        console.error('Unable to connect wallet: ', e);
      }
    }
  }

  /**
   * Refresh the current wallet address from the active wallet
   */
  async function refresh(handleSuccess: (success: boolean) => void) {
    let result = await handleSetWalletAddress();
    handleSuccess(result);
  }

  /**
   * Disconnect from the user's browser wallet
   */
  async function disconnect() {
    if (autoConnect === WALLET_CONNECT_ID && walletConnectModule !== undefined) {
      try {
        await walletConnectModule.disconnect();
      } catch (e) {
        console.error('Error disconnecting WalletConnect session:', e);
      }
    }
    try {
      const walletKit = await getWalletKit();
      await walletKit.disconnect();
    } catch (e) {
      console.error('Error disconnecting wallet session from wallet kit:', e);
    }
    setWalletAddress('');
    setConnected(false);
    setAutoConnect('false');
    cleanWalletCache();
  }

  /**
   * Sign an XDR string with the connected user's wallet
   * @param xdr - The XDR to sign
   * @param networkPassphrase - The network passphrase
   * @returns - The signed XDR as a base64 string
   */
  async function sign(xdr: string): Promise<string> {
    if (connected) {
      setTxStatus(TxStatus.SIGNING);
      try {
        const walletKit = await getWalletKit();
        let { signedTxXdr } = await walletKit.signTransaction(xdr, {
          address: walletAddress,
          networkPassphrase: network.passphrase as WalletKitNetwork,
        });
        setTxStatus(TxStatus.SUBMITTING);
        return signedTxXdr;
      } catch (e: any) {
        if (e === 'User declined access') {
          setTxFailure('Transaction rejected by wallet.');
        } else if (typeof e === 'string') {
          setTxFailure(e);
        } else if (e instanceof Error || e?.message) {
          const message: string = e.message || 'Unknown error';
          setTxFailure(message);
        } else {
          setTxFailure('An unexpected error occurred while signing the transaction.');
        }

        setTxStatus(TxStatus.FAIL);
        throw e;
      }
    } else {
      throw new Error('Not connected to a wallet');
    }
  }

  async function restore(sim: rpc.Api.SimulateTransactionRestoreResponse): Promise<void> {
    let account = await stellarRpc.getAccount(walletAddress);
    setTxStatus(TxStatus.BUILDING);
    let fee = parseInt(sim.restorePreamble.minResourceFee) + parseInt(txInclusionFee.fee);
    let restore_tx = new TransactionBuilder(account, { fee: fee.toString() })
      .setNetworkPassphrase(network.passphrase)
      .setTimeout(0)
      .setSorobanData(sim.restorePreamble.transactionData.build())
      .addOperation(Operation.restoreFootprint({}))
      .build();
    let signed_restore_tx = new Transaction(await sign(restore_tx.toXDR()), network.passphrase);
    setTxType(TxType.PREREQ);
    await sendTransaction(signed_restore_tx);
  }

  async function sendTransaction(transaction: Transaction): Promise<boolean> {
    let send_tx_response = await stellarRpc.sendTransaction(transaction);
    let curr_time = Date.now();

    // Attempt to send the transaction and poll for the result
    while (send_tx_response.status !== 'PENDING' && Date.now() - curr_time < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      send_tx_response = await stellarRpc.sendTransaction(transaction);
    }
    if (send_tx_response.status !== 'PENDING') {
      let error = parseError(send_tx_response);
      console.error('Failed to send transaction: ', send_tx_response.hash, error);
      setFailureMessage(ContractErrorType[error.type]);
      setTxStatus(TxStatus.FAIL);
      return false;
    }

    curr_time = Date.now();
    let get_tx_response = await stellarRpc.getTransaction(send_tx_response.hash);
    while (get_tx_response.status === 'NOT_FOUND' && Date.now() - curr_time < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      get_tx_response = await stellarRpc.getTransaction(send_tx_response.hash);
    }

    if (get_tx_response.status === 'NOT_FOUND') {
      console.error('Unable to validate transaction success: ', get_tx_response.txHash);
      setFailureMessage(
        'The transaction could have been accepted by the network, but we were unable to verify.'
      );
      setTxStatus(TxStatus.FAIL);
      return false;
    }

    let hash = transaction.hash().toString('hex');
    setTxHash(hash);
    if (get_tx_response.status === 'SUCCESS') {
      console.log('Successfully submitted transaction: ', hash);
      // stall for a bit to ensure data propagates to horizon
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTxStatus(TxStatus.SUCCESS);
      return true;
    } else {
      let error = parseError(get_tx_response);
      console.error(`Transaction failed: `, hash, error);
      setFailureMessage(ContractErrorType[error.type]);
      setTxStatus(TxStatus.FAIL);
      return false;
    }
  }

  async function simulateOperation(
    operation: xdr.Operation
  ): Promise<rpc.Api.SimulateTransactionResponse> {
    try {
      setLoading(true);
      const account = await stellarRpc.getAccount(walletAddress);
      const tx_builder = new TransactionBuilder(account, {
        networkPassphrase: network.passphrase,
        fee: txInclusionFee.fee,
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 * 1000 },
      }).addOperation(operation);
      const transaction = tx_builder.build();
      const simulation = await stellarRpc.simulateTransaction(transaction);
      setLoading(false);
      return simulation;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  }

  async function invokeSorobanOperation<T>(operation: xdr.Operation) {
    try {
      const account = await stellarRpc.getAccount(walletAddress);
      const tx_builder = new TransactionBuilder(account, {
        networkPassphrase: network.passphrase,
        fee: txInclusionFee.fee,
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 * 1000 },
      }).addOperation(operation);
      const transaction = tx_builder.build();
      const simResponse = await simulateOperation(operation);
      const assembled_tx = rpc.assembleTransaction(transaction, simResponse).build();
      const extended_tx = addReflectorEntries(assembled_tx.toXDR());
      console.log('Sending transaction to wallet: ', extended_tx);
      const signedTx = await sign(extended_tx);
      const tx = new Transaction(signedTx, network.passphrase);
      await sendTransaction(tx);
    } catch (e: any) {
      console.error('Unknown error submitting transaction: ', e);
      setFailureMessage(e?.message);
      setTxStatus(TxStatus.FAIL);
    }
  }

  function clearLastTx() {
    setTxStatus(TxStatus.NONE);
    setTxHash(undefined);
    setTxFailure(undefined);
    setTxType(TxType.CONTRACT);
  }

  //********** Pool Functions ***********/

  /**
   * Submit a request to the pool
   * @param poolMeta - The metadata for the pool
   * @param submitArgs - The "submit" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function poolSubmit(
    poolMeta: PoolMeta,
    submitArgs: SubmitArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const pool =
        poolMeta.version === Version.V2
          ? new PoolContractV2(poolMeta.id)
          : new PoolContractV2(poolMeta.id);
      const operation = xdr.Operation.fromXDR(pool.submit(submitArgs), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation<Positions>(operation);
      cleanPoolCache(poolMeta.id);
      cleanWalletCache();
    }
  }

  /**
   * Claim emissions from the pool
   * @param poolMeta - The metadata for the pool
   * @param claimArgs - The "claim" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function poolClaim(
    poolMeta: PoolMeta,
    claimArgs: PoolClaimArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const pool =
        poolMeta.version === Version.V2
          ? new PoolContractV2(poolMeta.id)
          : new PoolContractV2(poolMeta.id);
      const operation = xdr.Operation.fromXDR(pool.claim(claimArgs), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation(operation);
      cleanPoolCache(poolMeta.id);
      cleanWalletCache();
    }
  }

  //********** Backstop Functions ***********/

  /**
   * Execute an deposit against the backstop
   * @param poolMeta - The metadata for the pool
   * @param args - The args of the deposit
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopDeposit(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const backstop = isV2Contracts(poolMeta.version)
        ? new BackstopContractV2(BACKSTOP_IDS[poolMeta.version])
        : new BackstopContractV1(BACKSTOP_IDS[Version.V1]);
      const operation = xdr.Operation.fromXDR(backstop.deposit(args), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation(operation);
      if (typeof args.pool_address === 'string') {
        cleanBackstopPoolCache(args.pool_address);
      } else {
        cleanBackstopPoolCache(args.pool_address.toString());
      }
      cleanWalletCache();
    }
  }

  /**
   * Execute an withdraw against the backstop
   * @param poolMeta - The metadata for the pool
   * @param args - The args of the withdraw
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopWithdraw(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const backstop = isV2Contracts(poolMeta.version)
        ? new BackstopContractV2(BACKSTOP_IDS[poolMeta.version])
        : new BackstopContractV1(BACKSTOP_IDS[Version.V1]);
      const operation = xdr.Operation.fromXDR(backstop.withdraw(args), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation(operation);
      if (typeof args.pool_address === 'string') {
        cleanBackstopPoolCache(args.pool_address);
      } else {
        cleanBackstopPoolCache(args.pool_address.toString());
      }
      cleanWalletCache();
    }
  }

  /**
   * Execute an queue withdrawal against the backstop
   * @param poolMeta - The metadata for the pool
   * @param args - The args of the queue withdrawal
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopQueueWithdrawal(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const backstop = isV2Contracts(poolMeta.version)
        ? new BackstopContractV2(BACKSTOP_IDS[poolMeta.version])
        : new BackstopContractV1(BACKSTOP_IDS[Version.V1]);
      const operation = xdr.Operation.fromXDR(backstop.queueWithdrawal(args), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation(operation);
      if (typeof args.pool_address === 'string') {
        cleanBackstopPoolCache(args.pool_address);
      } else {
        cleanBackstopPoolCache(args.pool_address.toString());
      }
    }
  }

  /**
   * Execute an dequeue withdrawal against the backstop
   * @param poolMeta - The metadata for the pool
   * @param args - The args of the queue withdrawal
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopDequeueWithdrawal(
    poolMeta: PoolMeta,
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      const backstop = isV2Contracts(poolMeta.version)
        ? new BackstopContractV2(BACKSTOP_IDS[poolMeta.version])
        : new BackstopContractV1(BACKSTOP_IDS[Version.V1]);
      const operation = xdr.Operation.fromXDR(backstop.dequeueWithdrawal(args), 'base64');
      if (sim) {
        return await simulateOperation(operation);
      }
      await invokeSorobanOperation(operation);
      if (typeof args.pool_address === 'string') {
        cleanBackstopPoolCache(args.pool_address);
      } else {
        cleanBackstopPoolCache(args.pool_address.toString());
      }
    }
  }

  /**
   * Claim emissions from the backstop
   * @param poolMeta - The metadata for the pool
   * @param claimArgs - The "claim" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The claimed amount
   */
  async function backstopClaim(
    poolMeta: PoolMeta,
    claimArgs: BackstopClaimV1Args | BackstopClaimV2Args,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    if (connected) {
      let operation = '';
      if (isV2Contracts(poolMeta.version)) {
        operation = new BackstopContractV2(BACKSTOP_IDS[poolMeta.version]).claim(
          claimArgs as BackstopClaimV2Args
        );
      } else {
        operation = new BackstopContractV1(BACKSTOP_IDS[Version.V1]).claim(
          claimArgs as BackstopClaimV1Args
        );
      }
      if (sim) {
        return await simulateOperation(xdr.Operation.fromXDR(operation, 'base64'));
      }
      await invokeSorobanOperation(xdr.Operation.fromXDR(operation, 'base64'));
      if (typeof claimArgs.pool_addresses[0] === 'string') {
        cleanBackstopPoolCache(claimArgs.pool_addresses[0]);
      } else {
        cleanBackstopPoolCache(claimArgs.pool_addresses[0].toString());
      }
      cleanBackstopCache();
      cleanWalletCache();
    }
  }

  /**
   * Execute a single sided deposit against a comet pool
   * @param cometPoolId - The comet pool id
   * @param args - The args of the deposit
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The simulated transaction response, or undefined
   */
  async function cometSingleSidedDeposit(
    cometPoolId: string,
    args: CometSingleSidedDepositArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    try {
      if (connected) {
        let cometClient = new CometClient(cometPoolId);
        const operation = cometClient.depositTokenInGetLPOut(args);
        if (sim) {
          return await simulateOperation(operation);
        }
        await invokeSorobanOperation(operation);
        cleanBackstopCache();
        cleanWalletCache();
      }
    } catch (e) {
      throw e;
    }
  }

  async function cometJoin(
    cometPoolId: string,
    args: CometLiquidityArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    try {
      if (connected) {
        let cometClient = new CometClient(cometPoolId);
        const operation = cometClient.join(args);
        if (sim) {
          return await simulateOperation(operation);
        }
        await invokeSorobanOperation(operation);
        cleanBackstopCache();
        cleanWalletCache();
      }
    } catch (e) {
      throw e;
    }
  }

  async function cometExit(
    cometPoolId: string,
    args: CometLiquidityArgs,
    sim: boolean
  ): Promise<rpc.Api.SimulateTransactionResponse | undefined> {
    try {
      if (connected) {
        let cometClient = new CometClient(cometPoolId);
        const operation = cometClient.exit(args);
        if (sim) {
          return await simulateOperation(operation);
        }
        await invokeSorobanOperation(operation);
        cleanBackstopCache();
        cleanWalletCache();
      }
    } catch (e) {
      throw e;
    }
  }

  async function faucet(): Promise<undefined> {
    if (connected && process.env.NEXT_PUBLIC_PASSPHRASE === Networks.TESTNET) {
      // the faucet only allows requests from testnet.blend.capital; other hosts relay it themselves
      const faucetUrl =
        process.env.NEXT_PUBLIC_FAUCET_URL ||
        'https://ewqw4hx7oa.execute-api.us-east-1.amazonaws.com';
      const url = `${faucetUrl}/getAssets?userId=${walletAddress}`;
      try {
        setTxStatus(TxStatus.BUILDING);
        const resp = await fetch(url, { method: 'GET' });
        const txEnvelopeXDR = await resp.text();
        let transaction = new Transaction(
          xdr.TransactionEnvelope.fromXDR(txEnvelopeXDR, 'base64'),
          network.passphrase
        );

        let signedTx = new Transaction(await sign(transaction.toXDR()), network.passphrase);
        const result = await sendTransaction(signedTx);
        if (result) {
          cleanWalletCache();
        }
      } catch (e: any) {
        console.error('Failed submitting transaction: ', e);
        setFailureMessage(e?.message);
        setTxStatus(TxStatus.FAIL);
        return undefined;
      }
    }
  }

  async function createTrustlines(assets: Asset[]) {
    try {
      if (connected) {
        const account = await stellarRpc.getAccount(walletAddress);
        const tx_builder = new TransactionBuilder(account, {
          networkPassphrase: network.passphrase,
          fee: txInclusionFee.fee,
          timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 * 1000 },
        });
        for (let asset of assets) {
          const trustlineOperation = Operation.changeTrust({
            asset: asset,
          });
          tx_builder.addOperation(trustlineOperation);
        }
        const transaction = tx_builder.build();
        const signedTx = await sign(transaction.toXDR());
        const tx = new Transaction(signedTx, network.passphrase);
        setTxType(TxType.PREREQ);
        const result = await sendTransaction(tx);
        if (result) {
          cleanWalletCache();
        }
      }
    } catch (e: any) {
      console.error('Failed to create trustline: ', e);
      setFailureMessage(e?.message);
      setTxStatus(TxStatus.FAIL);
    }
  }

  async function getNetworkDetails() {
    try {
      const freighterApi = await import('@stellar/freighter-api');
      const freighterDetails: any = await freighterApi.getNetworkDetails();
      return {
        rpc: freighterDetails.sorobanRpcUrl,
        passphrase: freighterDetails.networkPassphrase,
        maxConcurrentRequests: network.maxConcurrentRequests,
        horizonUrl: freighterDetails.networkUrl,
      };
    } catch (e) {
      console.error('Failed to get network details from freighter', e);
      return network;
    }
  }

  return (
    <WalletContext.Provider
      value={{
        connected,
        walletAddress,
        txStatus,
        lastTxHash: txHash,
        lastTxFailure: txFailure,
        txType,
        walletId: autoConnect,
        isLoading: loading,
        txInclusionFee,
        connect,
        disconnect,
        refresh,
        clearLastTx,
        restore,
        poolSubmit,
        poolClaim,
        backstopDeposit,
        backstopWithdraw,
        backstopQueueWithdrawal,
        backstopDequeueWithdrawal,
        backstopClaim,
        cometSingleSidedDeposit,
        cometJoin,
        cometExit,
        faucet,
        createTrustlines,
        getNetworkDetails,
        setTxInclusionFee,
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
