import { Networks } from '@stellar/stellar-sdk';
import { useSettings } from '../contexts';
import { LATEST_VERSION, MAINNET_V2_REWARD_ZONE, Version } from '../utils/version';
import { useBackstop } from './api';

/**
 * Fetch the pool to link to when the user has not visited a pool yet. Uses the first pool in
 * the latest deployment's reward zone, or the V2 reward zone if the latest one is empty or
 * fails to load.
 * @returns The default pool ID, or undefined while loading.
 */
export function useDefaultPoolId(): string | undefined {
  const { lastPool } = useSettings();
  const isTestnet = process.env.NEXT_PUBLIC_PASSPHRASE === Networks.TESTNET;
  const { data: latestBackstop, isError: latestFailed } = useBackstop(
    LATEST_VERSION,
    lastPool === undefined
  );
  const latestResolved = latestBackstop !== undefined || latestFailed;
  const latestPoolId = latestBackstop?.config.rewardZone[0];
  // the mainnet V2 reward zone is empty due to the Comet bug, so use its prior reward zone
  const { data: v2Backstop } = useBackstop(
    Version.V2,
    isTestnet && lastPool === undefined && latestResolved && latestPoolId === undefined
  );
  if (lastPool !== undefined) {
    return lastPool.id;
  }
  if (!latestResolved) {
    return undefined;
  }
  return latestPoolId ?? (isTestnet ? v2Backstop?.config.rewardZone[0] : MAINNET_V2_REWARD_ZONE[0]);
}
