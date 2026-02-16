import { Box } from '@mui/material';
import { usePool, usePoolMeta, usePoolOracle } from '../../hooks/api';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { PoolLoadError } from './PoolLoadErrorBanner';
import { PoolOracleError } from './PoolOracleErrorBanner';
import { PoolStatusBanner } from './PoolStatusBanner';

export const PoolHealthBanner: React.FC<PoolComponentProps> = ({ poolId, ...props }) => {
  const { data: poolMeta, isError: isPoolMetaError } = usePoolMeta(poolId);
  const { data: pool, isError: isPoolError } = usePool(poolMeta);
  const { isError: isOracleError } = usePoolOracle(pool);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {isPoolMetaError || isPoolError ? (
        <PoolLoadError poolId={poolId} poolName={poolMeta?.name} />
      ) : (
        <PoolStatusBanner status={pool?.metadata?.status} />
      )}
      {isOracleError && (
        <Row>
          <PoolOracleError />
        </Row>
      )}
    </Box>
  );
};
