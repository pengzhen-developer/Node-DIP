import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DipService } from '../dip.service'
import { Region_420900 } from './region.420900'

@Injectable()
export class Region_420900_2022 extends Region_420900 {
  constructor(@Inject(forwardRef(() => DipService)) public readonly dipService: DipService) {
    super(dipService)
  }
}
