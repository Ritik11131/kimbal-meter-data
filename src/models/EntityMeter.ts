import { DataTypes, Model, type Sequelize } from "sequelize"

export class EntityMeter extends Model {
  declare entity_id: string
  declare meter_id: string
  declare creation_time: Date
  declare last_update_on: Date
}

export const initEntityMeterModel = (sequelize: Sequelize) => {
  EntityMeter.init(
    {
      entity_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      meter_id: {
        type: DataTypes.UUID,
        primaryKey: true,
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
      modelName: "EntityMeter",
      tableName: "entity_meter",
      timestamps: false,
    },
  )
  return EntityMeter
}
