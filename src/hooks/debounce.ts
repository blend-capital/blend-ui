import { useEffect, useState } from 'react';
import { TxType } from '../contexts/wallet';

export const RPC_DEBOUNCE_DELAY = 750;

/**
 *
 * @param value state To listen updates from
 * @param delay delay for setTimeOut
 * @param callbackFn optional callback function to change debounce functionality
 * @returns new value set after debounce
 * @dev you can use this in two ways, either to delay the state change or to execute a delayed function based on the state change you set
 */
export function useDebouncedState(
  value: any,
  delay: number,
  txType: TxType,
  callbackFn?: (value: any) => void
) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (callbackFn) {
        callbackFn(value);
      }
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, txType]);

  return debouncedValue;
}
