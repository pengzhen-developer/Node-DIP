import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

@Entity('dip_todo_result', { schema: 'fusion_core_dip' })
export class DipTodoResult {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @ApiProperty()
  @Column('int', { name: 'batch_no', nullable: true, comment: '批次号' })
  batchNo?: number | null

  @ApiProperty()
  @Column('int', { name: 'todo_id', nullable: true, comment: '原始 id' })
  todoId?: number | null

  @ApiProperty()
  @Column('varchar', { name: 'data_id', nullable: true, comment: '数据 id' })
  dataId?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'region', nullable: true, comment: '医保统筹区编码', length: 30 })
  region?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'version', nullable: true, comment: '医保统筹区版本', length: 30 })
  version?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'hos_code', nullable: true, comment: '医疗机构编码', length: 2 })
  hosCode?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'hos_name', nullable: true, comment: '医疗机构名称', length: 2 })
  hosName?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'birth_date', nullable: true, comment: '出生日期', length: 30 })
  birthDate?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'in_hospital_date', nullable: true, comment: '入院日期', length: 30 })
  inHospitalDate?: string | null

  @ApiProperty()
  @Column('decimal', { name: 'sum_amount', nullable: true, comment: '总费用', precision: 12, scale: 4 })
  sumAmount?: number | null

  @ApiProperty()
  @Column('varchar', { name: 'insurance_type', nullable: true, comment: '险种类型', length: 2 })
  insuranceType?: string | null

  @ApiProperty()
  @Column('varchar', { name: 'diag_code', nullable: true, comment: '疾病代码', length: 500 })
  diagCode?: string | string[] | null

  @ApiProperty()
  @Column('varchar', { name: 'oprn_oprt_code', nullable: true, comment: '手术及操作编码', length: 500 })
  oprnOprtCode?: string | string[] | null

  @Column('varchar', { name: 'yb_dip_type', nullable: true, comment: '医保分组类型', length: 2 })
  ybDipType?: string | null

  @Column('varchar', { name: 'yb_dip_code', nullable: true, comment: '医保分组编码', length: 255 })
  ybDipCode?: string | null

  @Column('varchar', { name: 'yb_dip_name', nullable: true, comment: '医保分组名称', length: 1000 })
  ybDipName?: string | null

  @Column('varchar', { name: 'yb_dip_deviation', nullable: true, comment: '医保偏差类型', length: 25 })
  ybDipDeviation?: string | null

  @Column('decimal', { name: 'yb_dip_amount', nullable: true, comment: '医保结算金额', precision: 12, scale: 4 })
  ybDipAmount?: number | null

  @Column('varchar', { name: 'yb_dip_supplement_type', nullable: true, comment: '医保辅助目录类型', length: 10 })
  ybDipSupplementType?: string | null

  @Column('varchar', { name: 'yb_dip_supplement_name', nullable: true, comment: '医保辅助目录名称', length: 10 })
  ybDipSupplementName?: string | null

  @Column('decimal', { name: 'yb_dip_supplement_factor', nullable: true, comment: '医保辅助目录系数', precision: 12, scale: 4 })
  ybDipSupplementFactor?: number | null

  @Column('varchar', { name: 'dip_type', nullable: true, comment: '福鑫分组类型', length: 10 })
  dipType?: string | null

  @Column('varchar', { name: 'dip_code', nullable: true, comment: '福鑫分组编码', length: 255 })
  dipCode?: string | null

  @Column('varchar', { name: 'dip_name', nullable: true, comment: '福鑫分组名称', length: 1000 })
  dipName?: string | null

  @Column('decimal', { name: 'dip_score', nullable: true, comment: '福鑫分组分值', precision: 10, scale: 4 })
  dipScore: number | null

  @Column('varchar', { name: 'dip_supplement_type', nullable: true, comment: '福鑫辅助目录类型', length: 10 })
  dipSupplementType?: string | null

  @Column('varchar', { name: 'dip_supplement_name', nullable: true, comment: '福鑫辅助目录名称', length: 10 })
  dipSupplementName?: string | null

  @Column('decimal', { name: 'dip_supplement_factor', nullable: true, comment: '福鑫辅助目录系数', precision: 12, scale: 4 })
  dipSupplementFactor?: number | null

  @Column('varchar', { name: 'dip_settle_deviation', nullable: true, comment: '福鑫偏差类型', length: 25 })
  dipSettleDeviation?: string | null

  @Column('decimal', { name: 'dip_settle_score', nullable: true, comment: '福鑫结算分值', precision: 12, scale: 4 })
  dipSettleScore?: number | null

  @Column('decimal', { name: 'dip_settle_score_pirce', nullable: true, comment: '福鑫结算分值单价', precision: 12, scale: 4 })
  dipSettleScorePrice?: number | null

  @Column('decimal', { name: 'dip_settle_factor', nullable: true, comment: '福鑫结算系数', precision: 12, scale: 4 })
  dipSettleFactor?: number | null

  @Column('decimal', { name: 'dip_settle_amount', nullable: true, comment: '福鑫结算金额', precision: 12, scale: 4 })
  dipSettleAmount?: number | string | null
}
