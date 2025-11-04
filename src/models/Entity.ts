import { DataTypes, Model, type Sequelize } from "sequelize"

export class Entity extends Model {
  declare id: string
  declare entity_id: string | null
  declare name: string
  declare email_id: string
  declare mobile_no: string | null
  declare profile_id: string
  declare attributes: object | null
  declare created_by: string | null
  declare creation_time: Date
  declare last_update_on: Date
}

export const initEntityModel = (sequelize: Sequelize) => {
  Entity.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Parent entity reference for hierarchy",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mobile_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      profile_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      attributes: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
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
      modelName: "Entity",
      tableName: "entities",
      timestamps: false,
    },
  )
  return Entity
}
