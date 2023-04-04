import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now()
    return next.handle().pipe(
      tap((response) => {
        const httpArgumentsHost = context.switchToHttp() // 获取请求上下文
        const request = httpArgumentsHost.getRequest() // 获取请求上下文中的request对象

        // 打印请求方法，请求链接，处理时间和响应数据
        Logger.log(
          `${new Date().toLocaleString('zh-Hans-CN')} ` +
            `${Date.now() - startTime}ms ` +
            `${request.method} ` +
            `${request.url} ` +
            `query:${JSON.stringify(request.query)} ` +
            `params:${JSON.stringify(request.params)} ` +
            `body:${JSON.stringify(request.body)}`,
          'LoggingInterceptor'
        )
      })
    )
  }
}
