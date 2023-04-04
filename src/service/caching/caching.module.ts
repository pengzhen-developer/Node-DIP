import { Module } from '@nestjs/common'
import { CacheService } from './caching.service'
import { CacheController } from './caching.controller'

@Module({
  controllers: [CacheController],
  providers: [CacheService]
})
export class CachingModule {}
