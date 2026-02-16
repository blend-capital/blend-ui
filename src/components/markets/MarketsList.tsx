import { Version } from '@blend-capital/blend-sdk';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, BoxProps, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../contexts';
import { useBackstop } from '../../hooks/api';
import theme from '../../theme';
import { ReserveTokenMetadata } from '../../utils/token';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { MarketCard } from './MarketCard';
import MarketFilter, { MarketFilters } from './MarketFilter';

interface MarketData {
  poolId: string;
  poolName: string;
  poolTvl: number;
  backstopTvl: number;
  tokenMetadataList: ReserveTokenMetadata[];
  index: number;
}

export interface MarketListProps extends BoxProps {
  version: Version | undefined;
}

export const MarketsList: React.FC<MarketListProps> = ({ version }) => {
  const { blockedPools } = useSettings();
  const { data: backstop } = useBackstop(version);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [marketsData, setMarketsData] = useState<Record<string, MarketData>>({});
  const [sortedPoolIds, setSortedPoolIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<MarketFilters>({
    search: '',
    sortBy: 'poolTvl',
    sortDirection: 'desc',
    selectedAssets: [],
  });

  const availableAssets = Object.values(marketsData)
    .flatMap((market) => market.tokenMetadataList.map((token) => token.assetId))
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  const rewardZone = [...(backstop?.config?.rewardZone ?? [])].reverse();
  const safeRewardZone = useMemo(
    () => rewardZone.filter((poolId) => !blockedPools.includes(poolId)),
    [rewardZone, blockedPools]
  );

  useEffect(() => {
    const loadedMarkets = Object.values(marketsData);

    if (loadedMarkets.length === 0) {
      setSortedPoolIds(safeRewardZone);
      return;
    }

    // Apply search filter if present
    let filteredMarkets = loadedMarkets;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredMarkets = filteredMarkets.filter(
        (market) =>
          (market.poolName && market.poolName.toLowerCase().includes(searchLower)) ||
          market.tokenMetadataList.some((token) => token.symbol.toLowerCase().includes(searchLower))
      );
    }

    // Apply asset filter if any assets are selected
    if (filters.selectedAssets && filters.selectedAssets.length > 0) {
      filteredMarkets = filteredMarkets.filter((market) =>
        filters.selectedAssets.every((asset) =>
          market.tokenMetadataList.some((token) => token.symbol === asset)
        )
      );
    }

    // Sort the filtered markets based on the current sort settings
    filteredMarkets.sort((a, b) => {
      const aValue = filters.sortBy === 'poolTvl' ? a.poolTvl : a.backstopTvl;
      const bValue = filters.sortBy === 'poolTvl' ? b.poolTvl : b.backstopTvl;
      return filters.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Extract the pool IDs in the sorted order
    const sortedIds = filteredMarkets.map((market) => market.poolId);

    // Add any pools that haven't loaded yet to the end of the list
    const poolsWithNoData = safeRewardZone.filter((poolId) => !marketsData[poolId]);
    // Only update state if the result is different
    const newSortedIds = [...sortedIds, ...poolsWithNoData];
    if (JSON.stringify(newSortedIds) !== JSON.stringify(sortedPoolIds)) {
      setSortedPoolIds(newSortedIds);
    }
  }, [
    marketsData,
    safeRewardZone,
    filters.sortBy,
    filters.sortDirection,
    filters.search,
    filters.selectedAssets,
  ]);

  // Reset all state related to market data when version changes
  useEffect(() => {
    setMarketsData({});
    setSortedPoolIds([]);
    setCurrentIndex(0);
    handleFilterChange('selectedAssets', []);
  }, [version]);

  // Handle pool data loading
  function handlePoolLoaded(
    poolId: string,
    index: number,
    poolData: {
      name: string;
      poolTvl: number;
      backstopTvl: number;
      tokenMetadataList: ReserveTokenMetadata[];
    }
  ) {
    // Store the loaded pool data
    setMarketsData((prev) => {
      // Skip if we already have this data
      if (prev[poolId]) return prev;

      return {
        ...prev,
        [poolId]: {
          poolId,
          poolName: poolData.name,
          poolTvl: poolData.poolTvl,
          backstopTvl: poolData.backstopTvl,
          tokenMetadataList: poolData.tokenMetadataList,
          index,
        },
      };
    });

    // Update index for progressive loading
    setCurrentIndex((prev) => {
      if (index >= prev) {
        return Math.min(prev + 1, safeRewardZone.length);
      }
      return prev;
    });
  }

  // Handle filter changes from MarketFilter component
  const handleFilterChange = (key: keyof MarketFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Determine how many pools to display based on the current index
  const poolsToDisplay = sortedPoolIds.slice(0, currentIndex + 1);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        scrollbarColor: 'black grey',
        padding: '6px',
        marginTop: '12px',
      }}
    >
      <Row
        width={SectionSize.FULL}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '6px',
          mb: '6px',
        }}
      >
        <MarketFilter
          onFilterChange={handleFilterChange}
          availableAssets={availableAssets}
          defaultFilters={filters}
        />
      </Row>
      {safeRewardZone.length === 0 && (
        <Section
          width={SectionSize.FULL}
          sx={{
            background: theme.palette.info.opaque,
            color: theme.palette.text.primary,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '12px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <InfoOutlinedIcon />
            <Typography variant="body2">No pools in the reward zone</Typography>
          </Box>
        </Section>
      )}

      {poolsToDisplay.length === 0 && Object.keys(marketsData).length > 0 && (
        <Section
          width={SectionSize.FULL}
          sx={{
            background: theme.palette.info.opaque,
            color: theme.palette.text.primary,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '12px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <InfoOutlinedIcon />
            <Typography variant="body2">No pools match the current filters</Typography>
          </Box>
        </Section>
      )}

      {poolsToDisplay.map((poolId, index) => (
        <MarketCard key={poolId} poolId={poolId} index={index} onLoaded={handlePoolLoaded} />
      ))}
    </Box>
  );
};
