import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_cc_mcc', { schema: 'fusion_core_dip' })
export class DipConfigCcMcc {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('varchar', { name: 'diag_code', nullable: true, comment: '诊断编码', length: 100 })
  diagCode: string | null

  @Column('varchar', { name: 'exclude', nullable: true, comment: '排除表', length: 10 })
  exclude: string | null

  @Column('varchar', { name: 'include', nullable: true, comment: '包含表-指亚目', length: 100 })
  include: string | null

  @Column('varchar', { name: 'type', nullable: true, comment: '类型：cc/mcc', length: 10 })
  type: string | null

  @Column('varchar', { name: 'is_active', nullable: true, comment: '激活状态：enable / disabled', length: 10 })
  isActive: string | null
}
