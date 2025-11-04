import { DataTypes, Model, type Sequelize } from "sequelize"

export class Role extends Model {
  declare id: string
  declare entity_id: string | null
  declare name: string
  declare attributes: object | null
  declare created_by: string | null
  declare creation_time: Date
  declare last_update_on: Date
}

export const initRoleModel = (sequelize: Sequelize) => {
  Role.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Null for global roles (Admin), scoped to entity otherwise",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      attributes: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Contains roles array with moduleId, name, read, write permissions",
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
      modelName: "Role",
      tableName: "roles",
      timestamps: false,
    },
  )
  return Role
}
