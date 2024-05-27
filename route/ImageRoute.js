"use strict";

const express     = require("express");
const router      = express.Router();

const ImageCtrl     = require("../controller/ImageCtrl");
const { checkAuth } = require("../app/middlewares");


/* Public */
router.get("/", ImageCtrl.listImages);
router.get("/:id", ImageCtrl.listGalleryImages);

/* Private */
router.post("/", checkAuth, ImageCtrl.createImage);
router.put("/:id", checkAuth, ImageCtrl.updateImage);
router.delete("/:id", checkAuth, ImageCtrl.deleteImage);

module.exports = router;
