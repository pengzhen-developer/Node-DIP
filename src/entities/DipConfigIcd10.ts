import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_icd10', { schema: 'fusion_core_dip' })
export class DipConfigIcd10 {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'from_version', nullable: true, length: 50 })
  fromVersion: string | null

  @Column('varchar', { name: 'from_code', nullable: true, length: 50 })
  fromCode: string | null

  @Column('varchar', { name: 'from_append_code', nullable: true, length: 50 })
  fromAppendCode: string | null

  @Column('varchar', { name: 'from_name', nullable: true, length: 200 })
  fromName: string | null

  @Column('varchar', { name: 'to_version', nullable: true, length: 200 })
  toVersion: string | null

  @Column('varchar', { name: 'to_code', nullable: true, length: 50 })
  toCode: string | null

  @Column('varchar', { name: 'to_append_code', nullable: true, length: 50 })
  toAppendCode: string | null

  @Column('varchar', { name: 'to_name', nullable: true, length: 200 })
  toName: string | null

  @Column('varchar', { name: 'oprn_oprt_gray_list', nullable: true, length: 10 })
  oprnOprtGrayList: string | null
}
