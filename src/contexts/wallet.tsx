import {
  BackstopClaimArgs,
  BackstopContract,
  ContractErrorType,
  ContractResponse,
  PoolBackstopActionArgs,
  PoolClaimArgs,
  PoolContract,
  Positions,
  Q4W,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import {
  FreighterModule,
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  XBULL_ID,
  xBullModule,
} from '@creit.tech/stellar-wallets-kit/build/main';
import React, { useContext, useEffect, useState } from 'react';
import {
  BASE_FEE,
  Operation,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  scValToBigInt,
  xdr,
} from 'stellar-sdk';
import { useLocalStorageState } from '../hooks';
import { BACKSTOP_ID } from '../store/blendSlice';
import { useStore } from '../store/store';
import {
  CometClient,
  cometPoolDepositArgs,
  cometPoolGetDepositAmountByLPArgs,
} from '../utils/comet';
import { useSettings } from './settings';

export interface IWalletContext {
  connected: boolean;
  walletAddress: string;
  txStatus: TxStatus;
  lastTxHash: string | undefined;
  lastTxFailure: string | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearLastTx: () => void;
  poolSubmit: (
    poolId: string,
    submitArgs: SubmitArgs,
    sim: boolean
  ) => Promise<ContractResponse<Positions> | undefined>;
  poolClaim: (
    poolId: string,
    claimArgs: PoolClaimArgs,
    sim: boolean
  ) => Promise<ContractResponse<bigint> | undefined>;
  backstopDeposit(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined>;
  backstopWithdraw(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined>;
  backstopQueueWithdrawal(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<Q4W> | undefined>;
  backstopDequeueWithdrawal(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<void> | undefined>;
  backstopClaim(
    args: BackstopClaimArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined>;
  backstopMintByDepositTokenAmount(
    args: cometPoolDepositArgs,
    sim: boolean,
    lpTokenAddress: string
  ): Promise<ContractResponse<bigint> | undefined>;
  backstopMintByLPTokenAmount(
    args: cometPoolGetDepositAmountByLPArgs,
    sim: boolean,
    lpTokenAddress: string
  ): Promise<ContractResponse<bigint> | undefined>;
  faucet(): Promise<undefined>;
}

export enum TxStatus {
  NONE,
  BUILDING,
  SIGNING,
  SUBMITTING,
  SUCCESS,
  FAIL,
}

const WalletContext = React.createContext<IWalletContext | undefined>(undefined);

export const WalletProvider = ({ children = null as any }) => {
  const { lastPool } = useSettings();

  const network = useStore((state) => state.network);
  const rpc = useStore((state) => state.rpcServer());
  const loadBlendData = useStore((state) => state.loadBlendData);
  const loadUserData = useStore((state) => state.loadUserData);
  const clearUserData = useStore((state) => state.clearUserData);

  const [connected, setConnected] = useState<boolean>(false);
  const [autoConnect, setAutoConnect] = useLocalStorageState('autoConnectWallet', 'false');

  const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.NONE);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [txFailure, setTxFailure] = useState<string | undefined>(undefined);

  // wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');

  const walletKit: StellarWalletsKit = new StellarWalletsKit({
    network: network.passphrase as WalletNetwork,
    selectedWalletId: autoConnect !== undefined && autoConnect !== 'false' ? autoConnect : XBULL_ID,
    modules: [new xBullModule(), new FreighterModule()],
  });

  useEffect(() => {
    if (!connected && autoConnect !== 'false') {
      // @dev: timeout ensures chrome has the ability to load extensions
      setTimeout(() => {
        handleSetWalletAddress();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  function setFailureMessage(message: string | undefined) {
    if (message) {
      // some contract failures include diagnostic information. If so, try and remove it.
      let substrings = message.split('Event log (newest first):');
      if (substrings.length > 1) {
        setTxFailure(substrings[0].trimEnd());
      }
    }
  }

  /**
   * Connect a wallet to the application via the walletKit
   */
  async function handleSetWalletAddress() {
    try {
      const publicKey = await walletKit.getPublicKey();
      setWalletAddress(publicKey);
      setConnected(true);
      await loadUserData(publicKey);
    } catch (e: any) {
      console.error('Unable to load wallet information: ', e);
    }
  }

  /**
   * Open up a modal to connect the user's browser wallet
   */
  async function connect() {
    try {
      await walletKit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          walletKit.setWallet(option.id);
          setAutoConnect(option.id);
          await handleSetWalletAddress();
        },
      });
    } catch (e: any) {
      console.error('Unable to connect wallet: ', e);
    }
  }

  function disconnect() {
    clearUserData();
    setWalletAddress('');
    setConnected(false);
    setAutoConnect('false');
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
        let { result } = await walletKit.signTx({
          xdr: xdr,
          publicKeys: [walletAddress],
          network: network.passphrase as WalletNetwork,
        });
        setTxStatus(TxStatus.SUBMITTING);
        return result;
      } catch (e: any) {
        if (e === 'User declined access') {
          setTxFailure('Transaction rejected by wallet.');
        } else if (typeof e === 'string') {
          setTxFailure(e);
        }

        setTxStatus(TxStatus.FAIL);
        throw e;
      }
    } else {
      throw new Error('Not connected to a wallet');
    }
  }

  async function restore(
    simulation: SorobanRpc.Api.SimulateTransactionRestoreResponse,
    transaction: Transaction
  ): Promise<ContractResponse<void>> {
    let account = await rpc.getAccount(walletAddress);
    // if (SorobanRpc.Api.isSimulationRestore(simulation)) {
    setTxStatus(TxStatus.BUILDING);
    let fee = parseInt(simulation.restorePreamble.minResourceFee) + parseInt(transaction.fee);
    let restore_tx = new TransactionBuilder(account, { fee: fee.toString() })
      .setNetworkPassphrase(network.passphrase)
      .setSorobanData(simulation.restorePreamble.transactionData.build())
      .addOperation(Operation.restoreFootprint({}))
      .build();
    let signed_restore_tx = new Transaction(await sign(restore_tx.toXDR()), network.passphrase);
    setTxHash(signed_restore_tx.hash().toString('hex'));
    let restore_tx_resp = await sendTransaction(signed_restore_tx, (result: string) => undefined);
    if (restore_tx_resp) {
      return restore_tx_resp;
    } else {
      throw new Error('Restore transaction failed');
    }
  }

  async function sendTransaction<T>(
    transaction: Transaction,
    parser: (result: string) => T
  ): Promise<ContractResponse<T> | undefined> {
    let send_tx_response = await rpc.sendTransaction(transaction);
    let curr_time = Date.now();
    while (send_tx_response.status !== 'PENDING' && Date.now() - curr_time < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      send_tx_response = await rpc.sendTransaction(transaction);
    }
    if (send_tx_response.status !== 'PENDING') {
      setFailureMessage(`Transaction failed to submit with, ${send_tx_response.status}`);
      setTxStatus(TxStatus.FAIL);
      return;
    }

    let get_tx_response = await rpc.getTransaction(send_tx_response.hash);
    while (get_tx_response.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      get_tx_response = await rpc.getTransaction(send_tx_response.hash);
    }
    let tx_resp = ContractResponse.fromTransactionResponse(
      get_tx_response,
      transaction,
      network.passphrase,
      parser
    );
    setTxHash(tx_resp.hash);
    if (tx_resp.result.isOk()) {
      console.log('Successfully submitted transaction: ', tx_resp.hash);
      setTxStatus(TxStatus.SUCCESS);
    } else {
      console.log('Failed Transaction Hash: ', tx_resp.hash);
      setFailureMessage(ContractErrorType[tx_resp.result.unwrapErr().type]);
      setTxStatus(TxStatus.FAIL);
    }
    return tx_resp;
  }

  async function submitTransaction<T>(
    operation: xdr.Operation,
    parser: (result: string) => T,
    sim: boolean,
    poolId?: string | undefined
  ): Promise<ContractResponse<T> | undefined> {
    try {
      // submission calls `sign` internally which handles setting TxStatus
      let account = await rpc.getAccount(walletAddress);
      let tx_builder = new TransactionBuilder(account, {
        networkPassphrase: network.passphrase,
        fee: BASE_FEE,
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 5 * 60 * 1000 },
      }).addOperation(operation);
      let transaction = tx_builder.build();

      let simulation = await rpc.simulateTransaction(transaction);
      let sim_response = ContractResponse.fromSimulationResponse(
        simulation,
        transaction,
        network.passphrase,
        parser
      );
      if (sim) {
        return sim_response;
      }
      if (sim_response.result.isErr()) {
        if (SorobanRpc.Api.isSimulationRestore(simulation)) {
          let response = await restore(simulation, transaction);
          if (response.result.isErr()) {
            return;
          }
          account.incrementSequenceNumber();
          transaction = tx_builder.build();
        } else {
          // TODO: implement error message from type
          setFailureMessage(sim_response.result.unwrapErr().message);
          setTxStatus(TxStatus.FAIL);
          return;
        }
      }

      setFailureMessage(undefined);
      setTxStatus(TxStatus.BUILDING);
      let assembled_tx = SorobanRpc.assembleTransaction(transaction, simulation).build();
      let signedTx = await sign(assembled_tx.toXDR());
      let tx = new Transaction(signedTx, network.passphrase);
      let tx_resp = await sendTransaction(tx, parser);

      // reload data after submission
      try {
        await loadBlendData(true, poolId, walletAddress);
      } catch {
        console.error('Failed reloading blend data for account: ', walletAddress);
      }

      return tx_resp;
    } catch (e: any) {
      console.error('Failed submitting transaction: ', e);
      setFailureMessage(e?.message);
      setTxStatus(TxStatus.FAIL);
      return undefined;
    }
  }

  function clearLastTx() {
    setTxStatus(TxStatus.NONE);
    setTxHash(undefined);
    setTxFailure(undefined);
  }

  //********** Pool Functions ***********/

  /**
   * Submit a request to the pool
   * @param poolId - The contract address of the pool
   * @param submitArgs - The "submit" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function poolSubmit(
    poolId: string,
    submitArgs: SubmitArgs,
    sim: boolean
  ): Promise<ContractResponse<Positions> | undefined> {
    if (connected) {
      let pool = new PoolContract(poolId);
      let operation = xdr.Operation.fromXDR(pool.submit(submitArgs), 'base64');
      return submitTransaction<Positions>(operation, pool.parsers['submit'], sim, poolId);
    }
  }

  /**
   * Claim emissions from the pool
   * @param poolId - The contract address of the pool
   * @param claimArgs - The "claim" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function poolClaim(
    poolId: string,
    claimArgs: PoolClaimArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined> {
    if (connected) {
      let pool = new PoolContract(poolId);
      let operation = xdr.Operation.fromXDR(pool.claim(claimArgs), 'base64');
      return submitTransaction<bigint>(operation, pool.parsers['claim'], sim, poolId);
    }
  }

  //********** Backstop Functions ***********/

  /**
   * Execute an deposit against the backstop
   * @param args - The args of the deposit
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopDeposit(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined> {
    if (connected) {
      let backstop = new BackstopContract(BACKSTOP_ID);
      let operation = xdr.Operation.fromXDR(backstop.deposit(args), 'base64');
      return submitTransaction<bigint>(operation, backstop.parsers['deposit'], sim);
    }
  }

  /**
   * Execute an withdraw against the backstop
   * @param args - The args of the withdraw
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopWithdraw(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined> {
    if (connected) {
      let backstop = new BackstopContract(BACKSTOP_ID);
      let operation = xdr.Operation.fromXDR(backstop.withdraw(args), 'base64');
      return submitTransaction<bigint>(operation, backstop.parsers['withdraw'], sim);
    }
  }

  /**
   * Execute an queue withdrawal against the backstop
   * @param args - The args of the queue withdrawal
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopQueueWithdrawal(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<Q4W> | undefined> {
    if (connected) {
      let backstop = new BackstopContract(BACKSTOP_ID);
      let operation = xdr.Operation.fromXDR(backstop.queueWithdrawal(args), 'base64');
      return submitTransaction<Q4W>(operation, backstop.parsers['queueWithdrawal'], sim);
    }
  }

  /**
   * Execute an dequeue withdrawal against the backstop
   * @param args - The args of the queue withdrawal
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopDequeueWithdrawal(
    args: PoolBackstopActionArgs,
    sim: boolean
  ): Promise<ContractResponse<void> | undefined> {
    if (connected) {
      let backstop = new BackstopContract(BACKSTOP_ID);
      let operation = xdr.Operation.fromXDR(backstop.dequeueWithdrawal(args), 'base64');
      return submitTransaction<void>(operation, backstop.parsers['dequeueWithdrawal'], sim);
    }
  }

  /**
   * Claim emissions from the backstop
   * @param claimArgs - The "claim" function args
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The claimed amount
   */
  async function backstopClaim(
    claimArgs: BackstopClaimArgs,
    sim: boolean
  ): Promise<ContractResponse<bigint> | undefined> {
    if (connected) {
      let backstop = new BackstopContract(BACKSTOP_ID);
      let operation = xdr.Operation.fromXDR(backstop.claim(claimArgs), 'base64');
      return submitTransaction<bigint>(operation, backstop.parsers['claim'], sim);
    }
  }
  /**
   * Execute a mint for the Backstop LP token using deposit token amount
   * @param args - The args of the deposit
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopMintByDepositTokenAmount(
    { depositTokenAddress, depositTokenAmount, minLPTokenAmount }: cometPoolDepositArgs,
    sim: boolean,
    lpTokenAddress: string
  ) {
    try {
      if (connected) {
        let cometClient = new CometClient(lpTokenAddress);
        let operation = cometClient.depositTokenInGetLPOut(
          depositTokenAddress,
          depositTokenAmount,
          minLPTokenAmount,
          walletAddress
        );
        return submitTransaction<bigint>(
          operation,
          (result: string) => {
            return scValToBigInt(xdr.ScVal.fromXDR(result as string, 'base64'));
          },
          sim
        );
      }
    } catch (e) {
      throw e;
    }
  }
  /**
   * Execute a mint for the Backstop LP token using LP token amount
   * @param args - The args of the deposit
   * @param sim - "true" if simulating the transaction, "false" if submitting
   * @returns The Positions, or undefined
   */
  async function backstopMintByLPTokenAmount(
    {
      depositTokenAddress,
      LPTokenAmount,
      maxDepositTokenAmount,
    }: cometPoolGetDepositAmountByLPArgs,
    sim: boolean,
    lpTokenAddress: string
  ) {
    if (connected) {
      let cometClient = new CometClient(lpTokenAddress);
      let operation = cometClient.depositTokenInGetLPOut(
        depositTokenAddress,
        LPTokenAmount,
        maxDepositTokenAmount,
        walletAddress
      );
      return submitTransaction<bigint>(
        operation,
        (result: string) => {
          return scValToBigInt(xdr.ScVal.fromXDR(result as string, 'base64'));
        },
        sim
      );
    }
  }

  async function faucet(): Promise<undefined> {
    if (connected) {
      const url = `https://ewqw4hx7oa.execute-api.us-east-1.amazonaws.com/getAssets?userId=${walletAddress}`;
      try {
        setTxStatus(TxStatus.BUILDING);
        const resp = await fetch(url, { method: 'GET' });
        const txEnvelopeXDR = await resp.text();
        let transaction = new Transaction(
          xdr.TransactionEnvelope.fromXDR(txEnvelopeXDR, 'base64'),
          network.passphrase
        );

        let signedTx = new Transaction(await sign(transaction.toXDR()), network.passphrase);
        await sendTransaction(signedTx, (result: string) => undefined);
        try {
          // reload Horizon account after submission
          try {
            await loadUserData(walletAddress);
          } catch {
            console.error('Failed loading account: ', walletAddress);
          }

          return;
        } catch (e: any) {
          console.error('Failed submitting transaction: ', e);
          setFailureMessage(e?.message);
          setTxStatus(TxStatus.FAIL);
          return undefined;
        }
      } catch (e) {}
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
        connect,
        disconnect,
        clearLastTx,
        poolSubmit,
        poolClaim,
        backstopDeposit,
        backstopWithdraw,
        backstopQueueWithdrawal,
        backstopDequeueWithdrawal,
        backstopClaim,
        backstopMintByDepositTokenAmount,
        backstopMintByLPTokenAmount,
        faucet,
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
