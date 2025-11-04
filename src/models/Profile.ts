import { DataTypes, Model, type Sequelize } from "sequelize"

export class Profile extends Model {
  declare id: string
  declare name: string
  declare entity_id: string | null
  declare attributes: object | null
  declare created_by: string | null
  declare creation_time: Date
  declare last_update_on: Date
}

export const initProfileModel = (sequelize: Sequelize) => {
  Profile.init(
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
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      modelName: "Profile",
      tableName: "profiles",
      timestamps: false,
    },
  )
  return Profile
}
