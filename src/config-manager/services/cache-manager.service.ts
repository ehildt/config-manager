import { Cache } from 'cache-manager';
import {
  CACHE_MANAGER,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigManagerUpsertReq } from '../dtos/config-manager-upsert-req.dto';
import { reduceEntities } from './helpers/reduce-entities.helper';

const NO_CONTENT = 'NoContent';

@Injectable()
export class CacheManagerService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async upsert(serviceId: string, req: ConfigManagerUpsertReq[]) {
    const cache = (await this.cacheManager.get(serviceId)) ?? ({} as any);
    const data = { ...cache, ...reduceEntities(req) };
    return this.cacheManager.set(serviceId, data);
  }

  async upsertFromEntities(serviceId: string, entities: any) {
    const cache = (await this.cacheManager.get(serviceId)) ?? ({} as any);
    const data = { ...cache, ...reduceEntities(entities) };
    await this.cacheManager.set(serviceId, data);
    return data;
  }

  async getByServiceId(serviceId: string) {
    const cache = await this.cacheManager.get(serviceId);
    if (!cache) throw new HttpException(NO_CONTENT, HttpStatus.NO_CONTENT);
    return cache;
  }

  async getByServiceIdConfigIds(serviceId: string, configIds: string[]) {
    const cache = (await this.cacheManager.get(serviceId)) ?? ({} as any);
    const keys = Object.keys(cache);
    const matchedKeys = keys.filter((c) => configIds.includes(c));

    if (matchedKeys?.length >= configIds?.length)
      return configIds.reduce(
        (acc, key) => ({ ...acc, [key]: cache[key] }),
        {},
      );

    throw new UnprocessableEntityException({
      message: `N/A (config): ${configIds.filter(
        (id) => !keys.find((k) => k === id),
      )}`,
    });
  }

  async deleteByServiceId(serviceId: string) {
    return this.cacheManager.del(serviceId);
  }

  async deleteByServiceIdConfigId(serviceId: string, configIds?: string[]) {
    const cache = (await this.cacheManager.get(serviceId)) ?? ({} as any);
    const keys = Object.keys(cache).filter(
      (key) => delete cache[configIds.find((id) => id === key)],
    );

    if (keys.length) return this.cacheManager.set(serviceId, cache);
    return this.cacheManager.del(serviceId);
  }
}