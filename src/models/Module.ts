import { DataTypes, Model, type Sequelize } from "sequelize"

export class Module extends Model {
  declare id: string
  declare name: string
  declare created_by: string
  declare creation_time: Date
  declare last_update_on: Date
}

export const initModuleModel = (sequelize: Sequelize) => {
  Module.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      modelName: "Module",
      tableName: "modules",
      timestamps: false,
    },
  )
  return Module
}
