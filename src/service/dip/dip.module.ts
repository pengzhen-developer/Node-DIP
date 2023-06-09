import { Module } from '@nestjs/common'
import { DipService } from './dip.service'
import { DipController } from './dip.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DipTodo } from 'src/entities/DipTodo'
import { DipTodoResult } from 'src/entities/DipTodoResult'
import { RegionStrategyService } from './utils/region.strategy.service'
import { RegionBaseService } from './utils/region.base.service'
import { Region_420500_2021 } from './utils/region.420500.2021'
import { Region_420500_2022 } from './utils/region.420500.2022'
import { Region_420500_2023 } from './utils/region.420500.2023'
import { Region_420600_2023 } from './utils/region.420600.2023'
import { Region_420800_2023 } from './utils/region.420800.2023'
import { Region_420900_2022 } from './utils/region.420900.2022'
import { Region_421000_2021 } from './utils/region.421000.2021'
import { Region_421000_2022 } from './utils/region.421000.2022'
import { Region_421000_2023 } from './utils/region.421000.2023'
import { Region_421200_2023 } from './utils/region.421200.2023'
import { Region_370800_2023 } from './utils/region.370800.2023'
import { Region_370900_2023 } from './utils/region.370900.2023'

@Module({
  imports: [TypeOrmModule.forFeature([DipTodo, DipTodoResult])],
  controllers: [DipController],
  providers: [
    DipService,
    RegionStrategyService,
    RegionBaseService,
    Region_420500_2021,
    Region_420500_2022,
    Region_420500_2023,
    Region_420600_2023,
    Region_420800_2023,
    Region_420900_2022,
    Region_421000_2021,
    Region_421000_2022,
    Region_421000_2023,
    Region_421200_2023,
    Region_370800_2023,
    Region_370900_2023
  ]
})
export class DipModule {}
