import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipService } from '../dip.service'
import { Region_421000 } from './region.421000'

@Injectable()
export class Region_421000_2023 extends Region_421000 {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }
}
