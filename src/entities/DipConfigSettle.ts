import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_settle', { schema: 'fusion_core_dip' })
export class DipConfigSettle {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('varchar', { name: 'hospital_code', nullable: true, comment: '医疗机构编码', length: 30 })
  hospitalCode: string | null

  @Column('varchar', { name: 'hospital_name', nullable: true, comment: '医疗机构名称', length: 30 })
  hospitalName: string | null

  @Column('varchar', { name: 'hospital_level', nullable: true, comment: '医疗机构结算等级', length: 30 })
  hospitalLevel: number | null

  /** 医疗机构调整系数 */
  @Column('decimal', { name: 'factor_hospital', nullable: true, comment: '调整系数-医疗机构', precision: 10, scale: 4 })
  factorHospital: number | null

  /** 调整系数-均次费用 */
  @Column('decimal', { name: 'factor_avg_amount', nullable: true, comment: '调整系数-均次费用', precision: 10, scale: 4 })
  factorAvgAmount: number | null

  /** 调整系数-模拟每分值单价 */
  @Column('decimal', { name: 'factor_score_price', nullable: true, comment: '调整系数-模拟每分值单价', precision: 10, scale: 4 })
  factorScorePrice: number | null

  /** 调整系数-职工（职工分值单价） */
  @Column('decimal', { name: 'factor_employee_price', nullable: true, comment: '调整系数-职工（职工分值单价）', precision: 10, scale: 4 })
  factorEmployeePrice: number | null

  /** 调整系数-居民（居民分值单价） */
  @Column('decimal', { name: 'factor_resident_price', nullable: true, comment: '调整系数-居民（居民分值单价）', precision: 10, scale: 4 })
  factorResidentPrice: number | null
}
