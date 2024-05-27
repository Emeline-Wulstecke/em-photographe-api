"use strict";

const { Sequelize, DataTypes } = require("sequelize");

/**
 * ? IMAGE MODEL
 * * Define the Image Model
 *
 * @param {Sequelize} Sequelize - the Sequelize instance
 * @param {DataTypes} DataTypes - the DataTypes instance
 * @return {ImageModel} the Image Model
 */
module.exports = (Sequelize, DataTypes) => {
  const ImageModel = Sequelize.define("Images", {
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
    description: {
      type: DataTypes.STRING(250),
      allowNull: false
    },
    galleryId: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "Gallery",
        key: "id",
      }
    }
  }, {
    tableName: "Images",
    timestamps: false
  });

  return ImageModel;
}
