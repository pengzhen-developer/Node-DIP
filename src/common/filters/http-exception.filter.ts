import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { name, version } from './../../../package.json'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(httpException: HttpException, argumentsHost: ArgumentsHost) {
    const httpArgumentsHost = argumentsHost.switchToHttp() // 获取请求上下文
    const request = httpArgumentsHost.getRequest() // 获取请求上下文中的request对象
    const response = httpArgumentsHost.getResponse() // 获取请求上下文中的response对象
    const status = httpException instanceof HttpException ? httpException.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR // 获取异常状态码

    // 设置错误信息
    const message = httpException.message ? httpException.message : `${status >= 500 ? '服务器错误（Service Error）' : '客户端错误（Client Error）'}`
    const errorResponse = {
      name: name,
      version: version,
      code: 500,
      message,
      data: null
    }

    // 设置返回的状态码， 请求头，发送错误信息
    response.status(status)
    response.header('Content-Type', 'application/json; charset=utf-8')
    response.send(errorResponse)

    // 打印请求方法，请求链接，处理时间和响应数据
    Logger.error(
      `${new Date().toLocaleString('zh-Hans-CN')} ` +
        `${0}ms \r` +
        `${request.method} \r` +
        `${request.url} \r` +
        `query:${JSON.stringify(request.query)} \r` +
        `params:${JSON.stringify(request.params)} \r` +
        `body:${JSON.stringify(request.body)}\r`,
      'HttpExceptionFilter'
    )

    console.error(httpException)
  }
}
