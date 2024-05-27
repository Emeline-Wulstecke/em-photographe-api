"use strict";

const express     = require("express");
const router      = express.Router();

const GalleryCtrl   = require("../controller/GalleryCtrl");
const { checkAuth } = require("../app/middlewares");

/* Public */
router.get("/", GalleryCtrl.listGalleries);
router.get("/:id", GalleryCtrl.readGallery);

/* Private */
router.post("/", checkAuth, GalleryCtrl.createGallery);
router.put("/:id", checkAuth, GalleryCtrl.updateGallery);
router.delete("/:id", checkAuth, GalleryCtrl.deleteGallery);

module.exports = router;
