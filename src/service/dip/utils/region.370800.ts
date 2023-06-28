import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { TDipInfo, TDipContents, EnumDipType, EnumOprnOprtType, EnumCcMcc, EnumDeviation, EnumInsuranceType, TDipContentsSupplement, EnumDscgWay } from 'src/types/dip.type'
import { getAge, getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { RegionBaseService } from './region.base.service'

@Injectable()
export class Region_370800 extends RegionBaseService {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }

  /**
   * 分组
   */
  toDip(rawParams: DipTodo, formatParams: DipTodo): TDipInfo {
    let decideGroups: TDipInfo[] = []
    // 入主目录
    let coreGroups = this.intoCoreGroups(rawParams, formatParams, this.dipService.CACHE_CORE_GROUP_LIST)
    let basicGroups = this.intoBasicGroups(rawParams, formatParams, this.dipService.CACHE_BASIC_GROUP_LIST)
    let comprehensiveGroup = this.intoComprehensiveGroup(rawParams, formatParams, this.dipService.CACHE_COMPREHENSIVE_GROUP_LIST)
    // 入辅助目录
    coreGroups = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, coreGroups)
    basicGroups = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, basicGroups)
    comprehensiveGroup = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, comprehensiveGroup)
    // 选定组
    decideGroups = this.chooseCoreGroupByMajorOprnOprtCode(rawParams, formatParams, [...coreGroups])
    decideGroups = this.chooseCoreGroupByMatchQuantity(rawParams, formatParams, [...decideGroups])
    decideGroups = this.chooseCoreGroupByAbsoluteFee(rawParams, formatParams, [...decideGroups])
    decideGroups = this.chooseUniqueGroupByDipType(rawParams, formatParams, [...decideGroups, ...basicGroups, ...comprehensiveGroup])

    return decideGroups[0]
  }

  /**
   * 结算
   */
  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo {
    /** 结算系数 */
    const configSettle = this.dipService.getConfigSettle(rawParams)

    /** 获取偏差系数和偏差类型 */
    const getDipSettleFactorDeviation = () => {
      const sumAmount = rawParams.sumAmount ?? 0
      const dipAvgAmount = this.dipService.getDipAvgAmount(rawParams, formatParams, dipInfo)
      const hospitalFactor = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup * 1 : configSettle.factorHospital * 1

      if (dipAvgAmount === 0) {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return 1
      }

      // 空白病组
      if (dipInfo.dipCode === 'KBBZ') {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return (sumAmount / dipInfo.dipAvgAmount) * 0.7
      }

      // 偏差类型 - 低倍率
      if (sumAmount <= dipAvgAmount * 0.5) {
        dipInfo.dipSettleDeviation = EnumDeviation.低倍率
        return sumAmount / dipAvgAmount
      }
      // 偏差类型 - 高倍率
      else if (sumAmount > dipAvgAmount * 2 && sumAmount <= dipAvgAmount * 5) {
        dipInfo.dipSettleDeviation = EnumDeviation.高倍率
        return sumAmount / dipAvgAmount - 2 + hospitalFactor
      }
      // 偏差类型 - 极端异常
      else if (sumAmount > dipAvgAmount * 5) {
        dipInfo.dipSettleDeviation = EnumDeviation.高倍率
        return hospitalFactor
      }
      // 正常倍率
      else {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return 1
      }
    }

    /** 获取结算分值 */
    const getDipSettleScore = () => {
      const hospitalFactor = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup : configSettle.factorHospital
      const supplementFactor = dipInfo.dipSupplementName ? dipInfo.dipSupplementFactor : 1

      // 空白病种无任何调整系数
      if (dipInfo.dipCode === 'KBBZ') {
        return dipInfo.dipScore * dipInfo.dipSettleFactorDeviation
      }
      // 偏差病种无任何调整系数【因为计算偏差系数时，已进行对应调整】
      else if (dipInfo.dipSettleDeviation === EnumDeviation.低倍率 || dipInfo.dipSettleDeviation === EnumDeviation.高倍率) {
        return dipInfo.dipScore * dipInfo.dipSettleFactorDeviation * supplementFactor
      }
      // 其他类型，需考虑调整系数【基层系数 / 医疗机构系数】
      else {
        return dipInfo.dipScore * dipInfo.dipSettleFactorDeviation * supplementFactor * hospitalFactor
      }
    }

    /** 获取基准分值（考虑辅助目录和基层） */
    const getDipScore = () => {
      if (dipInfo.dipCode === 'KBBZ') {
        return getDipSettleScore()
      }
      const hospitalFactor = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup : configSettle.factorHospital
      const supplementFactor = dipInfo.dipSupplementName ? dipInfo.dipSupplementFactor : 1
      return dipInfo.dipScore * hospitalFactor * supplementFactor
    }

    /** 获取结算分值单价 */
    const getDipSettleScorePrice = () => {
      return rawParams.insuranceType === EnumInsuranceType.职工 ? configSettle.factorEmployeePrice : configSettle.factorResidentPrice
    }

    dipInfo.dipSettleAvgAmount = this.dipService.getDipAvgAmount(rawParams, formatParams, dipInfo)

    dipInfo.dipSettleFactorDeviation = getDipSettleFactorDeviation()
    dipInfo.dipSettleFactorHospital = configSettle.factorHospital
    dipInfo.dipSettleFactorBasicGroup = dipInfo.dipFactorBasicGroup

    dipInfo.dipSettleScorePriceEmployee = configSettle.factorEmployeePrice
    dipInfo.dipSettleScorePriceResident = configSettle.factorResidentPrice

    dipInfo.dipSettleScore = getDipSettleScore()
    dipInfo.dipSettleScorePrice = getDipSettleScorePrice()
    dipInfo.dipSettleAmount = parseFloat(dipInfo.dipScore as any) === 0 ? rawParams.sumAmount : getDipSettleScore() * getDipSettleScorePrice() ?? 0
    dipInfo.dipStandardAmount = getDipScore() * getDipSettleScorePrice() ?? 0

    return dipInfo
  }

  /**
   * 推荐
   */
  toRecommend(rawParams: DipTodo, formatParams: DipTodo): TDipInfo[] {
    const uniqueFunc = (arr: Array<any>, uniId: string) => {
      const res = new Map()
      return arr.filter((item) => !res.has(item[uniId]) && res.set(item[uniId], 1))
    }

    // 寻找核心 / 基层
    const coreGroups: TDipInfo[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'x']
      .map((key) => {
        // 获取缓存 key
        const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, 4) + key)
        const coreGroups = this.dipService.CACHE_CORE_GROUP_LIST[cacheKey] ?? []
        const basicGroups = this.dipService.CACHE_BASIC_GROUP_LIST[cacheKey] ?? []

        // 写入 dip 组类型
        const groups = [...coreGroups, ...basicGroups].map((dip) => {
          const oprnOprtCode = dip.oprnOprtCode?.split(/[\+\/]/)
          dip.oprnOprtType = dip.oprnOprtType ?? this.getOprnOprtType(oprnOprtCode ?? '')

          return dip
        })

        return JSON.parse(JSON.stringify(groups)) as TDipInfo[]
      })
      .flat()

    // 寻找综合
    const comprehensiveGroup: TDipInfo[] = ['', '00.2100', '00.3100', '00.5500'] // 分别尝试使用保守、诊断性操作、治疗性操作、手术进行入组
      .map((key) => {
        const formatParamsTemp: DipTodo = JSON.parse(JSON.stringify(formatParams))
        formatParamsTemp.oprnOprtCode = [key]
        const groups = this.intoComprehensiveGroup(rawParams, formatParamsTemp, this.dipService.CACHE_COMPREHENSIVE_GROUP_LIST)

        return JSON.parse(JSON.stringify(uniqueFunc(groups, 'id'))) as TDipInfo[]
      })
      .flat()

    // 结算
    const recommendSettleList: TDipInfo[] = [...coreGroups, ...uniqueFunc(comprehensiveGroup, 'id')].map((dipInfo) => this.toSettle(rawParams, formatParams, dipInfo))

    return recommendSettleList
  }

  /**
   * 入核心组
   */
  intoCoreGroups(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    const dipInfoList: TDipInfo[] = []

    // 获取缓存 key
    const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, 5))
    // 判定诊断类目
    const dipList = dipContentList[cacheKey]?.concat([]) ?? []

    // 有手术及操作判定
    if (formatParams.oprnOprtCode.length > 0) {
      for (let i = 0; i < dipList.length; i++) {
        const dipInfo = dipList[i]

        // 济宁：必须满足全部手术及操作
        const dipOperations = dipInfo.oprnOprtCode?.split(',') ?? []

        if (dipOperations.length > 0 && dipOperations.every((item) => formatParams.oprnOprtCode.includes(item))) {
          const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo

          dipInfoResult.oprnOprtCodeMatch = [...new Set((formatParams.oprnOprtCode as string[]).filter((v) => dipOperations.includes(v)))] ?? []
          dipInfoResult.oprnOprtCodeMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
          dipInfoResult.oprnOprtCodeUnMatch = [...new Set((formatParams.oprnOprtCode as string[]).filter((v) => !dipOperations.includes(v)))] ?? []
          dipInfoResult.oprnOprtCodeUnMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
          dipInfoResult.oprnOprtType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

          dipInfoList.push(dipInfoResult)
        }
      }
    }

    // 保守治疗组
    if (dipInfoList.length === 0 && this.getOprnOprtType(formatParams.oprnOprtCode) === EnumOprnOprtType.保守治疗) {
      const tempDipList = dipList.filter((item) => !item.oprnOprtCode)

      if (tempDipList.length) {
        const dipInfoResult = JSON.parse(JSON.stringify(tempDipList)) as TDipInfo[]

        dipInfoResult.map((dipInfoResult) => {
          dipInfoResult.oprnOprtCodeMatch = []
          dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
          dipInfoResult.oprnOprtType = EnumOprnOprtType.保守治疗
        })

        dipInfoList.push(...dipInfoResult)
      }
    }

    this.dipService.logger({
      title: '入核心组',
      description: dipInfoList
    })

    return dipInfoList
  }

  /**
   * 入基层组
   */
  intoBasicGroups(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    return this.intoCoreGroups(rawParams, formatParams, dipContentList)
  }

  /**
   * 入综合组
   */
  intoComprehensiveGroup(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    const dipInfoList: TDipInfo[] = []
    const operationType = this.getOprnOprtType(formatParams.oprnOprtCode[0])

    // 从诊断亚目开始，入精确综合组
    for (let i = 3; i > 0; i--) {
      // 获取缓存 key
      const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, i))
      const dipList = dipContentList[cacheKey] ?? []

      const dipInfo = dipList.filter((dip) => dip.oprnOprtType === operationType)

      if (dipInfo.length) {
        const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo[]

        dipInfoResult.map((dipInfoResult) => {
          dipInfoResult.oprnOprtCodeMatch = []
          dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
        })

        dipInfoList.push(...dipInfoResult)

        break
      }
    }

    // 从诊断章节开始，入范围综合组
    for (const key in dipContentList) {
      if (key.indexOf('-') === -1) {
        continue
      }

      const region = key.split('@')[0]
      const version = key.split('@')[1]
      const range = key.split('@')[key.split('@').length - 1].split('-')
      const p_0_1 = formatParams.diagCode[0].substring(0, 1)
      const range_left_0_1 = range[0].substring(0, 1)
      const range_right_0_1 = range[1].substring(0, 1)
      const p_1_3 = formatParams.diagCode[0].substring(1, 3)
      const range_left_1_3 = range[0].substring(1, 3)
      const range_right_1_3 = range[1].substring(1, 3)

      if (formatParams.region === region && formatParams.version === version) {
        if (
          // 左右均为 => A00-A99 => A50
          (p_0_1 === range_left_0_1 && p_0_1 === range_right_0_1 && p_1_3 >= range_left_1_3 && p_1_3 <= range_right_1_3) ||
          // 左右包含 => A00-C50 ： B00
          (p_0_1 > range_left_0_1 && p_0_1 < range_right_0_1) ||
          // 左侧包含 => A00-C50 => A00
          (p_0_1 === range_left_0_1 && p_0_1 < range_right_0_1 && p_1_3 >= range_left_1_3) ||
          // 右侧包含 => A00-C50 => C50
          (p_0_1 === range_right_0_1 && p_0_1 > range_left_0_1 && p_1_3 <= range_right_1_3)
        ) {
          const dipInfo = dipContentList[key].filter((group) => group.oprnOprtType === operationType)

          if (dipInfo.length) {
            const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo[]

            dipInfoResult.map((dipInfoResult) => {
              dipInfoResult.oprnOprtCodeMatch = []
              dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
            })

            dipInfoList.push(...dipInfoResult)

            break
          }
        }
      }
    }

    // 验证手术级别
    if (dipInfoList.some((item) => item.dipName.includes('手术级别'))) {
      const rawOperationLevel = parseInt(this.getOprnOprtLevel(formatParams.oprnOprtCode[0])) ?? 1

      const matchDipInfo = dipInfoList.find((dipInfo) => {
        const operationLevel = parseInt(dipInfo.dipCode.substring(dipInfo.dipCode.length - 1))

        // 3、4 级手术及操作，归类为级别 3
        // 2 级手术及操作，归类为级别 2
        // 1 级手术及操作，归类为级别 2
        if ((rawOperationLevel === 4 || rawOperationLevel === 3) && operationLevel === 3) {
          return true
        } else if (rawOperationLevel === 2 && operationLevel === 2) {
          return true
        } else if (rawOperationLevel === 1 && operationLevel === 1) {
          return true
        } else {
          return false
        }
      })

      dipInfoList.splice(0, dipInfoList.length)
      if (matchDipInfo) {
        dipInfoList.push(matchDipInfo)
      }
    }

    // 济宁: 无法入综合组，选择综合空白病组
    if (dipInfoList.length === 0) {
      const cacheKey = getCacheKey(formatParams.region, formatParams.version, 'KBBZ')
      const dipInfo = dipContentList[cacheKey][0]
      const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo

      dipInfoList.push(dipInfoResult)
    }

    this.dipService.logger({
      title: '入综合组',
      description: dipInfoList
    })

    return dipInfoList
  }

  /**
   * 入辅助目录
   */
  intoSupplementGroup(rawParams: DipTodo, formatParams: DipTodo, dipContentsSupplementList: TDipContentsSupplement, dipInfoList: TDipInfo[]) {
    // 严重程度：
    // 1: 轻度
    // 2: 中度(住院天数3天以上)
    // 3: 重度(住院天数3天以上)
    // 4: 死亡(住院天数3天以上)
    if (dipInfoList.some((item) => item.dipCode.includes('code') && item.dipName.includes('辅助目录'))) {
      // 疾病级别 - 表达式关键要素
      const $ExpressionCcMcc = this.dipService.CACHE_DIP_CONFIG_CC_MCC
      const $ExpressionExcludeCcMcc = this.dipService.CACHE_DIP_CONFIG_EXCLUDE_CC_MCC
      const $ExpressionMajorDiagCode = formatParams.diagCode.slice(0, 1) as string[]
      const $ExpressionMinorDiagCode = formatParams.diagCode.slice(1) as string[]
      const { years: $ExpressionAgeInYears, days: $ExpressionAgeInDays } = getAge(new Date(rawParams.inHospitalDate), new Date(rawParams.outHospitalDate))

      const $IsCcMcc = (type: 'CC' | 'MCC') => {
        return $ExpressionMinorDiagCode.some((diagCode) => {
          const ccMcc = $ExpressionCcMcc[getCacheKey('', '', diagCode)]
          if (ccMcc && ccMcc.type === EnumCcMcc[type]) {
            if (ccMcc.include) {
              return $ExpressionMajorDiagCode[0].startsWith(ccMcc.include)
            } else if (ccMcc.exclude) {
              return ($ExpressionExcludeCcMcc[getCacheKey('', '', ccMcc.exclude)] ?? []).every((item) => item.diagCode !== $ExpressionMajorDiagCode[0])
            } else {
              return true
            }
          }
          return false
        })
      }
      const $ExpressionIsDead = () => {
        return rawParams.dscgWay === EnumDscgWay.死亡
      }

      if ($ExpressionAgeInYears > 0 || $ExpressionAgeInDays > 3) {
        if ($ExpressionIsDead() && dipInfoList.some((item) => item.dipCode.includes('code_4') && item.dipName.includes('辅助目录区分疾病_4'))) {
          return dipInfoList
            .filter((item) => item.dipCode.includes('code_4') && item.dipName.includes('辅助目录区分疾病_4'))
            .concat(dipInfoList.filter((item) => !item.dipCode.includes('code') && !item.dipName.includes('辅助目录')))
        } else if ($IsCcMcc('MCC') && dipInfoList.some((item) => item.dipCode.includes('code_3') && item.dipName.includes('辅助目录区分疾病_3'))) {
          return dipInfoList
            .filter((item) => item.dipCode.includes('code_3') && item.dipName.includes('辅助目录区分疾病_3'))
            .concat(dipInfoList.filter((item) => !item.dipCode.includes('code') && !item.dipName.includes('辅助目录')))
        } else if ($IsCcMcc('CC') && dipInfoList.some((item) => item.dipCode.includes('code_2') && item.dipName.includes('辅助目录区分疾病_2'))) {
          return dipInfoList
            .filter((item) => item.dipCode.includes('code_2') && item.dipName.includes('辅助目录区分疾病_2'))
            .concat(dipInfoList.filter((item) => !item.dipCode.includes('code') && !item.dipName.includes('辅助目录')))
        } else {
          return dipInfoList
            .filter((item) => item.dipCode.includes('code_1') && item.dipName.includes('辅助目录区分疾病_1'))
            .concat(dipInfoList.filter((item) => !item.dipCode.includes('code') && !item.dipName.includes('辅助目录')))
        }
      } else {
        return dipInfoList
          .filter((item) => item.dipCode.includes('code_1') && item.dipName.includes('辅助目录区分疾病_1'))
          .concat(dipInfoList.filter((item) => !item.dipCode.includes('code') && !item.dipName.includes('辅助目录')))
      }
    }

    return dipInfoList
  }

  /**
   * 根据主手术编码优先原则
   */
  chooseCoreGroupByMajorOprnOprtCode(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    if (dipInfoList.some((dipInfo) => dipInfo.dipCode.includes(formatParams.oprnOprtCode[0]))) {
      return dipInfoList.filter((dipInfo) => dipInfo.dipCode.includes(formatParams.oprnOprtCode[0]))
    } else {
      return dipInfoList
    }
  }

  /**
   * 根据主手术类型优先原则
   */
  chooseCoreGroupByMajorOprnOprtType(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    const majorOprnOprtType = this.getOprnOprtType(formatParams.oprnOprtCode[0])
    if (dipInfoList.some((dipInfo) => dipInfo.oprnOprtCodeMatchType === majorOprnOprtType)) {
      return dipInfoList.filter((dipInfo) => dipInfo.oprnOprtCodeMatchType === majorOprnOprtType)
    } else {
      return dipInfoList
    }
  }

  /**
   * 根据手术操作匹配数量选择组
   */
  chooseCoreGroupByMatchQuantity(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    if (dipInfoList.length === 0) {
      return []
    }

    // 存在 + 关系
    if (dipInfoList.some((item) => item.oprnOprtCode?.includes('+'))) {
      const maxMatchGroup = dipInfoList
        .filter((item) => item.oprnOprtCode.includes('+'))
        .reduce((p, c) => ((p.oprnOprtCode.match(/\+/g) || []).length > (c.oprnOprtCode.match(/\+/g) || []).length ? p : c))
      dipInfoList = dipInfoList.filter((item) => (item.oprnOprtCode.match(/\+/g) || []).length === maxMatchGroup.oprnOprtCode.match(/\+/g).length)
    }
    const maxMatchGroup = dipInfoList.reduce((p, c) => (p.oprnOprtCodeMatch?.length > c.oprnOprtCodeMatch?.length ? p : c))
    const chooseGroupByMatchQuantity = dipInfoList.filter((item) => item.oprnOprtCodeMatch.length === maxMatchGroup.oprnOprtCodeMatch.length)

    this.dipService.logger({
      title: '根据手术操作匹配数量选择组',
      description: chooseGroupByMatchQuantity
    })

    return chooseGroupByMatchQuantity
  }

  /**
   * 根据费用绝对值选择组
   */
  chooseCoreGroupByAbsoluteFee(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    if (dipInfoList.length === 0) {
      return []
    }

    // （均费与费用绝对值越小，优先级越高）
    const chooseGroupByAbsoluteFee = [
      dipInfoList.reduce((p, c) => {
        const sumAmount = rawParams.sumAmount ?? 0
        const pDipAvgAmount = this.dipService.getDipAvgAmount(rawParams, formatParams, p)
        const cDipAvgAmount = this.dipService.getDipAvgAmount(rawParams, formatParams, c)

        if (Math.abs(sumAmount - pDipAvgAmount) < Math.abs(sumAmount - cDipAvgAmount)) {
          return p
        } else {
          return c
        }
      })
    ]

    this.dipService.logger({
      title: '根据费用绝对值选择组',
      description: chooseGroupByAbsoluteFee
    })

    return chooseGroupByAbsoluteFee
  }

  /**
   * 根据 DIP 类型选择唯一组
   */
  chooseUniqueGroupByDipType(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    let chooseGroupByType: TDipInfo[] = []

    const chooseList = [
      {
        tooltip: '核心: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '基层: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '核心: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作)
      },
      {
        tooltip: '基层: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作)
      },
      {
        tooltip: '核心: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作)
      },
      {
        tooltip: '基层: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作)
      },
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '综合: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作)
      },
      {
        tooltip: '综合: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作)
      },
      {
        tooltip: '核心: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗)
      },
      {
        tooltip: '基层: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗)
      },
      {
        tooltip: '综合: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗)
      },
      {
        tooltip: '综合: 空白病组',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === '空白病组')
      }
    ]

    for (let i = 0; i < chooseList.length; i++) {
      if (chooseList[i].filter(dipInfoList).length > 0) {
        chooseGroupByType = chooseList[i].filter(dipInfoList)

        break
      }
    }

    this.dipService.logger({
      title: '根据 DIP 类型选择唯一组',
      description: chooseGroupByType
    })

    return chooseGroupByType
  }

  /**
   * 获取最大手术操作类型
   */
  public getOprnOprtType(oprnOprtCode, toVersion = 'YB_1.0'): string {
    if (!oprnOprtCode) {
      return EnumOprnOprtType.保守治疗
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      const temp = oprnOprtCode.reduce((p, c) => {
        const cacheKeyP = getCacheKey(toVersion, p)
        const cacheKeyC = getCacheKey(toVersion, c)

        return this.getOprnSort(this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKeyP]?.oprnOprtType) >=
          this.getOprnSort(this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKeyC]?.oprnOprtType)
          ? p
          : c
      })
      const cacheKey = getCacheKey(toVersion, temp)
      const oprnOprtType = this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtType

      return (oprnOprtType === EnumOprnOprtType.介入治疗 ? EnumOprnOprtType.治疗性操作 : oprnOprtType) ?? EnumOprnOprtType.保守治疗
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)
      const oprnOprtType = this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtType

      return (oprnOprtType === EnumOprnOprtType.介入治疗 ? EnumOprnOprtType.治疗性操作 : oprnOprtType) ?? EnumOprnOprtType.保守治疗
    }
  }

  /**
   * 获取最大手术操作级别
   */
  public getOprnOprtLevel(oprnOprtCode, toVersion = 'YB_1.0'): string {
    if (oprnOprtCode && oprnOprtCode.length === 0) {
      return ''
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      const temp = oprnOprtCode.reduce((p, c) => {
        const cacheKeyP = getCacheKey(toVersion, p)
        const cacheKeyC = getCacheKey(toVersion, c)

        return this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKeyP]?.oprnOprtLevel >= this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKeyC]?.oprnOprtLevel ? p : c
      })
      const cacheKey = getCacheKey(toVersion, temp)

      return this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtLevel ?? ''
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)

      return this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtLevel ?? ''
    }
  }

  /**
   * 获取手术操作顺序码
   */
  public getOprnSort(oprnOprtType) {
    const sortArr = [EnumOprnOprtType.保守治疗, EnumOprnOprtType.诊断性操作, EnumOprnOprtType.治疗性操作, EnumOprnOprtType.介入治疗, EnumOprnOprtType.相关手术]

    return sortArr.indexOf(oprnOprtType)
  }

  /**
   * 是否保守治疗
   */
  public isConservative(oprnOprtCode, toVersion = 'YB_1.0'): boolean {
    if (oprnOprtCode.length === 0) {
      return true
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      return oprnOprtCode.every((oprnOprtCode) => {
        const cacheKey = getCacheKey(toVersion, oprnOprtCode)

        if (!this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]) {
          return true
        } else {
          return this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnSincType === '0类' && this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtLevel < '3'
        }
      })
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)

      if (!this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]) {
        return true
      } else {
        return this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnSincType === '0类' && this.dipService.CACHE_CONTENTS_ICD9_YB_1_0[cacheKey]?.oprnOprtLevel < '3'
      }
    }
  }
}
