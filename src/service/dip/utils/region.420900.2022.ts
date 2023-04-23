import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumRegion, EnumOprnOprtType, TDipContents, TDipInfo, EnumDipType, EnumDeviation, EnumInsuranceType } from 'src/types/dip.type'
import { getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { RegionBaseService } from './region.base.service'

@Injectable()
export class Region_420900_2022 extends RegionBaseService {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }

  toDip(rawParams: DipTodo, formatParams: DipTodo): TDipInfo {
    let decideGroups: TDipInfo[] = []
    // 入任意组
    let coreGroups = this.intoCoreGroups(rawParams, formatParams, this.dipService.CACHE_CORE_GROUP_LIST)
    let basicGroups = this.intoBasicGroups(rawParams, formatParams, this.dipService.CACHE_BASIC_GROUP_LIST)
    let comprehensiveGroup = this.intoComprehensiveGroup(rawParams, formatParams, this.dipService.CACHE_COMPREHENSIVE_GROUP_LIST)
    // 经辅助目录调整
    coreGroups = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, coreGroups)
    basicGroups = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, basicGroups)
    comprehensiveGroup = this.intoSupplementGroup(rawParams, formatParams, this.dipService.CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, comprehensiveGroup)
    // 选定唯一组
    decideGroups = this.chooseCoreGroupByMatchQuantity(rawParams, formatParams, [...coreGroups, ...basicGroups])
    decideGroups = this.chooseCoreGroupByAbsoluteFee(rawParams, formatParams, [...decideGroups, ...basicGroups])
    decideGroups = this.chooseUniqueGroupByDipType(rawParams, formatParams, [...decideGroups, ...comprehensiveGroup])

    return decideGroups[0]
  }

  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo {
    /** 结算系数 */
    const configSettle = this.dipService.getConfigSettle(rawParams.region, rawParams.version, rawParams.hosCode)
    /** 病种分值 */
    const dipScore = dipInfo.dipSupplementName ? dipInfo.dipSupplementScore * dipInfo.dipSupplementFactor : dipInfo.dipScore
    /** 病种分值单价（模拟均费） */
    const dipMockScorePrice = configSettle.factorScorePrice
    /** 均费调整系数 */
    const dipFactorAvgAmount = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup : configSettle.factorAvgAmount
    /** 结算分值单价 */
    const dipScorePrice = rawParams.insuranceType === EnumInsuranceType.职工 ? configSettle.factorEmployeePrice : configSettle.factorResidentPrice
    /** 结算调整系数 */
    const dipFactorSettle = dipInfo.dipType === EnumDipType.基层 ? dipInfo.dipFactorBasicGroup : configSettle.factorHospital

    /** 计算 DIP 均费 */
    const getDipAvgAmount = () => {
      // 存在辅助目录均费，使用: 辅助目录均费 * 均费调整系数
      if (dipInfo.dipSupplementAvgAmount) {
        return dipInfo.dipSupplementAvgAmount * dipFactorAvgAmount
      }
      // 存在目录均费，使用: 目录均费 * 医疗机构系数
      else if (dipInfo.dipAvgAmount) {
        return dipInfo.dipAvgAmount * dipFactorAvgAmount
      }
      // 均不存在，使用: 病种分值 * 分值单价  * 调整系数
      else {
        return dipScore * (dipMockScorePrice ?? dipScorePrice) * dipFactorAvgAmount
      }
    }
    /** 计算 DIP 结算分值 */
    const getDipSettleScore = () => {
      const sumAmount = rawParams.sumAmount ?? 0
      const dipAvgAmount = getDipAvgAmount()

      if (dipAvgAmount === 0) {
        return 0
      }

      // 偏差类型 - 高倍率
      // 费用在 200%以上的病例病种分值 =〔(该病例医疗总费用 ÷ 上一年度同级别定点医疗机构该病种次均医疗总费用 - 2）+ 1〕 × 该病种分值
      if (sumAmount > dipAvgAmount * 2) {
        dipInfo.dipSettleDeviation = EnumDeviation.高倍率
        return (sumAmount / dipAvgAmount - 2 + 1) * dipScore
      }
      // 偏差类型 - 低倍率
      // 费用在 50%以下的病例病种分值 = 该病例医疗总费用 ÷ 上一年度同级别定点医疗机构该病种平均费用 × 该病种分值
      else if (sumAmount < dipAvgAmount * 0.5) {
        dipInfo.dipSettleDeviation = EnumDeviation.低倍率
        return (sumAmount / dipAvgAmount) * dipScore
      }
      // 偏差类型 - 正常倍率
      else {
        dipInfo.dipSettleDeviation = EnumDeviation.正常倍率
        return dipScore
      }
    }

    dipInfo.dipSettleAvgAmount = getDipAvgAmount()
    dipInfo.dipSettleScore = getDipSettleScore()
    dipInfo.dipSettleScorePriceEmployee = configSettle.factorEmployeePrice
    dipInfo.dipSettleScorePriceResident = configSettle.factorResidentPrice
    dipInfo.dipSettleScorePrice = dipScorePrice
    dipInfo.dipSettleFactorHospital = configSettle.factorHospital
    dipInfo.dipSettleFactorBasicGroup = dipInfo.dipFactorBasicGroup
    dipInfo.dipSettleFactor = dipFactorSettle
    dipInfo.dipSettleAmount = parseFloat(dipInfo.dipScore as any) === 0 ? rawParams.sumAmount : dipInfo.dipSettleScore * dipInfo.dipSettleScorePrice * dipFactorSettle ?? 0

    return dipInfo
  }

  intoComprehensiveGroup(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    const dipInfoList: TDipInfo[] = []
    const operationLevel = super.getOprnOprtType(formatParams.oprnOprtCode)

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

    // 孝感: 无法入综合组，选择综合空白病组
    if (formatParams.region === EnumRegion.孝感市 && dipInfoList.length === 0) {
      const cacheKey = getCacheKey(formatParams.region, formatParams.version, 'kbbz')
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

  chooseUniqueGroupByDipType(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    let chooseGroupByDipTypeTooltip = ''
    let chooseGroupByDipType: TDipInfo[] = []

    const chooseList = [
      {
        tooltip: '核心: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.核心 && item.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '核心: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.核心 && item.oprnOprtType === EnumOprnOprtType.治疗性操作)
      },
      {
        tooltip: '核心: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.核心 && item.oprnOprtType === EnumOprnOprtType.诊断性操作)
      },
      {
        tooltip: '核心: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.核心 && item.oprnOprtType === EnumOprnOprtType.保守治疗)
      },
      {
        tooltip: '基层',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.基层)
      },
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '综合: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.治疗性操作)
      },
      {
        tooltip: '综合: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.诊断性操作)
      },
      {
        tooltip: '综合: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.保守治疗)
      },
      {
        tooltip: '综合: 空白病组',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === '空白病组')
      }
    ]

    for (let i = 0; i < chooseList.length; i++) {
      if (chooseList[i].filter(dipInfoList).length > 0) {
        chooseGroupByDipTypeTooltip = chooseList[i].tooltip
        chooseGroupByDipType = chooseList[i].filter(dipInfoList)

        break
      }
    }

    this.dipService.logger({
      title: `根据 DIP 类型选择唯一组: ${chooseGroupByDipTypeTooltip}`,
      description: chooseGroupByDipType
    })

    return chooseGroupByDipType
  }
}
