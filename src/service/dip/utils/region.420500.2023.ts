import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumDipType, EnumOprnOprtType, TDipContents, TDipInfo } from 'src/types/dip.type'
import { getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { RegionBaseService } from './region.base.service'

@Injectable()
export class Region_420500_2023 extends RegionBaseService {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }

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
            dipInfoResult.oprnOprtCodeMatchType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
            dipInfoResult.oprnOprtCodeUnMatch = (formatParams.oprnOprtCode as string[]).filter((v) => !dipOperations.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeUnMatchType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
            dipInfoResult.oprnOprtType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

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
            dipInfoResult.oprnOprtCodeMatchType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)
            dipInfoResult.oprnOprtCodeUnMatch = (formatParams.oprnOprtCode as string[]).filter((v) => !dipOperationsSplitArray.includes(v)) ?? []
            dipInfoResult.oprnOprtCodeUnMatchType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
            dipInfoResult.oprnOprtType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeMatch)

            dipInfoList.push(dipInfoResult)
          }
        }
      }
    }

    // 宜昌：不能入核心则入核心保守
    // 保守治疗组
    if (dipInfoList.length === 0 && super.isConservative(formatParams.oprnOprtCode)) {
      const dipInfo = dipList.find((item) => !item.oprnOprtCode)

      if (dipInfo) {
        const dipInfoResult = JSON.parse(JSON.stringify(dipInfo)) as TDipInfo
        dipInfoResult.oprnOprtCodeMatch = []
        dipInfoResult.oprnOprtCodeUnMatch = formatParams.oprnOprtCode as string[]
        dipInfoResult.oprnOprtCodeUnMatchType = super.getOprnOprtType(dipInfoResult.oprnOprtCodeUnMatch)
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
    return this.intoCoreGroups(rawParams, formatParams, dipContentList)
  }

  chooseUniqueGroupByDipType(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    let chooseGroupByType: TDipInfo[] = []

    const operationLevel = super.getOprnOprtType(formatParams.oprnOprtCode)

    // 优先匹配和病例的操作最大类型匹配的核心 -> 综合
    // 其次匹配低于病例的操作最大类型匹配的核心 -> 综合

    const chooseList = [
      // 宜昌：当前组的其他操作，相关手术，优先入相关手术
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.some(
            (item) =>
              (item.dipType === EnumDipType.核心 || item.dipType === EnumDipType.基层) &&
              item.oprnOprtCodeUnMatchType === EnumOprnOprtType.相关手术 &&
              dipInfoList.some((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.相关手术)
          ) && dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '核心: 相关手术',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '基层: 相关手术',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '核心: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '基层: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '综合: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '核心: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '基层: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '综合: 诊断性操作',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.诊断性操作 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '核心: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '基层: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗 && operationLevel === dipInfo.oprnOprtType)
      },
      {
        tooltip: '综合: 保守治疗',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.保守治疗 && operationLevel === dipInfo.oprnOprtType)
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
}
