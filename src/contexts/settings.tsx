import { useMediaQuery, useTheme } from '@mui/material';
import React, { useContext, useState } from 'react';
import { useLocalStorageState } from '../hooks';

export enum ViewType {
  MOBILE,
  COMPACT,
  REGULAR,
}
export interface ISettingsContext {
  viewType: ViewType;
  lastPool: string | undefined;
  setLastPool: (lastPool: string) => void;
  showLend: boolean;
  setShowLend: (showLend: boolean) => void;
  showDeposit: boolean;
  setShowDeposit: (showDeposit: boolean) => void;
}

const SettingsContext = React.createContext<ISettingsContext | undefined>(undefined);

export const SettingsProvider = ({ children = null as any }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('lg')); // hook causes refresh on change
  const mobile = useMediaQuery(theme.breakpoints.down('sm')); // hook causes refresh on change

  const [lastPool, setLastPool] = useLocalStorageState('lastPool', undefined);
  const [showLend, setShowLend] = useState<boolean>(true);
  const [showDeposit, setShowDeposit] = useState<boolean>(true);

  let viewType: ViewType;
  if (mobile) viewType = ViewType.MOBILE;
  else if (compact) viewType = ViewType.COMPACT;
  else viewType = ViewType.REGULAR;

  return (
    <SettingsContext.Provider
      value={{
        viewType,
        lastPool,
        setLastPool,
        showLend,
        setShowLend,
        showDeposit,
        setShowDeposit,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('Component rendered outside the provider tree');
  }

  return context;
};
