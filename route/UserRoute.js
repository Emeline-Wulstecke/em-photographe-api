"use strict";

const express   = require("express");
const router    = express.Router();

const UserCtrl      = require("../controller/UserCtrl");
const { checkAuth } = require("../app/middlewares");

/* Public */
router.post("/", UserCtrl.createUser);
router.post("/message", UserCtrl.sendMessage);

/* Private */
router.get("/", checkAuth, UserCtrl.listUsers);
router.get("/:id", checkAuth, UserCtrl.readUser);
router.put("/:id", checkAuth, UserCtrl.updateUser);
router.delete("/:id", checkAuth, UserCtrl.deleteUser);

module.exports = router;
