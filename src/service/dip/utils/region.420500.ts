import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumCcMcc, EnumDipType, EnumDscgWay, EnumOprnOprtType, TDipContents, TDipContentsSupplement, TDipInfo } from 'src/types/dip.type'
import { getAge, getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { RegionBaseService } from './region.base.service'

@Injectable()
export class Region_420500 extends RegionBaseService {
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

  intoSupplementGroup(rawParams: DipTodo, formatParams: DipTodo, dipContentsSupplementList: TDipContentsSupplement, dipInfoList: TDipInfo[]) {
    dipInfoList.map((item) => {
      const cacheKey = getCacheKey(item.region, item.version, item.dipCode)
      const dipContentsSupplement = dipContentsSupplementList[cacheKey]

      if (dipContentsSupplement?.length > 0) {
        // 主要诊断和其他诊断
        const $ExpressionMajorDiagCode = formatParams.diagCode.slice(0, 1) as string[]
        const $ExpressionMinorDiagCode = formatParams.diagCode.slice(1) as string[]
        // 年龄要素
        const { years: $ExpressionAgeYears, days: $ExpressionAgeDays } = getAge(new Date(rawParams.birthDate), new Date(rawParams.inHospitalDate))
        const { years: $ExpressionAgeInYears, days: $ExpressionAgeInDays } = getAge(new Date(rawParams.inHospitalDate), new Date(rawParams.outHospitalDate))
        // 肿瘤严重程度要素
        const $ExpressionDiagCode = formatParams.diagCode
        // 疾病严重程度
        const $ExpressionCcMcc = this.dipService.CACHE_DIP_CONFIG_CC_MCC
        const $ExpressionExcludeCcMcc = this.dipService.CACHE_DIP_CONFIG_EXCLUDE_CC_MCC

        const isCcMcc = (type: 'CC' | 'MCC') => {
          return $ExpressionMinorDiagCode.some((diagCode) => {
            const ccMcc = $ExpressionCcMcc[getCacheKey('', '', diagCode)]
            if (ccMcc && ccMcc.type === EnumCcMcc[type]) {
              return ($ExpressionExcludeCcMcc[getCacheKey('', '', ccMcc.exclude)] ?? []).every((item) => item.diagCode !== $ExpressionMajorDiagCode[0])
            }
            return false
          })
        }

        // 定义辅助目录命中规则
        const $ExpressionFunc = {
          // ['年龄']: {
          //   ['0-28天']: () => $ExpressionAgeYears === 0 && $ExpressionAgeDays >= 0 && $ExpressionAgeDays <= 28,
          //   ['29天-1周岁']: () => $ExpressionAgeYears === 0 && $ExpressionAgeDays >= 29 && $ExpressionAgeDays <= 365,
          //   ['1-6岁']: () => $ExpressionAgeYears >= 1 && $ExpressionAgeYears <= 6,
          //   ['7-17岁']: () => $ExpressionAgeYears >= 7 && $ExpressionAgeYears <= 17,
          //   ['66岁及以上']: () => $ExpressionAgeYears >= 66
          // },
          // ['肿瘤严重程度']: {
          //   ['轻度I-A级']: () => $ExpressionAgeInYears === 0 || $ExpressionAgeInDays <= 3,
          //   ['轻度I-B级']: () => () => $ExpressionAgeInYears > 0 || $ExpressionAgeInDays > 3,
          //   ['中度II级']: () => isCcMcc('CC'),
          //   ['重度III级']: () => isCcMcc('MCC'),
          //   ['转移IV级']: () => false,
          //   ['放疗V-A级']: () => false,
          //   ['化疗V-B级']: () => false,
          //   ['死亡VI-A级']: () => rawParams.dscgWay === EnumDscgWay.死亡 && ($ExpressionAgeInYears === 0 || $ExpressionAgeInDays <= 3),
          //   ['死亡VI-B级']: () => rawParams.dscgWay === EnumDscgWay.死亡 && ($ExpressionAgeInYears > 0 || $ExpressionAgeInDays > 3)
          // },
          ['疾病严重程度']: {
            ['轻度I-A级']: () => $ExpressionAgeInYears === 0 || $ExpressionAgeInDays <= 3,
            ['轻度I-B级']: () => $ExpressionAgeInYears > 0 || $ExpressionAgeInDays > 3,
            ['中度II级']: () => isCcMcc('CC'),
            ['重度III级']: () => isCcMcc('MCC'),
            ['死亡IV-A级']: () => rawParams.dscgWay === EnumDscgWay.死亡 && ($ExpressionAgeInYears === 0 || $ExpressionAgeInDays <= 3),
            ['死亡IV-B级']: () => rawParams.dscgWay === EnumDscgWay.死亡 && ($ExpressionAgeInYears > 0 || $ExpressionAgeInDays > 3)
          },
          ['地方特征']: {
            ['肺结核耐药']: () =>
              [
                'A15.000x010',
                'A15.000x012',
                'A15.000x014',
                'A15.000x016',
                'A15.000x020',
                'A15.000x024',
                'A15.000x026',
                'A15.100x002',
                'A15.100x003',
                'A15.100x005',
                'A15.100x007',
                'A15.100x008',
                'A15.100x009',
                'A15.100x010'
              ].includes($ExpressionMajorDiagCode[0]),
            ['血液类肿瘤化疗']: () => false
          }
        }

        // 执行辅助目录命中表达式
        const dipContentsSupplementList = dipContentsSupplement.filter((item) => eval(item.dipSupplementExpression))
        if (dipContentsSupplementList.length === 0) {
          return item
        }

        // 选择分值最高的辅助目录
        const dipSupplement = dipContentsSupplementList.reduce((p, c) => (p.dipSupplementFactor >= c.dipSupplementFactor ? p : c))

        // 赋值辅助目录相关信息
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

  chooseUniqueGroupByDipType(rawParams: DipTodo, formatParams: DipTodo, dipInfoList: TDipInfo[]): TDipInfo[] {
    let chooseGroupByType: TDipInfo[] = []

    const chooseList = [
      // 宜昌：核心/基层组的其他操作，存在相关手术，优先入综合：相关手术
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) =>
          dipInfoList
            .filter((item) => item.dipType === EnumDipType.核心 || item.dipType === EnumDipType.基层)
            .every((item) => item.oprnOprtCodeUnMatchType === EnumOprnOprtType.相关手术) &&
          dipInfoList.some((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.相关手术) &&
          dipInfoList.filter((item) => item.dipType === EnumDipType.综合 && item.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '核心: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.核心 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '基层: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.基层 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
      },
      {
        tooltip: '综合: 相关手术',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.相关手术)
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
        tooltip: '综合: 治疗性操作',
        filter: (dipInfoList: TDipInfo[]) => dipInfoList.filter((dipInfo) => dipInfo.dipType === EnumDipType.综合 && dipInfo.oprnOprtType === EnumOprnOprtType.治疗性操作)
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
}
