import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_contents_supplement', { schema: 'fusion_core_dip' })
export class DipContentsSupplement {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 6 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 6 })
  version: string | null

  @Column('text', { name: 'dip_code', nullable: true, comment: 'DIP 编码' })
  dipCode: string | null

  @Column('text', { name: 'dip_name', nullable: true, comment: 'DIP 名称' })
  dipName: string | null

  @Column('varchar', { name: 'dip_supplement_type', nullable: true, comment: 'DIP 辅助目录类型', length: 30 })
  dipSupplementType: string | null

  @Column('varchar', { name: 'dip_supplement_name', nullable: true, comment: 'DIP 辅助目录名称', length: 30 })
  dipSupplementName: string | null

  /** DIP 辅助目录基准分值 */
  @Column('decimal', { name: 'dip_supplement_score', nullable: true, comment: 'DIP 辅助目录基准分值', precision: 10, scale: 4 })
  dipSupplementScore: number | null

  /** DIP 辅助目录平均费用 */
  @Column('decimal', { name: 'dip_supplement_avg_amount', nullable: true, comment: 'DIP 辅助目录平均费用', precision: 10, scale: 4 })
  dipSupplementAvgAmount: number | null

  /** DIP 辅助目录调整系数 */
  @Column('decimal', { name: 'dip_supplement_factor', nullable: true, comment: 'DIP 辅助目录调整系数', precision: 10, scale: 4 })
  dipSupplementFactor: number | null

  /** DIP 辅助目录平均住院日 */
  @Column('decimal', { name: 'dip_supplement_avg_in_days', nullable: true, comment: 'DIP 辅助目录平均住院日', precision: 10, scale: 4 })
  dipSupplementAvgInDays: number | null

  /** DIP 辅助目录命中表达式 */
  @Column('varchar', { name: 'dip_supplement_expression', nullable: true, comment: 'DIP 辅助目录命中表达式', length: 255 })
  dipSupplementExpression: string | null
}
