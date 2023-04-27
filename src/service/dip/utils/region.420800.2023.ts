import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipService } from '../dip.service'
import { Region_420800 } from './region.420800'

@Injectable()
export class Region_420800_2023 extends Region_420800 {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }
}
