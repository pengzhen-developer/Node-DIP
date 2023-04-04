import { Test, TestingModule } from '@nestjs/testing'
import { CacheController } from './caching.controller'
import { CacheService } from './caching.service'

describe('CacheController', () => {
  let controller: CacheController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [CacheService]
    }).compile()

    controller = module.get<CacheController>(CacheController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
