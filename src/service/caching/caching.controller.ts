import { Controller, Get, Param } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { CacheService } from './caching.service'

@Controller('caching')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @ApiOperation({ tags: ['缓存'], description: '获取所有缓存' })
  @Get()
  findAll() {
    return this.cacheService.findAll()
  }

  @ApiOperation({ tags: ['缓存'], description: '获取指定缓存' })
  @Get('keys/:key')
  findOne(@Param('key') key: string) {
    return this.cacheService.findOne(key)
  }

  @ApiOperation({ tags: ['缓存'], description: '获取所有缓存 key' })
  @Get('keys')
  findAllKeys() {
    return this.cacheService.findAllKeys()
  }
}
