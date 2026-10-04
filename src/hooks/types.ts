import { PoolMetadata } from '@blend-capital/blend-sdk';
import { Version } from '../utils/version';

export interface PoolMeta extends PoolMetadata {
  id: string;
  version: Version;
}

export const NOT_BLEND_POOL_ERROR_MESSAGE = 'NOT_BLEND_POOL';
