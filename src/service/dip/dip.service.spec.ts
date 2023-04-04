import { Test, TestingModule } from '@nestjs/testing'
import { DipService } from './dip.service'

describe('GroupService', () => {
  let service: DipService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DipService]
    }).compile()

    service = module.get<DipService>(DipService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
