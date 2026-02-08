import {
  Account,
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

export async function getTokenBalance(
  stellar_rpc: rpc.Server,
  network_passphrase: string,
  token_id: string,
  address: Address
): Promise<bigint> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network_passphrase,
  });
  tx_builder.addOperation(new Contract(token_id).call('balance', address.toScVal()));
  const result: rpc.Api.SimulateTransactionResponse = await stellar_rpc.simulateTransaction(
    tx_builder.build()
  );
  if (rpc.Api.isSimulationSuccess(result)) {
    let resultScVal = (result as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    if (resultScVal == undefined) {
      console.error(
        `Error: unable to fetch balance for token, no return value detected: ${token_id}, ${result?.result}`
      );
      return BigInt(0);
    } else {
      return scValToNative(resultScVal);
    }
  } else {
    let error = rpc.Api.isSimulationError(result)
      ? result.error
      : rpc.Api.isSimulationRestore(result)
      ? 'data must be restored'
      : 'unknown error';
    if (error.includes('Error(Contract, #13)')) {
      // this is an expected error and means the user does not have a trustline for the token, so we can return a balance of 0 without logging an error
      return BigInt(0);
    } else {
      console.error(`Error: unable to fetch balance for token: ${token_id}, error: ${error}`);
      return BigInt(0);
    }
  }
}
