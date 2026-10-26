import { Network, PriceData } from '@blend-capital/blend-sdk';
import {
  Account,
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

export async function createTxBuilder(
  stellar_rpc: rpc.Server,
  network: string,
  source: string
): Promise<TransactionBuilder> {
  try {
    let account = await stellar_rpc.getAccount(source);
    return new TransactionBuilder(account, {
      fee: '1000',
      timebounds: { minTime: 0, maxTime: 0 },
      networkPassphrase: network,
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function getOraclePrices(
  network: Network,
  price_fetcher_id: string,
  oracle_id: string,
  token_ids: string[]
): Promise<Map<string, PriceData>> {
  const stellarRpc = new rpc.Server(network.rpc, network.opts);
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network.passphrase,
  });

  const assets = [];
  for (const id of token_ids) {
    assets.push(
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Stellar'), Address.fromString(id).toScVal()])
    );
  }
  tx_builder.addOperation(
    new Contract(price_fetcher_id).call(
      'get_prices',
      ...[Address.fromString(oracle_id).toScVal(), xdr.ScVal.scvVec(assets)]
    )
  );

  const result = await stellarRpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(result)) {
    const price_result = result.result?.retval;
    if (price_result) {
      const priceResultMap = xdr.expectUnionVariant(price_result, 'scvMap').map;
      if (!priceResultMap || priceResultMap.length !== token_ids.length) {
        throw new Error('Invalid number of prices returned from oracle');
      }
      let priceMap = new Map<string, PriceData>();
      for (const entry of priceResultMap) {
        const assetId = scValToNative(entry.key)[1];
        const price = scValToNative(entry.val);
        if (price == null) {
          throw new Error('Invalid price returned from oracle');
        }
        priceMap.set(assetId, price);
      }
      return priceMap;
    }
  }
  throw new Error('Price fetcher simulation not successful');
}
