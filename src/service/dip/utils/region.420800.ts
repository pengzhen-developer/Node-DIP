import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { TDipInfo, TDipContents, EnumOprnOprtType } from 'src/types/dip.type'
import { getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { RegionBaseService } from './region.base.service'

@Injectable()
export class Region_420800 extends RegionBaseService {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }

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

    // 荆门：个性化分组方案，分组目录中存在细目的手术操作，优先全码的手术操作
    decideGroups = this.chooseUniqueGroupByOprnCode(rawParams, formatParams, [...coreGroups, ...basicGroups])
    // FIXME:
    // 荆门：个性化需求，手术组优先入分值更高的组
    decideGroups = this.chooseUniqueGroupByDipScore(rawParams, formatParams, [...decideGroups])

    // 选定组
    decideGroups = this.chooseCoreGroupByMatchQuantity(rawParams, formatParams, [...decideGroups])
    decideGroups = this.chooseCoreGroupByAbsoluteFee(rawParams, formatParams, [...decideGroups])
    decideGroups = this.chooseUniqueGroupByDipType(rawParams, formatParams, [...decideGroups, ...comprehensiveGroup])

    return decideGroups[0]
  }

  intoCoreGroups(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    const dipInfoList: TDipInfo[] = []

    // 获取缓存 key
    const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, 5))
    // 判定诊断类目
    const dipList = dipContentList[cacheKey]?.concat([]) ?? []

    // 有手术及操作判定
    if (formatParams.oprnOprtCode?.length > 0) {
      for (let i = 0; i < dipList.length; i++) {
        const dipInfo = dipList[i]

        // 1. 判定手术是否单一存在
        if (dipInfo.oprnOprtCode && dipInfo.oprnOprtCode?.indexOf('+') === -1) {
          const dipOperations = dipInfo.oprnOprtCode?.split('/') ?? []

          // 如果手术操作只有 4 位码（细目），代表包含该细目的所有手术操作
          if (dipInfo.oprnOprtCode?.length === 5 && dipOperations.some((item) => (formatParams.oprnOprtCode as string[]).map((item) => item.substring(0, 5)).includes(item))) {
            const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo

            dipInfoResult.oprnOprtCodeMatch = (formatParams.oprnOprtCode as string[]).filter((v) => dipOperations.some((o) => v.startsWith(o))) ?? []
            dipInfoResult.oprnOprtCodeMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
            dipInfoResult.oprnOprtCodeUnMatch = (formatParams.oprnOprtCode as string[]).filter((v) => dipOperations.some((o) => !v.startsWith(o))) ?? []
            dipInfoResult.oprnOprtCodeUnMatchType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
            dipInfoResult.oprnOprtType = this.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

            dipInfoList.push(dipInfoResult)
          }

          // 否则，代表必须等于该手术操作
          else if (dipInfo.oprnOprtCode?.length !== 5 && dipOperations.some((item) => formatParams.oprnOprtCode?.includes(item))) {
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
        else if (dipInfo.oprnOprtCode && dipInfo.oprnOprtCode?.indexOf('+') !== -1) {
          const dipOperations = dipInfo?.oprnOprtCode?.split('+') ?? []
          if (
            dipOperations.every((item) => {
              if (
                // 任一 / 满足
                (item.indexOf('/') !== -1 && item.split('/').some((item) => formatParams.oprnOprtCode?.includes(item))) ||
                // 所有 + 满足
                (item.indexOf('/') === -1 && formatParams.oprnOprtCode?.includes(item))
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

  intoBasicGroups(rawParams: DipTodo, formatParams: DipTodo, dipContentList: TDipContents): TDipInfo[] {
    const dipInfoListBasic = super.intoBasicGroups(rawParams, formatParams, dipContentList)
    const dipInfoListComprehensive = super.intoComprehensiveGroup(rawParams, formatParams, dipContentList)

    return dipInfoListBasic.concat(dipInfoListComprehensive)
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

    // 入保底组
    if (dipInfoList.length === 0) {
      const cacheKey = getCacheKey(formatParams.region, formatParams.version, formatParams.diagCode[0].substring(0, 1))
      const dipInfo = dipContentList[cacheKey]?.[0]

      if (dipInfo) {
        const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo

        dipInfoList.push(dipInfoResult)
      }
    }

    this.dipService.logger({
      title: '入综合组',
      description: dipInfoList
    })

    return dipInfoList
  }

  /**
   * 根据手术操作选定组（手术操作编码 > 细目编码）
   */
  chooseUniqueGroupByOprnCode(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    if (
      dipInfoList.some((dipInfo) => dipInfo.oprnOprtCode?.length === 5) &&
      dipInfoList
        .filter((dipInfo) => dipInfo.oprnOprtCode?.length !== 5)
        .some((dipInfo) => dipInfo.oprnOprtCode?.startsWith(dipInfoList.find((dipInfo) => dipInfo.oprnOprtCode?.length === 5)?.oprnOprtCode))
    ) {
      return dipInfoList.filter((dipInfo) => dipInfo.oprnOprtCode?.length !== 5)
    } else {
      return dipInfoList
    }
  }

  /**
   * FIXME:
   * 根据分值选定组（核心手术组，优先分值更高的）
   */
  chooseUniqueGroupByDipScore(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    if (dipInfoList.some((dipInfo) => dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)) {
      return [dipInfoList.reduce((p, c) => (Number(p.dipScore) >= Number(c.dipScore) ? p : c))]
    } else {
      return dipInfoList
    }
  }
}
