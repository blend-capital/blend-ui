/**
 * Blend deployments supported by the UI. V2_1 runs the same contracts as V2 with its own
 * backstop and BLND-USDC LP pool.
 */
export enum Version {
  V1 = 'V1',
  V2 = 'V2',
  V2_1 = 'V2.1',
}

/**
 * The backstop contract of each deployment. A deployment without a configured backstop is
 * not supported by the build.
 */
export const BACKSTOP_IDS: Record<Version, string> = {
  [Version.V1]: process.env.NEXT_PUBLIC_BACKSTOP || '',
  [Version.V2]: process.env.NEXT_PUBLIC_BACKSTOP_V2 || '',
  [Version.V2_1]: process.env.NEXT_PUBLIC_BACKSTOP_V2_1 || '',
};

/**
 * The deployments configured for this build, oldest first.
 */
export const ENABLED_VERSIONS: Version[] = Object.values(Version).filter(
  (version) => BACKSTOP_IDS[version] !== ''
);

/**
 * The newest configured deployment.
 */
export const LATEST_VERSION: Version = ENABLED_VERSIONS[ENABLED_VERSIONS.length - 1] ?? Version.V1;

/**
 * The V2.1 backstop holds no BLND, so emissions accrue but claims fail until BLND is sent to it.
 */
export const V2_1_EMISSIONS_NOTICE =
  'V2.1 BLND emissions accrue as credit and may be paid out in the future. This is not guaranteed.';
export const V2_1_CLAIM_NOTICE = 'Claimable once BLND is added to the V2.1 backstop.';

/**
 * Whether a deployment runs the v2 contracts.
 */
export function isV2Contracts(version: Version | undefined): boolean {
  return version === Version.V2 || version === Version.V2_1;
}
