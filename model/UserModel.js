"use strict";

const { Sequelize, DataTypes } = require("sequelize");

/**
 * ? USER MODEL
 * * Define the User Model
 *
 * @param {Sequelize} Sequelize - the Sequelize instance
 * @param {DataTypes} DataTypes - the DataTypes instance
 * @return {UserModel} the User Model
 */
module.exports = (Sequelize, DataTypes) => {
  const UserModel = Sequelize.define("Users", {
    id: {
      type: DataTypes.SMALLINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    image: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false
    },
  }, {
    tableName: "Users",
    timestamps: false
  });

  return UserModel;
}
