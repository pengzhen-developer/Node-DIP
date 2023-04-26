import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_cc_mcc', { schema: 'fusion_core_dip' })
export class DipConfigCcMcc {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('varchar', { name: 'diag_code', nullable: true, comment: '诊断编码', length: 30 })
  diagCode: string | null

  @Column('varchar', { name: 'exclude', nullable: true, comment: '排除表', length: 30 })
  exclude: string | null

  @Column('varchar', { name: 'type', nullable: true, comment: '类型：cc/mcc', length: 30 })
  type: string | null
}
