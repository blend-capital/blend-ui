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
 * Whether a deployment runs the v2 contracts.
 */
export function isV2Contracts(version: Version | undefined): boolean {
  return version === Version.V2 || version === Version.V2_1;
}

/**
 * The deployment used to manage the legacy BLND-USDC LP token shared by V1 and V2, if any.
 */
export const LEGACY_LP_VERSION: Version | undefined = ENABLED_VERSIONS.find(
  (version) => version !== Version.V2_1
);

/**
 * The deployments with a distinct BLND-USDC LP token, oldest first.
 */
export const LP_VERSIONS: Version[] = ENABLED_VERSIONS.filter(
  (version) => version === Version.V2_1 || version === LEGACY_LP_VERSION
);

/**
 * Map a deployment to the deployment used to manage its BLND-USDC LP token.
 */
export function toLPVersion(version: Version): Version {
  return version === Version.V2_1 ? version : LEGACY_LP_VERSION ?? version;
}

/**
 * The display name of a deployment's BLND-USDC LP token.
 */
export function lpVersionName(version: Version): string {
  return version === Version.V2_1 ? Version.V2_1 : 'V1-2';
}
