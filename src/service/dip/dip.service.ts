import { CACHE_MANAGER, Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InsertResult, Repository } from 'typeorm'
import { Cache } from 'cache-manager'
import { getCacheKey } from 'src/utils'
import {
  TDipContents,
  TDipConfigExcludeIcd9,
  TDipConfigSettle,
  TImpIcd9,
  TImpIcd10,
  TDebug,
  TDipInfo,
  TDipContentsSupplement,
  EnumOprnOprtType,
  EnumDipUnMatchCode
} from 'src/types/dip.type'
import { DipTodo } from 'src/entities/DipTodo'
import { DipTodoResult } from 'src/entities/DipTodoResult'
import { RegionStrategyService } from './utils/region.strategy.service'
import { DipConfigSettle } from 'src/entities/DipConfigSettle'

@Injectable()
export class DipService implements OnApplicationBootstrap {
  CACHE_DIP_CONTENTS_SUPPLEMENT_LIST: TDipContentsSupplement
  CACHE_CORE_GROUP_LIST: TDipContents
  CACHE_BASIC_GROUP_LIST: TDipContents
  CACHE_COMPREHENSIVE_GROUP_LIST: TDipContents
  CACHE_DIP_CONFIG_EXCLUDE_ICD9: TDipConfigExcludeIcd9
  CACHE_DIP_CONFIG_SETTLE: TDipConfigSettle
  CACHE_IMP_ICD9: TImpIcd9
  CACHE_IMP_ICD10: TImpIcd10
  CACHE_CONTENTS_ICD9_YB_2_0: TImpIcd9
  CACHE_CONTENTS_ICD9_GL_3_0: TImpIcd9
  log: TDebug[]

  constructor(
    private readonly RegionStrategyService: RegionStrategyService,
    @InjectRepository(DipTodoResult) private DipTodoResultRepository: Repository<DipTodoResult>,
    @InjectRepository(DipTodo) private dipTodoRepository: Repository<DipTodo>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.log = []
  }

  /**
   * 初始化，获取缓存
   */
  async onApplicationBootstrap(): Promise<void> {
    this.CACHE_CORE_GROUP_LIST = await this.cacheManager.get<TDipContents>('CACHE_CORE_GROUP_LIST')
    this.CACHE_BASIC_GROUP_LIST = await this.cacheManager.get<TDipContents>('CACHE_BASIC_GROUP_LIST')
    this.CACHE_COMPREHENSIVE_GROUP_LIST = await this.cacheManager.get<TDipContents>('CACHE_COMPREHENSIVE_GROUP_LIST')
    this.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST = await this.cacheManager.get<TDipContentsSupplement>('CACHE_DIP_CONTENTS_SUPPLEMENT_LIST')
    this.CACHE_IMP_ICD9 = await this.cacheManager.get<TImpIcd9>('CACHE_IMP_ICD9')
    this.CACHE_IMP_ICD10 = await this.cacheManager.get<TImpIcd10>('CACHE_IMP_ICD10')
    this.CACHE_DIP_CONFIG_EXCLUDE_ICD9 = await this.cacheManager.get<TDipConfigExcludeIcd9>('CACHE_DIP_CONFIG_EXCLUDE_ICD9')
    this.CACHE_DIP_CONFIG_SETTLE = await this.cacheManager.get<TDipConfigSettle>('CACHE_DIP_CONFIG_SETTLE')
    this.CACHE_CONTENTS_ICD9_YB_2_0 = await this.cacheManager.get<TImpIcd9>('CACHE_CONTENTS_ICD9_YB_2.0')
    this.CACHE_CONTENTS_ICD9_GL_3_0 = await this.cacheManager.get<TImpIcd9>('CACHE_CONTENTS_ICD9_GL_3.0')
  }

  /**
   * 单次分组
   */
  toDip(rawParams: DipTodo, formatParams: DipTodo): TDipInfo {
    // 初始化 Log
    this.log = []

    // 验证入参
    const validation = this.validateParams(rawParams)

    // 返回参数校验失败
    if (validation && validation.length > 0) {
      return this.setUnDipResult(EnumDipUnMatchCode.参数错误, `参数错误: ${validation.join(',')}`, rawParams)
    }

    // 尝试入组
    const dipInfo = this.RegionStrategyService.toDip(rawParams, formatParams)

    // 返回入组
    if (dipInfo) {
      dipInfo.id = rawParams.id
      dipInfo.dataId = rawParams.dataId

      return dipInfo
    }
    // 返回未入组
    else {
      return this.setUnDipResult(EnumDipUnMatchCode.入组失败, '入组失败: 诊断+手术操作无法入组，请检查！', rawParams)
    }
  }

  /**
   * 单次结算
   */
  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo {
    if (dipInfo.dipCode) {
      // 验证入参
      const configSettle = this.getConfigSettle(rawParams.region, rawParams.version, rawParams.hosCode)

      if (!configSettle) {
        return this.setUnDipResult(EnumDipUnMatchCode.结算失败, '结算失败: 未获取到当前医疗机构的结算配置，请检查！', rawParams)
      }

      const settleInfo = this.RegionStrategyService.toSettle(rawParams, formatParams, dipInfo)

      return settleInfo
    } else {
      return dipInfo
    }
  }

  /**
   * 批量分组
   */
  toDipList(rawParams: DipTodo[], formatParams: DipTodo[]): TDipInfo[] {
    const dipList: TDipInfo[] = []

    formatParams.forEach((_, index) => {
      const dipInfo = this.toDip(rawParams[index], formatParams[index])
      dipList.push(dipInfo)
    })

    return dipList
  }

  /**
   * 批量结算
   */
  toSettleList(rawParams: DipTodo[], formatParams: DipTodo[], dipInfoList: TDipInfo[]): TDipInfo[] {
    const dipSettleList: TDipInfo[] = []

    dipInfoList.forEach((_, index) => {
      const dipInfo = this.toSettle(rawParams[index], formatParams[index], dipInfoList[index])
      dipSettleList.push(dipInfo)
    })

    return dipSettleList
  }

  /**
   * 分组参数格式化
   */
  formatParams(rawParams: DipTodo[]): DipTodo[] {
    const formatParams = rawParams.map((param) => {
      const item = Object.assign({}, param)

      // 将诊断和手术操作，转换为数组
      if (!Array.isArray(item.diagCode)) {
        if (!item.diagCode) {
          item.diagCode = []
        } else if (item.diagCode?.includes(',')) {
          item.diagCode = item.diagCode?.split(',')
        } else {
          item.diagCode = item.diagCode?.split('+')
        }
      }
      if (!Array.isArray(item.oprnOprtCode)) {
        if (!item.oprnOprtCode) {
          item.oprnOprtCode = []
        } else if (item.oprnOprtCode?.includes(',')) {
          item.oprnOprtCode = item.oprnOprtCode?.split(',')
        } else {
          item.oprnOprtCode = item.oprnOprtCode?.split('+')
        }
      }

      // 诊断编码转换
      item.diagCode = item.diagCode.map((diagCode) => this.impICD10(undefined, undefined, diagCode)).filter((item) => item)
      // 手术编码转换
      item.oprnOprtCode = item.oprnOprtCode.map((oprnOprtCode) => this.impICD9(undefined, undefined, oprnOprtCode)).filter((item) => item)
      // 手术编码排除
      item.oprnOprtCode = item.oprnOprtCode.map((oprnOprtCode) => this.excludeICD9(item.region, item.version, oprnOprtCode)).filter((item) => item)

      return item
    })
    return formatParams
  }

  /**
   * 分组参数校验
   */
  validateParams(rawParams: DipTodo): string[] {
    const validations = [
      { key: 'dataId', func: [(key) => !rawParams[key]] },
      { key: 'region', func: [(key) => !rawParams[key]] },
      { key: 'version', func: [(key) => !rawParams[key]] },
      { key: 'hosCode', func: [(key) => !rawParams[key]] },
      { key: 'hosName', func: [(key) => !rawParams[key]] },
      { key: 'diagCode', func: [(key) => !rawParams[key] || rawParams[key].length === 0] }
    ]

    const validate = validations.filter((validation) => validation.func.some((validationFunc) => validationFunc(validation.key))).map((validation) => validation.key)

    return validate
  }

  /**
   * 获取待处理数据
   */
  async getOne(id: number): Promise<DipTodo[]> {
    return await this.dipTodoRepository.find({ where: { id: id } })
  }

  /**
   * 获取所有待处理数据
   */
  async getAll(): Promise<DipTodo[]> {
    return await this.dipTodoRepository.find()
  }

  /**
   * 更新所有已处理数据
   */
  async updateDipTodoResult(rawData: DipTodo[], dipResultList: TDipInfo[]): Promise<InsertResult> {
    return new Promise(async (resolve) => {
      const currentBatchNo = await this.DipTodoResultRepository.createQueryBuilder('dipTodoResult').select('MAX(dipTodoResult.batchNo)', 'maxBatchNo').getRawOne()
      const nextBatchNo = currentBatchNo?.maxBatchNo ? currentBatchNo?.maxBatchNo + 1 : 1

      const DipTodoResultRepository = dipResultList.map((dipResult, index) => {
        const dipTodoResult: DipTodoResult = { ...dipResult, ...rawData[index] }
        dipTodoResult.todoId = rawData[index].id
        dipTodoResult.batchNo = nextBatchNo
        delete dipTodoResult.id

        return dipTodoResult
      })

      const insertResult = await this.DipTodoResultRepository.insert(DipTodoResultRepository)

      resolve(insertResult as any)
    })
  }

  /**
   * 编码转换 ICD9
   */
  impICD9(from_version = 'GL_3.0', to_version = 'YB_2.0', oprnOprtCode): string | undefined {
    const cacheKey = getCacheKey(from_version, to_version, oprnOprtCode)

    return this.CACHE_IMP_ICD9[cacheKey] ? this.CACHE_IMP_ICD9[cacheKey].toCode : oprnOprtCode
  }

  /**
   * 编码转换 ICD10
   */
  impICD10(from_version = 'GL_3.0', to_version = 'YB_2.0', diagCode: string): string | undefined {
    const cacheKey = getCacheKey(from_version, to_version, diagCode)

    return this.CACHE_IMP_ICD10[cacheKey] ? this.CACHE_IMP_ICD10[cacheKey].toCode : diagCode
  }

  /**
   * 编码排除
   */
  excludeICD9(region: string, version: string, oprnOprtCode: string): string | undefined {
    const cacheKey = getCacheKey(region, version, oprnOprtCode)

    return this.CACHE_DIP_CONFIG_EXCLUDE_ICD9[cacheKey] ? undefined : oprnOprtCode
  }

  /**
   * 获取最大手术操作类型
   */
  public getOprnOprtType(oprnOprtCode, toVersion = 'YB_2.0'): string {
    const oprnOprtCodeSortFn = (oprnOprtCode) => {
      const sortArr = [EnumOprnOprtType.保守治疗, EnumOprnOprtType.诊断性操作, EnumOprnOprtType.治疗性操作, EnumOprnOprtType.相关手术]

      return sortArr.indexOf(oprnOprtCode)
    }

    if (oprnOprtCode.length === 0) {
      return EnumOprnOprtType.保守治疗
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      const temp = oprnOprtCode.reduce((p, c) => {
        const cacheKeyP = getCacheKey(toVersion, p)
        const cacheKeyC = getCacheKey(toVersion, c)

        return oprnOprtCodeSortFn(this.CACHE_CONTENTS_ICD9_YB_2_0[cacheKeyP]?.oprnOprtType) >= oprnOprtCodeSortFn(this.CACHE_CONTENTS_ICD9_YB_2_0[cacheKeyC]?.oprnOprtType) ? p : c
      })
      const cacheKey = getCacheKey(toVersion, temp)

      return this.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtType ?? EnumOprnOprtType.保守治疗
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)

      return this.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtType ?? EnumOprnOprtType.保守治疗
    }
  }

  /**
   * 获取结算配置信息
   */
  public getConfigSettle(region: string, version: string, hosCode: string): DipConfigSettle {
    return this.CACHE_DIP_CONFIG_SETTLE[getCacheKey(region, version, hosCode)]
  }

  /**
   * 异常分组结果
   */
  public setUnDipResult(code, message, rawParams: DipTodo): TDipInfo {
    const unDipInfo = { ...rawParams } as TDipInfo

    unDipInfo.code = code
    unDipInfo.message = message

    return unDipInfo
  }

  /**
   * 日志记录
   */
  public logger(log: TDebug): void {
    this.log.push(log)
  }
}
