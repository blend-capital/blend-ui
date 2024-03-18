import { ContractResponse, Q4W, RestoreError, UserPositions } from '@blend-capital/blend-sdk';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Alert, AlertColor, Box, BoxProps, Typography } from '@mui/material';
import { useWallet } from '../../contexts/wallet';
import theme from '../../theme';
import { OpaqueButton } from './OpaqueButton';
export interface TxOverviewProps extends BoxProps {
  isDisabled: boolean;
  disabledType: AlertColor | undefined;
  reason: string | undefined;
  simResponse: ContractResponse<UserPositions | bigint | Q4W> | undefined;
}

export interface SubmitError {
  isSubmitDisabled: boolean;
  isMaxDisabled: boolean;
  reason: string | undefined;
  disabledType: AlertColor | undefined;
}

export const TxOverview: React.FC<TxOverviewProps> = ({
  isDisabled,
  disabledType,
  reason,
  simResponse,
  children,
  sx,
  ...props
}) => {
  const { restore } = useWallet();
  const severity = disabledType ?? 'warning';
  const message = reason ?? 'Unable to process your transaction.';

  function handleRestore() {
    let error = simResponse?.result.unwrapErr() as RestoreError;
    restore(error.restorePreamble);
  }

  function checkError() {
    if (simResponse?.result.isErr() && simResponse.result.unwrapErr() instanceof RestoreError) {
      return (
        <Box
          sx={{
            width: '100%',
            padding: '12px',
            display: 'flex',
            borderRadius: '5px',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              marginBottom: '12px',
              flexDirection: 'row',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <InfoOutlinedIcon
              sx={{
                color: theme.palette.warning.main,
                marginLeft: '12px',
              }}
            />
            <Typography
              variant="h5"
              sx={{
                paddingRight: '12px',
                paddingLeft: '12px',
                color: theme.palette.warning.main,
              }}
            >
              This transaction ran into expired entries that need to be restored before proceeding.
            </Typography>
          </Box>
          <OpaqueButton
            onClick={handleRestore}
            palette={theme.palette.warning}
            sx={{ width: '100%', marginRight: '12px', padding: '6px' }}
          >
            Restore
          </OpaqueButton>
        </Box>
      );
    } else {
      return (
        <Alert
          severity={severity}
          sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}
        >
          <Typography variant="body2">{message}</Typography>
        </Alert>
      );
    }
  }

  if (isDisabled) {
    return checkError();
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        zIndex: 12,
        borderRadius: '5px',
      }}
    >
      {isDisabled ? (
        checkError()
      ) : (
        <>
          <Typography
            variant="h5"
            sx={{ marginLeft: '24px', marginBottom: '12px', marginTop: '12px' }}
          >
            Transaction Overview
          </Typography>
          {children}
        </>
      )}
    </Box>
  );
};
