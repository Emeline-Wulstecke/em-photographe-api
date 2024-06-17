"use strict";

const express   = require("express");
const router    = express.Router();
const AuthCtrl  = require("../controller/AuthCtrl");

/* Public */
router.get("/:id", AuthCtrl.readAvatar);
router.post("/", AuthCtrl.loginUser);
router.post("/password", AuthCtrl.forgotPassword);
router.post("/recaptcha", AuthCtrl.checkRecaptcha);

module.exports = router;
