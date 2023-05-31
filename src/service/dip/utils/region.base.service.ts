import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumDipType, EnumOprnOprtType, TDipContents, TDipInfo, IRegionStrategy, EnumInsuranceType, EnumDeviation, TDipContentsSupplement, EnumCcMcc } from 'src/types/dip.type'
import { getAge, getCacheKey } from 'src/utils'
import { DipService } from './../dip.service'

@Injectable()
export class RegionBaseService implements IRegionStrategy {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {}

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
    decideGroups = this.chooseCoreGroupByMatchQuantity(rawParams, formatParams, [...coreGroups])
    decideGroups = this.chooseCoreGroupByAbsoluteFee(rawParams, formatParams, [...decideGroups])
    decideGroups = this.chooseUniqueGroupByDipType(rawParams, formatParams, [...decideGroups, ...basicGroups, ...comprehensiveGroup])

    return decideGroups[0]
  }

  /**
   * 结算
   */
  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo {
    /** 结算系数 */
    const configSettle = this.dipService.getConfigSettle(rawParams.region, rawParams.version, rawParams.hosCode)
    // 平均费用
    const configAvgAmount = this.dipService.getConfigAvgMount(
      rawParams.region,
      rawParams.version,
      configSettle.hospitalLevel,
      dipInfo.dipCode,
      dipInfo.dipSupplementType,
      dipInfo.dipSupplementName,
      rawParams.insuranceType
    )

    /** 模拟 DIP 均费 */
    const getDipAvgAmount = () => {
      // 模拟均费 = 基准分值 * 均费调整系数【通过清算数据测算】

      /** 基准分值 */
      const dipScore = dipInfo.dipSupplementName ? dipInfo.dipSupplementScore * dipInfo.dipSupplementFactor : dipInfo.dipScore

      /** 均费调整系数 */
      const dipFactorAvgAmount =
        dipInfo.dipType === EnumDipType.基层
          ? rawParams.insuranceType === EnumInsuranceType.职工
            ? configSettle.factorBasicEmployeeAvgAmount * dipInfo.dipFactorBasicGroup
            : configSettle.factorBasicResidentAvgAmount * dipInfo.dipFactorBasicGroup
          : rawParams.insuranceType === EnumInsuranceType.职工
          ? configSettle.factorEmployeeAvgAmount
          : configSettle.factorResidentAvgAmount

      // 单一病组均费【通过清算数据测算】 => 模拟均费
      return configAvgAmount?.dipAvgAmount ?? dipScore * dipFactorAvgAmount
    }

    /** 获取偏差系数和偏差类型 */
    const getDipSettleFactorDeviation = () => {
      const sumAmount = rawParams.sumAmount ?? 0
      const dipAvgAmount = getDipAvgAmount()

      if (dipAvgAmount === 0) {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return 1
      }

      // 偏差类型 - 高倍率
      // 费用在 200%以上的病例病种分值 =〔(该病例医疗总费用 ÷ 上一年度同级别定点医疗机构该病种次均医疗总费用 - 2）+ 1〕 × 该病种分值
      if (sumAmount > dipAvgAmount * 2) {
        dipInfo.dipSettleDeviation = EnumDeviation.高倍率
        return sumAmount / dipAvgAmount - 2 + 1
      }
      // 偏差类型 - 低倍率
      // 费用在 50%以下的病例病种分值 = 该病例医疗总费用 ÷ 上一年度同级别定点医疗机构该病种平均费用 × 该病种分值
      else if (sumAmount < dipAvgAmount * 0.5) {
        dipInfo.dipSettleDeviation = EnumDeviation.低倍率
        return sumAmount / dipAvgAmount
      }
      // 偏差类型 - 正常倍率
      else {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return 1
      }
    }

    /** 获取最终分值 */
    const getDipSettleFactor = () => {
      const factor = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup : configSettle.factorHospital
      return dipInfo.dipScore * dipInfo.dipSettleFactorDeviation * factor
    }

    /** 获取最终分值单价 */
    const dipDipSettleScorePrice = () => {
      return rawParams.insuranceType === EnumInsuranceType.职工 ? configSettle.factorEmployeePrice : configSettle.factorResidentPrice
    }

    dipInfo.dipSettleAvgAmount = getDipAvgAmount()

    dipInfo.dipSettleFactorDeviation = getDipSettleFactorDeviation()
    dipInfo.dipSettleFactorHospital = configSettle.factorHospital
    dipInfo.dipSettleFactorBasicGroup = dipInfo.dipFactorBasicGroup

    dipInfo.dipSettleScorePriceEmployee = configSettle.factorEmployeePrice
    dipInfo.dipSettleScorePriceResident = configSettle.factorResidentPrice

    dipInfo.dipSettleScore = getDipSettleFactor()
    dipInfo.dipSettleScorePrice = dipDipSettleScorePrice()
    dipInfo.dipSettleAmount = parseFloat(dipInfo.dipScore as any) === 0 ? rawParams.sumAmount : dipInfo.dipSettleScore * dipInfo.dipSettleScorePrice ?? 0

    return dipInfo
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

        // 1. 判定手术是否单一存在
        if (dipInfo.oprnOprtCode && dipInfo.oprnOprtCode.indexOf('+') === -1) {
          const dipOperations = dipInfo.oprnOprtCode?.split('/') ?? []

          if (dipOperations.some((item) => formatParams.oprnOprtCode.includes(item))) {
            const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo

            dipInfoResult.oprnOprtCodeMatch = (formatParams.oprnOprtCode as string[]).filter((v) => dipOperations.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
            dipInfoResult.oprnOprtCodeUnMatch = (formatParams.oprnOprtCode as string[]).filter((v) => !dipOperations.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeUnMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
            dipInfoResult.oprnOprtType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

            dipInfoList.push(dipInfoResult)
          }
        }
        // 2. 判定手术是否联合存在（组内手术操作存在 + 符号）
        else if (dipInfo.oprnOprtCode && dipInfo.oprnOprtCode.indexOf('+') !== -1) {
          const dipOperations = dipInfo?.oprnOprtCode?.split('+') ?? []
          if (
            dipOperations.every((item) => {
              if (
                // 任一 / 满足
                (item.indexOf('/') !== -1 && item.split('/').some((item) => formatParams.oprnOprtCode.includes(item))) ||
                // 所有 + 满足
                (item.indexOf('/') === -1 && formatParams.oprnOprtCode.includes(item))
              ) {
                return true
              }
            })
          ) {
            const dipOperationsSplitArray = dipOperations.map((item) => item.split('/'))?.flat()
            const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo
            dipInfoResult.oprnOprtCodeMatch = (formatParams.oprnOprtCode as string[]).filter((v) => dipOperationsSplitArray.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
            dipInfoResult.oprnOprtCodeUnMatch = (formatParams.oprnOprtCode as string[]).filter((v) => !dipOperationsSplitArray.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeUnMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
            dipInfoResult.oprnOprtType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

            dipInfoList.push(dipInfoResult)
          }
        }
      }
    }

    // 保守治疗组
    if (dipInfoList.length === 0 && this.getOprnOprtType(formatParams.oprnOprtCode) === EnumOprnOprtType.保守治疗) {
      const dipInfo = dipList.find((item) => !item.oprnOprtCode)

      if (dipInfo) {
        const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo
        dipInfoResult.oprnOprtCodeMatch = []
        dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
        dipInfoResult.oprnOprtType = EnumOprnOprtType.保守治疗

        dipInfoList.push(dipInfoResult)
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
    const operationLevel = this.getOprnOprtType(formatParams.oprnOprtCode)

    // 从诊断亚目开始，入精确综合组
    for (let i = 3; i > 0; i--) {
      // 获取缓存 key
      const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, i))
      const dipList = dipContentList[cacheKey] ?? []

      const dipInfo = dipList.find((dip) => dip.oprnOprtType === operationLevel)

      if (dipInfo) {
        const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo
        dipInfoResult.oprnOprtCodeMatch = []
        dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
        dipInfoList.push(dipInfoResult)

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
          const dipInfo = dipContentList[key].find((group) => group.oprnOprtType === operationLevel)
          if (dipInfo) {
            const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo
            dipInfoResult.oprnOprtCodeMatch = []
            dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]

            dipInfoList.push(dipInfoResult)

            break
          }
        }
      }
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
    dipInfoList.map((item) => {
      const cacheKey = getCacheKey(item.region, item.version, item.dipCode)
      const dipContentsSupplement = dipContentsSupplementList[cacheKey]

      if (dipContentsSupplement?.length > 0) {
        // 年龄级别 - 表达式关键要素
        const { years: $ExpressionAgeYears, days: $ExpressionAgeDays } = getAge(new Date(rawParams.birthDate), new Date(rawParams.inHospitalDate))
        // 肿瘤级别 - 表达式关键要素
        const $ExpressionDiagCode = formatParams.diagCode
        // 疾病级别 - 表达式关键要素
        const $ExpressionCcMcc = this.dipService.CACHE_DIP_CONFIG_CC_MCC
        const $ExpressionExcludeCcMcc = this.dipService.CACHE_DIP_CONFIG_EXCLUDE_CC_MCC

        const $ExpressionIsCcFunc = () => {
          const $ExpressionMajorDiagCode = formatParams.diagCode.slice(0, 1) as string[]
          const $ExpressionMinorDiagCode = formatParams.diagCode.slice(1) as string[]

          return $ExpressionMinorDiagCode.some((diagCode) => {
            const ccMcc = $ExpressionCcMcc[getCacheKey(rawParams.region, rawParams.version, diagCode)]
            if (ccMcc && ccMcc.type === EnumCcMcc.cc) {
              return $ExpressionExcludeCcMcc[getCacheKey(rawParams.region, rawParams.version, ccMcc.exclude)]?.every((item) => item.diagCode !== $ExpressionMajorDiagCode[0])
            }
            return false
          })
        }
        const $ExpressionIsMccFunc = () => {
          const $ExpressionMajorDiagCode = formatParams.diagCode.slice(0, 1) as string[]
          const $ExpressionMinorDiagCode = formatParams.diagCode.slice(1) as string[]

          return $ExpressionMinorDiagCode.some((diagCode) => {
            const ccMcc = $ExpressionCcMcc[getCacheKey(rawParams.region, rawParams.version, diagCode)]
            if (ccMcc && ccMcc.type === EnumCcMcc.mcc) {
              return $ExpressionExcludeCcMcc[getCacheKey(rawParams.region, rawParams.version, ccMcc.exclude)]?.every((item) => item.diagCode !== $ExpressionMajorDiagCode[0])
            }
            return false
          })
        }

        // 执行辅助目录命中表达式
        const dipContentsSupplementList = dipContentsSupplement.filter((item) => eval(item.dipSupplementExpression))
        if (dipContentsSupplementList.length === 0) {
          return item
        }

        // 赋值辅助目录相关信息
        const dipSupplement = dipContentsSupplementList.reduce((p, c) => (p.dipSupplementFactor > c.dipSupplementFactor ? p : c))
        item.dipSupplementType = dipSupplement.dipSupplementType
        item.dipSupplementName = dipSupplement.dipSupplementName
        item.dipSupplementScore = dipSupplement.dipSupplementScore
        item.dipSupplementFactor = dipSupplement.dipSupplementFactor
        item.dipSupplementAvgAmount = dipSupplement.dipSupplementAvgAmount
        item.dipSupplementAvgInDays = dipSupplement.dipSupplementAvgInDays
      }

      return item
    })

    return dipInfoList
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
        // 结算系数
        const configSettle = this.dipService.getConfigSettle(rawParams.region, rawParams.version, rawParams.hosCode)
        // 平均费用
        const configPAvgAmount = this.dipService.getConfigAvgMount(
          rawParams.region,
          rawParams.version,
          configSettle.hospitalLevel,
          p.dipCode,
          p.dipSupplementType,
          p.dipSupplementName,
          rawParams.insuranceType
        )
        const configCAvgAmount = this.dipService.getConfigAvgMount(
          rawParams.region,
          rawParams.version,
          configSettle.hospitalLevel,
          c.dipCode,
          c.dipSupplementType,
          c.dipSupplementName,
          rawParams.insuranceType
        )

        const sumAmount = rawParams.sumAmount ?? 0
        const pDipAvgAmount =
          configPAvgAmount?.dipAvgAmount ??
          p.dipSupplementAvgAmount ??
          p.dipAvgAmount ??
          (rawParams.insuranceType === EnumInsuranceType.职工
            ? configSettle.factorEmployeePrice * (p.dipSupplementScore ?? p.dipScore)
            : configSettle.factorResidentPrice * (p.dipSupplementScore ?? p.dipScore))
        const cDipAvgAmount =
          configCAvgAmount?.dipAvgAmount ??
          c.dipSupplementAvgAmount ??
          c.dipAvgAmount ??
          (rawParams.insuranceType === EnumInsuranceType.职工
            ? configSettle.factorEmployeePrice * (c.dipSupplementScore ?? c.dipScore)
            : configSettle.factorResidentPrice * (c.dipSupplementScore ?? c.dipScore))

        if (Math.abs(pDipAvgAmount - sumAmount) <= Math.abs(cDipAvgAmount - sumAmount)) {
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

    const operationLevel = this.getOprnOprtType(formatParams.oprnOprtCode)

    // 优先匹配和病例的操作最大类型匹配的核心 -> 综合
    // 其次匹配低于病例的操作最大类型匹配的核心 -> 综合

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
  public getOprnOprtType(oprnOprtCode, toVersion = 'YB_2.0'): string {
    if (oprnOprtCode.length === 0) {
      return EnumOprnOprtType.保守治疗
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      const temp = oprnOprtCode.reduce((p, c) => {
        const cacheKeyP = getCacheKey(toVersion, p)
        const cacheKeyC = getCacheKey(toVersion, c)

        return this.getOprnSort(this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKeyP]?.oprnOprtType) >=
          this.getOprnSort(this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKeyC]?.oprnOprtType)
          ? p
          : c
      })
      const cacheKey = getCacheKey(toVersion, temp)

      return this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtType ?? EnumOprnOprtType.保守治疗
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)

      return this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtType ?? EnumOprnOprtType.保守治疗
    }
  }

  /**
   * 获取手术操作顺序码
   */
  public getOprnSort(oprnOprtCode) {
    const sortArr = [EnumOprnOprtType.保守治疗, EnumOprnOprtType.诊断性操作, EnumOprnOprtType.治疗性操作, EnumOprnOprtType.相关手术]

    return sortArr.indexOf(oprnOprtCode)
  }

  /**
   * 是否保守治疗
   */
  public isConservative(oprnOprtCode, toVersion = 'YB_2.0'): boolean {
    if (oprnOprtCode.length === 0) {
      return true
    }

    if (Array.isArray(oprnOprtCode) && oprnOprtCode.length > 0) {
      return oprnOprtCode.every((oprnOprtCode) => {
        const cacheKey = getCacheKey(toVersion, oprnOprtCode)

        if (!this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]) {
          return true
        } else {
          return this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnSincType === '0类' && this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtLevel < '3'
        }
      })
    } else {
      const cacheKey = getCacheKey(toVersion, oprnOprtCode)

      if (!this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]) {
        return true
      } else {
        return this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnSincType === '0类' && this.dipService.CACHE_CONTENTS_ICD9_YB_2_0[cacheKey]?.oprnOprtLevel < '3'
      }
    }
  }
}
