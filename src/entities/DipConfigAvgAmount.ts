import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_avg_amount', { schema: 'fusion_core_dip' })
export class DipConfigAvgAmount {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  /** DIP 编码 */
  @Column('text', { name: 'dip_code', nullable: true, comment: 'DIP 编码' })
  dipCode: string | null

  /** DIP 平均费用 */
  @Column('decimal', { name: 'dip_avg_amount', nullable: true, comment: 'DIP 平均费用', precision: 10, scale: 4 })
  dipAvgAmount: number | null

  /** 保险类型（职工 / 居民） */
  @Column('decimal', { name: 'insurance_type', nullable: true, comment: '保险类型（职工 / 居民）' })
  insuranceType: string | null

  /** DIP 机构结算等级 */
  @Column('decimal', { name: 'hospital_level', nullable: true, comment: '机构结算等级' })
  hospitalLevel: number | null
}
