import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  bootstrap() {
    return true
  }

  @Get('/re-cache')
  async restore() {
    await this.appService.cache()
    return true
  }
}
