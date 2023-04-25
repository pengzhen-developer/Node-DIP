import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cache } from 'cache-manager'
import { getCacheKey } from './utils'
import { DipContents } from './entities/DipContents'
import { DipContentsSupplement } from './entities/DipContentsSupplement'
import { DipConfigExcludeIcd9 } from './entities/DipConfigExcludeIcd9'
import { DipConfigSettle } from './entities/DipConfigSettle'
import { DipConfigAvgAmount } from './entities/DipConfigAvgAmount'
import { ImpIcd9 } from './entities/ImpIcd9'
import { ImpIcd10 } from './entities/ImpIcd10'
import { EnumDipType } from './types/dip.type'

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(DipContents) private dipContentsRepository: Repository<DipContents>,
    @InjectRepository(DipContentsSupplement) private dipContentsSupplement: Repository<DipContentsSupplement>,
    @InjectRepository(DipConfigExcludeIcd9) private configExcludeICD9Repository: Repository<DipConfigExcludeIcd9>,
    @InjectRepository(DipConfigSettle) private configFactorRepository: Repository<DipConfigSettle>,
    @InjectRepository(DipConfigAvgAmount) private configAvgAmountRepository: Repository<DipConfigAvgAmount>,
    @InjectRepository(ImpIcd9) private impICD9Repository: Repository<ImpIcd9>,
    @InjectRepository(ImpIcd10) private impICD10Repository: Repository<ImpIcd10>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async onModuleInit() {
    // 获取缓存
    await this.cacheDipContents()
    await this.cacheDipContentsSupplement()
    await this.cacheICD9()
    await this.cacheICD10()
    await this.cacheDipConfigExcludeIcd9()
    await this.cacheDipConfigSettle()
    await this.cacheDipConfigAvgAmount()
  }

  async cache() {
    // 获取缓存
    await this.cacheDipContents()
    await this.cacheICD9()
    await this.cacheICD10()
    await this.cacheDipConfigExcludeIcd9()
    await this.cacheDipConfigSettle()
    await this.cacheDipConfigAvgAmount()
  }

  private async cacheDipContents() {
    const CACHE_CORE_GROUP_LIST = {}
    const CACHE_BASIC_GROUP_LIST = {}
    const CACHE_COMPREHENSIVE_GROUP_LIST = {}

    const DIP_CONTENTS = await this.dipContentsRepository.find()

    DIP_CONTENTS.forEach((dip) => {
      const cacheKey = getCacheKey(dip.region, dip.version, dip.diagCode)

      if (dip.dipType === EnumDipType.核心) {
        if (!CACHE_CORE_GROUP_LIST[cacheKey]) {
          CACHE_CORE_GROUP_LIST[cacheKey] = []
        }

        CACHE_CORE_GROUP_LIST[cacheKey].push(dip)
      } else if (dip.dipType === EnumDipType.基层) {
        if (!CACHE_BASIC_GROUP_LIST[cacheKey]) {
          CACHE_BASIC_GROUP_LIST[cacheKey] = []
        }

        CACHE_BASIC_GROUP_LIST[cacheKey].push(dip)
      } else if (dip.dipType === EnumDipType.综合) {
        if (!CACHE_COMPREHENSIVE_GROUP_LIST[cacheKey]) {
          CACHE_COMPREHENSIVE_GROUP_LIST[cacheKey] = []
        }

        CACHE_COMPREHENSIVE_GROUP_LIST[cacheKey].push(dip)
      }
    })

    await this.cacheManager.set('CACHE_CORE_GROUP_LIST', CACHE_CORE_GROUP_LIST, 0)
    await this.cacheManager.set('CACHE_BASIC_GROUP_LIST', CACHE_BASIC_GROUP_LIST, 0)
    await this.cacheManager.set('CACHE_COMPREHENSIVE_GROUP_LIST', CACHE_COMPREHENSIVE_GROUP_LIST, 0)
  }

  private async cacheDipContentsSupplement() {
    const CACHE_DIP_CONTENTS_SUPPLEMENT_LIST = {}

    const DIP_CONTENTS = await this.dipContentsSupplement.find()

    DIP_CONTENTS.forEach((dipSupplement) => {
      const cacheKey = getCacheKey(dipSupplement.region, dipSupplement.version, dipSupplement.dipCode)

      if (!CACHE_DIP_CONTENTS_SUPPLEMENT_LIST[cacheKey]) {
        CACHE_DIP_CONTENTS_SUPPLEMENT_LIST[cacheKey] = []
      }

      CACHE_DIP_CONTENTS_SUPPLEMENT_LIST[cacheKey].push(dipSupplement)
    })

    await this.cacheManager.set('CACHE_DIP_CONTENTS_SUPPLEMENT_LIST', CACHE_DIP_CONTENTS_SUPPLEMENT_LIST, 0)
  }

  private async cacheDipConfigExcludeIcd9() {
    const CACHE_DIP_CONFIG_EXCLUDE_ICD9 = {}

    const configExcludeICD9List = await this.configExcludeICD9Repository.find()

    configExcludeICD9List.forEach((configExcludeICD9) => {
      const cacheKey = getCacheKey(configExcludeICD9.region, configExcludeICD9.version, configExcludeICD9.oprnOprtCode)

      CACHE_DIP_CONFIG_EXCLUDE_ICD9[cacheKey] = configExcludeICD9
    })

    await this.cacheManager.set('CACHE_DIP_CONFIG_EXCLUDE_ICD9', CACHE_DIP_CONFIG_EXCLUDE_ICD9, 0)
  }

  private async cacheDipConfigSettle() {
    const CACHE_DIP_CONFIG_SETTLE = {}

    const configFactorList = await this.configFactorRepository.find()

    configFactorList.forEach((configFactor) => {
      const cacheKey = getCacheKey(configFactor.region, configFactor.version, configFactor.hospitalCode)

      CACHE_DIP_CONFIG_SETTLE[cacheKey] = configFactor
    })

    await this.cacheManager.set('CACHE_DIP_CONFIG_SETTLE', CACHE_DIP_CONFIG_SETTLE, 0)
  }

  private async cacheDipConfigAvgAmount() {
    const CACHE_DIP_CONFIG_AVG_AMOUNT = {}

    const configAvgAmountList = await this.configAvgAmountRepository.find()

    configAvgAmountList.forEach((configAvgAmount) => {
      const cacheKey = getCacheKey(
        configAvgAmount.region,
        configAvgAmount.version,
        configAvgAmount.hospitalLevel,
        configAvgAmount.dipCode,
        configAvgAmount.dipSupplementType,
        configAvgAmount.dipSupplementName,
        configAvgAmount.insuranceType
      )

      CACHE_DIP_CONFIG_AVG_AMOUNT[cacheKey] = configAvgAmount
    })

    await this.cacheManager.set('CACHE_DIP_CONFIG_AVG_AMOUNT', CACHE_DIP_CONFIG_AVG_AMOUNT, 0)
  }

  private async cacheICD9() {
    const CACHE = {
      [`CACHE_IMP_ICD9`]: {},
      [`CACHE_CONTENTS_ICD9_GL_3.0`]: {},
      [`CACHE_CONTENTS_ICD9_YB_2.0`]: {}
    }
    const impICD9 = await this.impICD9Repository.find()

    impICD9.forEach((icd9) => {
      const cacheKeyIMP = getCacheKey(icd9.fromVersion, icd9.toVersion, icd9.fromCode)
      const cacheKeyFromVersion = getCacheKey(icd9.fromVersion, icd9.fromCode)
      const cacheKeyToVersion = getCacheKey(icd9.toVersion, icd9.toCode)

      CACHE[`CACHE_IMP_ICD9`][cacheKeyIMP] = icd9
      CACHE[`CACHE_CONTENTS_ICD9_${icd9.fromVersion}`][cacheKeyFromVersion] = icd9
      CACHE[`CACHE_CONTENTS_ICD9_${icd9.toVersion}`][cacheKeyToVersion] = icd9
    })

    for (const key in CACHE) {
      await this.cacheManager.set(key, CACHE[key], 0)
    }
  }

  private async cacheICD10() {
    const CACHE = {
      [`CACHE_IMP_ICD10`]: {},
      [`CACHE_CONTENTS_ICD10_GL_3.0`]: {},
      [`CACHE_CONTENTS_ICD10_YB_2.0`]: {}
    }
    const impICD10 = await this.impICD10Repository.find()

    impICD10.forEach((icd10) => {
      const cacheKeyIMP = getCacheKey(icd10.fromVersion, icd10.toVersion, icd10.fromCode)
      const cacheKeyFromVersion = getCacheKey(icd10.fromVersion, icd10.fromCode)
      const cacheKeyToVersion = getCacheKey(icd10.toVersion, icd10.toCode)

      CACHE[`CACHE_IMP_ICD10`][cacheKeyIMP] = icd10
      CACHE[`CACHE_CONTENTS_ICD10_${icd10.fromVersion}`][cacheKeyFromVersion] = icd10
      CACHE[`CACHE_CONTENTS_ICD10_${icd10.toVersion}`][cacheKeyToVersion] = icd10
    })

    for (const key in CACHE) {
      await this.cacheManager.set(key, CACHE[key], 0)
    }
  }
}
