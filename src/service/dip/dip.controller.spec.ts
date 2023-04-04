import { Test, TestingModule } from '@nestjs/testing'
import { DipController } from './dip.controller'
import { DipService } from './dip.service'

describe('DipController', () => {
  let controller: DipController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DipController],
      providers: [DipService]
    }).compile()

    controller = module.get<DipController>(DipController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
