import { Reserve } from '@blend-capital/blend-sdk';
import { Horizon, StellarToml } from 'stellar-sdk';
import { TOKEN_META } from '../utils/token_display';

export type StellarTokenMetadata = {
  assetId: string;
  code: string;
  domain?: string;
  image?: string;
  issuer: string;
};
/**
 * based on an implementation from the freighter api https://github.com/stellar/freighter/blob/8cc2db65c2fcb0a1ce515431bc1c9212a06f682a/%40shared/api/helpers/getIconUrlFromIssuer.ts
 */
export async function getTokenMetadataFromTOML(
  horizonServer: Horizon.Server,
  reserve: Reserve
): Promise<StellarTokenMetadata> {
  const assetId = reserve.assetId;
  const code = TOKEN_META[assetId as keyof typeof TOKEN_META]?.code;
  // set default stellar token metadata values
  let iconData: StellarTokenMetadata = {
    assetId,
    code,
    domain: '',
    image: code ? `/icons/tokens/${code.toLowerCase()}.svg` : undefined,
    issuer: '',
  };
  let toml;

  if (!reserve.tokenMetadata.asset) {
    // set soroban token defaults
    return { ...iconData, image: `/icons/tokens/soroban.svg` };
  }
  if (reserve.tokenMetadata.asset.isNative()) {
    // set native asset defaults
    iconData = {
      assetId: 'XLM',
      code: 'XLM',
      domain: 'stellar.org',
      image: `/icons/tokens/xlm.svg`,
      issuer: '',
    };
    return iconData;
  } else {
    const assetCode = reserve.tokenMetadata.asset.code;
    const assetIssuer = reserve.tokenMetadata.asset.issuer;
    try {
      const cachedData = localStorage.getItem(assetIssuer);
      if (cachedData) {
        const currencyDetails = JSON.parse(cachedData);
        return currencyDetails;
      }
      /* Otherwise, 1. load their account from the API */
      const tokenAccount = await horizonServer.loadAccount(assetIssuer);
      const tokenAccountHomeDomain = tokenAccount.home_domain;
      if (!tokenAccountHomeDomain) {
        // If the account doesn't have a home domain, we can't load the stellar.toml file return default stellar asset token metadata values (will always happen on testnet )
        return {
          ...iconData,
          assetId,
          code: assetCode,
          issuer: assetIssuer,
        };
      }
      /* 2. Use their domain from their API account and use it attempt to load their stellar.toml */
      toml = await StellarToml.Resolver.resolve(tokenAccountHomeDomain || '');
      if (toml.CURRENCIES) {
        /* If we find some currencies listed, check to see if they have the currency we're looking for listed */
        for (const { code: currencyCode, issuer, image } of toml.CURRENCIES) {
          // Check if all necessary fields are available
          if (
            currencyCode &&
            issuer &&
            image &&
            assetCode === currencyCode &&
            assetIssuer === issuer
          ) {
            // Assign the image URL from the TOML data
            // Cache the image URL and related information
            localStorage.setItem(`icon-${assetId}`, image);
            localStorage.setItem(`domain-${assetId}`, tokenAccountHomeDomain || '');
            // Store a JSON representation of the currency details in local storage
            const currencyDetails = {
              assetId: assetId,
              issuer: assetIssuer,
              code: currencyCode,
              domain: tokenAccountHomeDomain || '',
              image,
            };
            localStorage.setItem(assetId, JSON.stringify(currencyDetails));
            iconData = currencyDetails;
            // Exit the loop since we found the matching currency
            break;
          }
        }
      }
      // Return the stellar asset metadata
      return iconData;
    } catch (e) {
      console.error(e);
      // return stellar asset defaults if we can't find the icon
      return iconData;
    }
  }
}
