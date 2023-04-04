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
import { Region_420900_2022 } from './utils/region.420900.2022'
import { Region_421000_2021 } from './utils/region.421000.2021'
import { Region_421000_2022 } from './utils/region.421000.2022'

@Module({
  imports: [TypeOrmModule.forFeature([DipTodo, DipTodoResult])],
  controllers: [DipController],
  providers: [DipService, RegionStrategyService, RegionBaseService, Region_420500_2021, Region_420500_2022, Region_420900_2022, Region_421000_2021, Region_421000_2022]
})
export class DipModule {}
