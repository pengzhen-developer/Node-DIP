import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { name, version } from './../../../package.json'

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 打印请求方法，请求链接，处理时间和响应数据
        Logger.log(`${new Date().toLocaleString('zh-Hans-CN')} ` + `Data:${JSON.stringify(data)} `, 'TransformInterceptor')

        return {
          name: name,
          version: version,
          code: 200,
          message: 'success',
          data
        }
      })
    )
  }
}
