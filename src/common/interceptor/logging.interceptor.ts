import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Response } from 'express'
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
          `\n` +
            `Request Time       :   ${new Date().toLocaleString('zh-Hans-CN')} \n` +
            `Request Duration   :   ${Date.now() - startTime}ms \n` +
            `Request Url        :   ${request.url} \n` +
            `Request Method     :   ${request.method} \n` +
            `Request Query      :   ${JSON.stringify(request.query)} \n` +
            `Request Params     :   ${JSON.stringify(request.params)} \n` +
            `Request Body       :   ${JSON.stringify(request.body)} \n` +
            `Response Data      :   ${JSON.stringify(response.data)}`,
          'LoggingInterceptor'
        )
      })
    )
  }
}
