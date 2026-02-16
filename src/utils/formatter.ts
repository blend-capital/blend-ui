/// Information display formatting utils

const POSTFIXES = ['', 'k', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y'];

/**
 * Format a number as a balance
 * @dev - Inspired by Aave's FormattedNumber:
 *        https://github.com/aave/interface/blob/main/src/components/primitives/FormattedNumber.tsx
 * @param amount - The number being converted to a balance
 * @param decimals - The number of decimals to display (required if amount is bigint)
 * @returns string in the form of a formatted balance. Does not include units.
 */
export function toBalance(
  amount: bigint | number | undefined,
  decimals?: number | undefined
): string {
  if (amount == undefined || (typeof amount === 'number' && !isFinite(amount))) {
    return '--';
  }
  let numValue: number;
  if (typeof amount === 'bigint' && decimals !== undefined) {
    numValue = Number(amount) / 10 ** decimals;
  } else if (typeof amount === 'number') {
    numValue = amount;
  } else {
    return '--';
  }

  let visibleDecimals = 0;
  if (numValue === 0) {
    visibleDecimals = 0;
  } else {
    if (numValue >= 1) {
      visibleDecimals = 2;
    } else {
      visibleDecimals = Math.min(decimals ?? 7, 7);
    }
  }

  if (numValue === 0) {
    return '0';
  }

  const absValue = Math.abs(numValue);
  if (absValue < 10) {
    return numValue.toFixed(visibleDecimals);
  } else if (absValue < 10000) {
    return numValue.toFixed(2);
  }

  const minValue = 10 ** -(visibleDecimals as number);
  const isSmallerThanMin = numValue !== 0 && Math.abs(numValue) < Math.abs(minValue);
  let adjAmount = isSmallerThanMin ? minValue : numValue;

  const bnValue = numValue;

  const integerPlaces = bnValue.toFixed(0).length;
  const postfixIndex = Math.min(
    Math.floor(integerPlaces ? (integerPlaces - 1) / 3 : 0),
    POSTFIXES.length - 1
  );
  adjAmount = numValue / Math.pow(10, 3 * postfixIndex);

  const formattedStr = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: visibleDecimals,
    minimumFractionDigits: visibleDecimals,
  }).format(adjAmount);
  return `${formattedStr}${POSTFIXES[postfixIndex]}`;
}

/**
 * Format a number as a percentage
 * @param rate - The number expressed in decimal
 * @param decimals - The number of decimals to display (default is 2)
 * @returns the number as a percentage
 */
export function toPercentage(rate: number | undefined, decimals = 2): string {
  if (rate == undefined) {
    return '--';
  }

  const adjRate = rate * 100;
  const formattedStr = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(adjRate);
  return `${formattedStr}%`;
}

/**
 * Format an addressed into a compressed version
 * @param address
 */
export function toCompactAddress(address: string | undefined): string {
  if (!address) {
    return '';
  } else if (address.length < 10) {
    return address;
  }

  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`;
}

/**
 * Format a time span in seconds into a readable string
 */
export function toTimeSpan(secondsLeft: number): string {
  let d = Math.floor(secondsLeft / (3600 * 24));
  secondsLeft -= d * 3600 * 24;
  let h = Math.floor(secondsLeft / 3600);
  secondsLeft -= h * 3600;
  let m = Math.floor(secondsLeft / 60);
  secondsLeft -= m * 60;

  const tmp = [];
  d && tmp.push(d + 'd');
  (d || h) && tmp.push(h + 'h');
  (d || h || m) && tmp.push(m + 'm');
  !d && tmp.push(secondsLeft + 's');
  return tmp.join(' ');
}

export function getEmissionTextFromValue(value: number, symbol: string) {
  return `This position earns an additional ${toBalance(value, 7)} BLND per year per ${symbol}.`;
}
