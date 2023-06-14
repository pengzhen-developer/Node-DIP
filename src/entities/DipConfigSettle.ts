import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_settle', { schema: 'fusion_core_dip' })
export class DipConfigSettle {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('varchar', { name: 'month', nullable: true, comment: '医保统筹区按月标识', length: 6 })
  month: number | null

  @Column('varchar', { name: 'insuplc_admdvs', nullable: true, comment: '参保地行政区划（省内异地：患者参保地不等于医保统筹区）', length: 6 })
  insuplcAdmdvs: string | null

  @Column('varchar', { name: 'hospital_code', nullable: true, comment: '医疗机构编码', length: 30 })
  hospitalCode: string | null

  @Column('varchar', { name: 'hospital_name', nullable: true, comment: '医疗机构名称', length: 30 })
  hospitalName: string | null

  @Column('varchar', { name: 'hospital_level', nullable: true, comment: '医疗机构结算等级', length: 30 })
  hospitalLevel: number | null

  /** 均费调整系数-职工 */
  @Column('decimal', { name: 'factor_employee_avg_amount', nullable: true, comment: '均费调整系数-职工', precision: 10, scale: 4 })
  factorEmployeeAvgAmount: number | null

  /** 均费调整系数-居民 */
  @Column('decimal', { name: 'factor_resident_avg_amount', nullable: true, comment: '均费调整系数-居民', precision: 10, scale: 4 })
  factorResidentAvgAmount: number | null

  /** 均费调整系数-职工（基层病种） */
  @Column('decimal', { name: 'factor_basic_employee_avg_amount', nullable: true, comment: '均费调整系数-职工（基层病种）', precision: 10, scale: 4 })
  factorBasicEmployeeAvgAmount: number | null

  /** 均费调整系数-居民（基层病种） */
  @Column('decimal', { name: 'factor_basic_resident_avg_amount', nullable: true, comment: '均费调整系数-居民（基层病种）', precision: 10, scale: 4 })
  factorBasicResidentAvgAmount: number | null

  /** 结算调整系数-医疗机构 */
  @Column('decimal', { name: 'factor_hospital', nullable: true, comment: '调整系数-医疗机构', precision: 10, scale: 4 })
  factorHospital: number | null

  /** 结算调整系数-职工（职工分值单价） */
  @Column('decimal', { name: 'factor_employee_price', nullable: true, comment: '结算调整系数-职工（职工分值单价）', precision: 10, scale: 4 })
  factorEmployeePrice: number | null

  /** 结算调整系数-居民（居民分值单价） */
  @Column('decimal', { name: 'factor_resident_price', nullable: true, comment: '结算调整系数-居民（居民分值单价）', precision: 10, scale: 4 })
  factorResidentPrice: number | null
}
