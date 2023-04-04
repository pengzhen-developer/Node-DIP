import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('dip_config_exclude_icd9', { schema: 'fusion_core_dip' })
export class DipConfigExcludeIcd9 {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('varchar', { name: 'region', nullable: true, length: 255 })
  region: string | null

  @Column('varchar', { name: 'version', nullable: true, length: 255 })
  version: string | null

  @Column('varchar', { name: 'oprn_oprt_code', nullable: true, length: 30 })
  oprnOprtCode: string | null
}
