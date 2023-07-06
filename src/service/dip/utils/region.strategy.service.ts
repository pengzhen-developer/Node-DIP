import { Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumRegion, IRegionStrategy, TDipInfo } from 'src/types/dip.type'
import { getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { Region_420500_2021 } from './region.420500.2021'
import { Region_420500_2022 } from './region.420500.2022'
import { Region_420500_2023 } from './region.420500.2023'
import { Region_420600_2023 } from './region.420600.2023'
import { Region_420800_2023 } from './region.420800.2023'
import { Region_420900_2022 } from './region.420900.2022'
import { Region_421000_2021 } from './region.421000.2021'
import { Region_421000_2022 } from './region.421000.2022'
import { Region_421000_2023 } from './region.421000.2023'
import { Region_421200_2023 } from './region.421200.2023'
import { Region_370800_2023 } from './region.370800.2023'
import { Region_370900_2023 } from './region.370900.2023'

@Injectable()
export class RegionStrategyService implements IRegionStrategy {
  constructor(
    private readonly Region_420500_2021: Region_420500_2021,
    private readonly Region_420500_2022: Region_420500_2022,
    private readonly Region_420500_2023: Region_420500_2023,
    private readonly Region_420600_2023: Region_420600_2023,
    private readonly Region_420800_2023: Region_420800_2023,
    private readonly Region_420900_2022: Region_420900_2022,
    private readonly Region_421000_2021: Region_421000_2021,
    private readonly Region_421000_2022: Region_421000_2022,
    private readonly Region_421000_2023: Region_421000_2023,
    private readonly Region_421200_2023: Region_421200_2023,
    private readonly Region_370800_2023: Region_370800_2023,
    private readonly Region_370900_2023: Region_370900_2023
  ) {}
  dipService: DipService

  regionPolicy(params: DipTodo) {
    const RegionPolicyMap = {
      [getCacheKey(EnumRegion.宜昌市, '2021')]: this.Region_420500_2021,
      [getCacheKey(EnumRegion.宜昌市, '2022')]: this.Region_420500_2022,
      [getCacheKey(EnumRegion.宜昌市, '2023')]: this.Region_420500_2023,
      [getCacheKey(EnumRegion.襄阳市, '2023')]: this.Region_420600_2023,
      [getCacheKey(EnumRegion.荆门市, '2023')]: this.Region_420800_2023,
      [getCacheKey(EnumRegion.孝感市, '2022')]: this.Region_420900_2022,
      [getCacheKey(EnumRegion.荆州市, '2021')]: this.Region_421000_2021,
      [getCacheKey(EnumRegion.荆州市, '2022')]: this.Region_421000_2022,
      [getCacheKey(EnumRegion.荆州市, '2023')]: this.Region_421000_2023,
      [getCacheKey(EnumRegion.咸宁市, '2023')]: this.Region_421200_2023,
      [getCacheKey(EnumRegion.荆州市, '2023')]: this.Region_421000_2023,
      [getCacheKey(EnumRegion.济宁市, '2023')]: this.Region_370800_2023,
      [getCacheKey(EnumRegion.泰安市, '2023')]: this.Region_370900_2023
    }

    const { region, version } = params
    const key = getCacheKey(region, version)
    const RegionPolicy = RegionPolicyMap[key]

    return RegionPolicy
  }

  toDip(rawParams: DipTodo, formatParams: DipTodo): TDipInfo {
    return this.regionPolicy(rawParams).toDip(rawParams, formatParams)
  }

  toSettle(rawParams: DipTodo, formatParams: DipTodo, dipInfo: TDipInfo): TDipInfo {
    return this.regionPolicy(rawParams).toSettle(rawParams, formatParams, dipInfo)
  }

  toRecommend(rawParams: DipTodo, formatParams: DipTodo): TDipInfo[] {
    return this.regionPolicy(rawParams).toRecommend(rawParams, formatParams)
  }
}
