"use strict";

const Sequelize = require("sequelize");

require("dotenv").config();

const sequelize = new Sequelize(process.env.DB);
const db        = {};

sequelize
  .authenticate()
  .then(() => { console.log(process.env.SQL_OK) })
  .catch(err => { console.error(process.env.SQL_KO, err) });

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.article  = require("./ArticleModel.js")(sequelize, Sequelize);
db.image    = require("./ImageModel.js")(sequelize, Sequelize);
db.user     = require("./UserModel.js")(sequelize, Sequelize);

module.exports = db;
