import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipService } from '../dip.service'
import { Region_420500 } from './region.420500'

@Injectable()
export class Region_420500_2022 extends Region_420500 {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }
}
