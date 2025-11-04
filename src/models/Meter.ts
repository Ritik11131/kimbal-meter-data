import { DataTypes, Model, type Sequelize } from "sequelize"

export class Meter extends Model {
  declare id: string
  declare entity_id: string
  declare name: string
  declare meter_type: "PHYSICAL" | "VIRTUAL" | "GROUP"
  declare attributes: object | null
  declare tb_ref_id: string | null
  declare tb_token: string | null
  declare created_by: string
  declare creation_time: Date
  declare last_update_on: Date
}

export const initMeterModel = (sequelize: Sequelize) => {
  Meter.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      meter_type: {
        type: DataTypes.ENUM("PHYSICAL", "VIRTUAL", "GROUP"),
        allowNull: false,
      },
      attributes: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      tb_ref_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "ThingsBoard reference ID",
      },
      tb_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "ThingsBoard token",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      creation_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      last_update_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Meter",
      tableName: "meters",
      timestamps: false,
    },
  )
  return Meter
}
