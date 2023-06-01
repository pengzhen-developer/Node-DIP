import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { DipTodo } from 'src/entities/DipTodo'
import { TDipInfo } from 'src/types/dip.type'
import { DipService } from './dip.service'

@Controller('dip-core')
export class DipController {
  constructor(private readonly dipService: DipService) {}

  @ApiOperation({ tags: ['DIP'], description: '根据参数分组' })
  @Post('dip')
  async toDip(@Body() dipTodo: DipTodo | DipTodo[]): Promise<TDipInfo | TDipInfo[]> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 格式化参数
    const rawParams = Array.isArray(dipTodo) ? dipTodo : [dipTodo]
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)

    return Array.isArray(dipTodo) ? dipSettleList : dipSettleList[0]
  }

  @ApiOperation({ tags: ['DIP'], description: '根据参数结算' })
  @Post('settle')
  async toSettle(@Body() dipTodo: DipTodo | DipTodo[]): Promise<TDipInfo | TDipInfo[]> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 格式化参数
    const rawParams = Array.isArray(dipTodo) ? dipTodo : [dipTodo]
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)

    return Array.isArray(dipTodo) ? dipSettleList : dipSettleList[0]
  }

  @ApiOperation({ tags: ['DIP'], description: '根据入参推荐' })
  @Post('recommend')
  async toRecommend(@Body() dipTodo: DipTodo): Promise<TDipInfo | TDipInfo[]> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 格式化参数
    const rawParams = Array.isArray(dipTodo) ? dipTodo : [dipTodo]
    const formatParams = this.dipService.formatParams(rawParams)
    // 推荐
    const dipRecommendList = this.dipService.toRecommend(rawParams[0], formatParams[0])

    return dipRecommendList
  }

  @ApiOperation({ tags: ['测算'], description: '批量分组' })
  @Get('dip/all')
  async toDipAll(): Promise<any> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 获取待处理数据
    const rawParams = await this.dipService.getAll()
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)
    // 保存
    const result = await this.dipService.updateDipTodoResult(rawParams, dipSettleList)

    // 执行分组
    return result.raw
  }

  @ApiOperation({ tags: ['测算'], description: '批量结算' })
  @Get('settle/all')
  async toSettleAll(): Promise<any> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 获取待处理数据
    const rawParams = await this.dipService.getAll()
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)
    // 保存
    const result = await this.dipService.updateDipTodoResult(rawParams, dipSettleList)

    return result.raw
  }

  @ApiOperation({ tags: ['测算'], description: '根据 ID 分组' })
  @Get('dip/:id')
  async toDipByID(@Param('id') id: number): Promise<TDipInfo[]> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 获取待处理数据
    const rawParams = await this.dipService.getOne(id)
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)

    dipSettleList.map((dip, index) => {
      dip.params = rawParams[index]
    })

    return dipSettleList
  }

  @ApiOperation({ tags: ['测算'], description: '根据 ID 结算' })
  @Get('settle/:id')
  async toSettleByID(@Param('id') id: number): Promise<TDipInfo[]> {
    // 刷新缓存
    await this.dipService.onApplicationBootstrap()
    // 获取待处理数据
    const rawParams = await this.dipService.getOne(id)
    const formatParams = this.dipService.formatParams(rawParams)
    // 分组
    const dipList = this.dipService.toDipList(rawParams, formatParams)
    // 结算
    const dipSettleList = this.dipService.toSettleList(rawParams, formatParams, dipList)

    dipSettleList.map((dip, index) => {
      dip.params = rawParams[index]
    })

    return dipSettleList
  }
}
