import { Injectable } from '@nestjs/common'
import { DipTodo } from 'src/entities/DipTodo'
import { EnumRegion, IRegionStrategy, TDipInfo } from 'src/types/dip.type'
import { getCacheKey } from 'src/utils'
import { DipService } from '../dip.service'
import { Region_420500_2021 } from './region.420500.2021'
import { Region_420500_2022 } from './region.420500.2022'
import { Region_420900_2022 } from './region.420900.2022'
import { Region_421000_2021 } from './region.421000.2021'
import { Region_421000_2022 } from './region.421000.2022'

@Injectable()
export class RegionStrategyService implements IRegionStrategy {
  constructor(
    private readonly Region_420500_2021: Region_420500_2021,
    private readonly Region_420500_2022: Region_420500_2022,
    private readonly Region_420900_2022: Region_420900_2022,
    private readonly Region_421000_2021: Region_421000_2021,
    private readonly Region_421000_2022: Region_421000_2022
  ) {}
  dipService: DipService

  regionPolicy(params: DipTodo) {
    const RegionPolicyMap = {
      [getCacheKey(EnumRegion.宜昌市, '2021')]: this.Region_420500_2021,
      [getCacheKey(EnumRegion.宜昌市, '2022')]: this.Region_420500_2022,
      [getCacheKey(EnumRegion.孝感市, '2022')]: this.Region_420900_2022,
      [getCacheKey(EnumRegion.荆州市, '2021')]: this.Region_421000_2021,
      [getCacheKey(EnumRegion.荆州市, '2022')]: this.Region_421000_2022
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
}
