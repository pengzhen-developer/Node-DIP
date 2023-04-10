import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { ApiOperation } from '@nestjs/swagger'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ tags: ['缓存'], description: '重置缓存' })
  @Get('/re-cache')
  async restore() {
    await this.appService.cache()
    return true
  }
}
