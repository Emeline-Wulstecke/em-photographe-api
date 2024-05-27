"use strict";

const { Sequelize, DataTypes } = require("sequelize");

/**
 * ? ARTICLE MODEL
 * * Define the Article Model
 *
 * @param {Sequelize} Sequelize - the Sequelize instance
 * @param {DataTypes} DataTypes - the DataTypes instance
 * @return {ArticleModel} the Article Model
 */
module.exports = (Sequelize, DataTypes) => {
  const ArticleModel = Sequelize.define("Articles", {
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
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    image: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    alt: {
      type: DataTypes.STRING(250),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(250)
    },
    likes: {
      type: DataTypes.TEXT,
      defaultValue: "[]"
    },
    cat: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
  }, {
    tableName: "Articles"
  });

  return ArticleModel;
}
