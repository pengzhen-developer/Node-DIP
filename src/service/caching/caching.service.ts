import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findAll() {
    const caches = {}
    const cacheKeys = await this.cacheManager.store.keys()

    for (const key of cacheKeys) {
      caches[key] = await this.cacheManager.get(key)
    }

    return caches
  }

  async findOne(key: string) {
    return this.cacheManager.get(key)
  }

  async findAllKeys() {
    const cacheKeys = await this.cacheManager.store.keys()

    return cacheKeys
  }
}
