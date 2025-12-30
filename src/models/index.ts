import type { Sequelize } from "sequelize"
import { initEntityModel, Entity } from "./Entity"
import { initUserModel, User } from "./User"
import { initRoleModel, Role } from "./Role"
import { initMeterModel, Meter } from "./Meter"
import { initProfileModel, Profile } from "./Profile"
import { initModuleModel, Module } from "./Module"
import { initEntityMeterModel, EntityMeter } from "./EntityMeter"

export const initializeModels = (sequelize: Sequelize) => {
  initEntityModel(sequelize)
  initUserModel(sequelize)
  initRoleModel(sequelize)
  initMeterModel(sequelize)
  initProfileModel(sequelize)
  initModuleModel(sequelize)
  initEntityMeterModel(sequelize)

  // Entity associations
  Entity.belongsTo(Entity, { foreignKey: "entity_id", as: "parentEntity" })
  Entity.hasMany(Entity, { foreignKey: "entity_id", as: "childEntities" })

  Entity.belongsTo(Profile, { foreignKey: "profile_id", as: "profile" })
  Profile.hasMany(Entity, { foreignKey: "profile_id", as: "entities" })

  Entity.belongsTo(User, { foreignKey: "created_by", as: "creator" })

  Entity.hasMany(User, { foreignKey: "entity_id", as: "users" })
  User.belongsTo(Entity, { foreignKey: "entity_id", as: "entity" })

  Entity.hasMany(Role, { foreignKey: "entity_id", as: "roles" })
  Role.belongsTo(Entity, { foreignKey: "entity_id", as: "entity" })

  Entity.hasMany(Meter, { foreignKey: "entity_id", as: "meters" })
  Meter.belongsTo(Entity, { foreignKey: "entity_id", as: "entity" })

  // User associations
  User.belongsTo(Role, { foreignKey: "role_id", as: "role" })
  Role.hasMany(User, { foreignKey: "role_id", as: "users" })

  User.belongsTo(User, { foreignKey: "created_by", as: "creator" })
  User.hasMany(User, { foreignKey: "created_by", as: "createdUsers" })

  // Meter associations
  Meter.belongsTo(User, { foreignKey: "created_by", as: "creator" })

  // Profile associations
  Profile.belongsTo(User, { foreignKey: "created_by", as: "creator" })
  Profile.belongsTo(Entity, { foreignKey: "entity_id", as: "entity" })

  // Module associations
  Module.belongsTo(User, { foreignKey: "created_by", as: "creator" })

  // Role associations
  Role.belongsTo(User, { foreignKey: "created_by", as: "creator" })

  // EntityMeter junction table associations
  EntityMeter.belongsTo(Entity, { foreignKey: "entity_id", as: "entity" })
  EntityMeter.belongsTo(Meter, { foreignKey: "meter_id", as: "meter" })

  Entity.hasMany(EntityMeter, { foreignKey: "entity_id", as: "entityMeters" })
  Meter.hasMany(EntityMeter, { foreignKey: "meter_id", as: "entityMeters" })

  return { Entity, User, Role, Meter, Profile, Module, EntityMeter }
}

export { Entity, User, Role, Meter, Profile, Module, EntityMeter }
