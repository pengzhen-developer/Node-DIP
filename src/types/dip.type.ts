import { DipConfigExcludeIcd9 } from 'src/entities/DipConfigExcludeIcd9'
import { DipConfigSettle } from 'src/entities/DipConfigSettle'
import { DipContents } from 'src/entities/DipContents'
import { DipTodo } from 'src/entities/DipTodo'
import { ImpIcd10 } from 'src/entities/ImpIcd10'
import { ImpIcd9 } from 'src/entities/ImpIcd9'
import { DipContentsSupplement } from 'src/entities/DipContentsSupplement'
import { DipConfigAvgAmount } from 'src/entities/DipConfigAvgAmount'
import { DipConfigCcMcc } from 'src/entities/DipConfigCcMcc'
import { DipConfigExcludeCcMcc } from 'src/entities/DipConfigExcludeCcMcc'

export interface IRegionStrategy {
  /** 分组 */
  toDip(rawParams: DipTodo, formatParams: DipTodo): TDipInfo

  /** 结算 */
  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo
}

export type TDipConfigExcludeIcd9 = {
  [key: string]: DipConfigExcludeIcd9
}

export type TDipConfigSettle = {
  [key: string]: DipConfigSettle
}

export type TDipConfigAvgAmount = {
  [key: string]: DipConfigAvgAmount
}

export type TDipConfigCcMcc = {
  [key: string]: DipConfigCcMcc
}

export type TDipConfigExcludeCcMcc = {
  [key: string]: DipConfigExcludeCcMcc[]
}

export type TImpIcd9 = {
  [key: string]: ImpIcd9
}

export type TImpIcd10 = {
  [key: string]: ImpIcd10
}

export type TDipContents = {
  [key: string]: DipContents[]
}

export type TDipContentsSupplement = {
  [key: string]: DipContentsSupplement[]
}

export type TDipLog = {
  log?: TDebug[]
  params: any
}

export type TDipMatch = {
  /** id */
  id?: number
  /** 数据 id */
  dataId?: string
  /** 手术操作匹配项 */
  oprnOprtCodeMatch?: string[]
  /** 手术操作匹配项-手术类型 */
  oprnOprtCodeMatchType?: string
  /** 手术操作未匹配项 */
  oprnOprtCodeUnMatch?: string[]
  /** 手术操作未匹配项-手术类型 */
  oprnOprtCodeUnMatchType?: string
  /** 偏差类型 */
  dipSettleDeviation?: string
  /** 结算平均费用（经系数调整） */
  dipSettleAvgAmount?: number

  /** 结算分值单价(居民) */
  dipSettleScorePriceResident?: number
  /** 结算分值单价(职工) */
  dipSettleScorePriceEmployee?: number

  /** 分值调整系数【经医疗机构调整】 */
  dipSettleFactorHospital?: number
  /** 分值调整系数【经基层病种调整】 */
  dipSettleFactorBasicGroup?: number
  /** 分值调整系数【经偏差类型调整】 */
  dipSettleFactorDeviation?: number

  /** 结算分值 */
  dipSettleScore?: number
  /** 结算分值单价 */
  dipSettleScorePrice?: number
  /** 结算费用 */
  dipSettleAmount?: number
  /** 标准费用 */
  dipStandardAmount?: number
}

export type TDipUnMatch = {
  code?: string
  message?: string
}

export type TDipInfo = DipContents & DipContentsSupplement & TDipMatch & TDipUnMatch & TDipLog

export type TDebug = {
  title: string
  description: TDipInfo[]
}

export enum EnumDipUnMatchCode {
  参数错误 = '1000',
  入组失败 = '2000',
  结算失败 = '3000'
}

/**
 * DIP 类型
 */
export enum EnumDipType {
  核心 = '核心',
  基层 = '基层',
  综合 = '综合'
}

/**
 * 手术及操作类型
 */
export enum EnumOprnOprtType {
  保守治疗 = '保守治疗',
  诊断性操作 = '诊断性操作',
  治疗性操作 = '治疗性操作',
  相关手术 = '相关手术'
}

/**
 * 手术及操作级别
 */
export enum EnumOprnOprtLevel {
  一级手术 = '1',
  二级手术 = '2',
  三级手术 = '3',
  四级手术 = '4'
}

/**
 * 医保类型
 */
export enum EnumInsuranceType {
  职工 = '职工',
  居民 = '居民'
}

/**
 * 离院方式
 */
export enum EnumDscgWay {
  医嘱离院 = '医嘱离院',
  医嘱转院 = '医嘱转院',
  医嘱转社区卫生服务机构 = '医嘱转社区卫生服务机构/乡镇卫生院',
  非医嘱离院 = '非医嘱离院',
  死亡 = '死亡',
  其他 = '其他'
}

/**
 * cc / mcc
 */
export enum EnumCcMcc {
  CC = 'cc',
  MCC = 'mcc'
}

/**
 * 偏差类型
 */
export enum EnumDeviation {
  高倍率 = '高倍率',
  低倍率 = '低倍率',
  正常倍率 = '正常倍率'
}

/**
 * 医保统筹区
 */
export enum EnumRegion {
  湖北省 = '420000',
  武汉市 = '420100',
  黄石市 = '420200',
  十堰市 = '420300',
  宜昌市 = '420500',
  襄阳市 = '420600',
  鄂州市 = '420700',
  荆门市 = '420800',
  孝感市 = '420900',
  荆州市 = '421000',
  黄冈市 = '421100',
  咸宁市 = '421200',
  随州市 = '421300'
}
