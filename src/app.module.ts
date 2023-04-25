import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DipContents } from './entities/DipContents'
import { DipContentsSupplement } from './entities/DipContentsSupplement'
import { DipConfigExcludeIcd9 } from './entities/DipConfigExcludeIcd9'
import { DipConfigSettle } from './entities/DipConfigSettle'
import { DipTodo } from './entities/DipTodo'
import { ImpIcd10 } from './entities/ImpIcd10'
import { ImpIcd9 } from './entities/ImpIcd9'
import { CachingModule } from './service/caching/caching.module'
import { DipModule } from './service/dip/dip.module'
import { DipTodoResult } from './entities/DipTodoResult'
import { DipConfigAvgAmount } from './entities/DipConfigAvgAmount'

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST ?? '10.10.10.151',
      port: Number(process.env.MYSQL_PORT) ?? 3306,
      username: process.env.MYSQL_USERNAME ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? 'P@ssw0rd',
      database: 'fusion_dip_core',
      synchronize: false,
      logging: false,
      autoLoadEntities: true
    }),
    TypeOrmModule.forFeature([DipContents, DipContentsSupplement, DipConfigExcludeIcd9, DipConfigSettle, DipConfigAvgAmount, DipTodo, DipTodoResult, ImpIcd9, ImpIcd10]),
    CacheModule.register({ isGlobal: true }),
    CachingModule,
    DipModule
  ]
})
export class AppModule {}
