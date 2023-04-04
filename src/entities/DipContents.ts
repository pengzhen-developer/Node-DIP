import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_contents', { schema: 'fusion_core_dip' })
export class DipContents {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('varchar', { name: 'diag_code', nullable: true, comment: '诊断编码', length: 10 })
  diagCode: string | null

  @Column('text', { name: 'diag_name', nullable: true, comment: '诊断名称' })
  diagName: string | null

  @Column('text', { name: 'oprn_oprt_code', nullable: true, comment: '手术及操作编码' })
  oprnOprtCode: string | null

  @Column('text', { name: 'oprn_oprt_name', nullable: true, comment: '手术及操作名称' })
  oprnOprtName: string | null

  @Column('varchar', { name: 'oprn_oprt_type', nullable: true, comment: '手术及操作类型', length: 30 })
  oprnOprtType: string | null

  /** DIP 编码 */
  @Column('text', { name: 'dip_code', nullable: true, comment: 'DIP 编码' })
  dipCode: string | null

  /** DIP 名称 */
  @Column('text', { name: 'dip_name', nullable: true, comment: 'DIP 名称' })
  dipName: string | null

  /** DIP 类型 */
  @Column('varchar', { name: 'dip_type', nullable: true, comment: 'DIP 类型', length: 1 })
  dipType: string | null

  /** DIP 基准分值 */
  @Column('decimal', { name: 'dip_score', nullable: true, comment: 'DIP 分值', precision: 10, scale: 4 })
  dipScore: number | null

  /** DIP 基层病种调整系数 */
  @Column('decimal', { name: 'dip_factor_basic_group', nullable: true, comment: 'DIP 基层病种病种调整系数', precision: 10, scale: 4 })
  dipFactorBasicGroup: number | null

  /** DIP 平均费用 */
  @Column('decimal', { name: 'dip_avg_amount', nullable: true, comment: 'DIP 平均费用', precision: 10, scale: 4 })
  dipAvgAmount: number | null

  /** DIP 平均住院日 */
  @Column('decimal', { name: 'dip_avg_in_days', nullable: true, comment: 'DIP 平均住院日', precision: 10, scale: 4 })
  dipAvgInDays: number | null
}
