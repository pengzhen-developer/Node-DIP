import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipService } from '../dip.service'
import { Region_420600 } from './region.420600'

@Injectable()
export class Region_420600_2023 extends Region_420600 {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }
}
