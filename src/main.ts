import { RequestMethod } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptor/logging.interceptor'
import { TimeoutInterceptor } from './common/interceptor/timeout.interceptor'
import { TransformInterceptor } from './common/interceptor/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 全局路由前缀
  app.setGlobalPrefix('api', { exclude: [{ path: '/', method: RequestMethod.GET }] })
  // 全局拦截器 - 日志
  app.useGlobalInterceptors(new LoggingInterceptor())
  // 全局拦截器 - 超时
  app.useGlobalInterceptors(new TimeoutInterceptor())
  // 全局拦截器 - 成功结构
  app.useGlobalInterceptors(new TransformInterceptor())
  // 全局过滤器 - 异常提醒
  app.useGlobalFilters(new HttpExceptionFilter())
  // SwaggerModule
  const config = new DocumentBuilder().setTitle('dip-core').build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  await app.listen(80)
}
bootstrap()
