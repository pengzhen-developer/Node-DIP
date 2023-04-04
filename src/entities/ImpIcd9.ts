import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('imp_icd9', { schema: 'fusion_core_dip' })
export class ImpIcd9 {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'from_version', nullable: true, comment: '转换前版本', length: 255 })
  fromVersion: string | null

  @Column('varchar', { name: 'from_code', nullable: true, comment: '转换前编码', length: 30 })
  fromCode: string | null

  @Column('varchar', { name: 'from_name', nullable: true, comment: '转换前名称', length: 255 })
  fromName: string | null

  @Column('varchar', { name: 'to_version', nullable: true, comment: '转换后版本', length: 255 })
  toVersion: string | null

  @Column('varchar', { name: 'to_code', nullable: true, comment: '转换后编码', length: 30 })
  toCode: string | null

  @Column('varchar', { name: 'to_name', nullable: true, comment: '转换后名称', length: 255 })
  toName: string | null

  @Column('varchar', { name: 'oprn_oprt_type', nullable: true, comment: '手术及操作类型', length: 10 })
  oprnOprtType: string | null

  @Column('varchar', { name: 'oprn_oprt_required', nullable: true, comment: '手术及操作录入选项：\n1. 必选\n2. 非必选\n3. 中医必选', length: 20 })
  oprnOprtRequired: string | null

  @Column('varchar', { name: 'oprn_sinc_type', nullable: true, comment: '手术及操作切口分类', length: 10 })
  oprnSincType: string | null

  @Column('varchar', { name: 'oprn_oprt_level', nullable: true, comment: '手术及操作分级', length: 1 })
  oprnOprtLevel: string | null

  @Column('varchar', { name: 'oprn_oprt_minimal_invasive', nullable: true, comment: '手术及操作是否微创', length: 10 })
  oprnOprtMinimalInvasive: string | null

  @Column('varchar', { name: 'oprn_oprt_gray_list', nullable: true, comment: '手术及操作是否灰码', length: 10 })
  oprnOprtGrayList: string | null
}
