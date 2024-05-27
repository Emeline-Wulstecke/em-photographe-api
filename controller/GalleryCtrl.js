"use strict";

const db          = require("../model");
const formidable  = require("formidable");
const fs          = require("fs");

require("dotenv").config();

const { checkRange, getPosterName } = require("../app/middlewares");

const { GALLERIES_NOT_FOUND, IMG_URL, THUMB_URL } = process.env;

const GALLERIES_IMG   = `${IMG_URL}galleries/`;
const GALLERIES_THUMB = `${THUMB_URL}galleries/`;

const form = formidable();

const Gallery = db.gallery;
const Image   = db.image;

//! ******************** UTILS ********************

/**
 * ? CHECK GALLERY DATA
 * * Checks the gallery data for valid name & author.
 * 
 * @param {string} name - The name of the gallery.
 * @param {string} author - The author of the gallery.
 * @param {object} res - The response object.
 * @return {object} A message indicating that the gallery data is invalid.
 */
exports.checkGalleryData = (name, author, res) => {
  const { CHECK_NAME, STRING_MAX, STRING_MIN } = process.env;

  const IS_NAME_CHECKED   = checkRange(name, STRING_MIN, STRING_MAX);
  const IS_AUTHOR_CHECKED = checkRange(author, STRING_MIN, STRING_MAX);

  if (!IS_NAME_CHECKED || !IS_AUTHOR_CHECKED) {
    return res.status(403).json({ message: CHECK_NAME });
  }
}

/**
 * ? CHECK GALLERY UNIQUE
 * * Checks if the given name is unique in the gallery.
 * 
 * @param {string} name - The name to be checked.
 * @param {object} gallery - The gallery object.
 * @param {object} res - The response object.
 * @return {object} A message indicating that the name is not unique.
 * @throws {Error} If the name is not unique.
 */
exports.checkGalleryUnique = (name, gallery, res) => {
  const { DISPO_NAME } = process.env;

  if (gallery.name === name) return res.status(403).json({ message: DISPO_NAME });
}

//! ******************** PUBLIC ********************

/**
 * ? LIST GALLERIES
 * * Retrieves a list of all galleries.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The list of galleries in JSON format.
 * @throws {Error} If the galleries are not found in the database.
 */
exports.listGalleries = async (req, res) => {
  try {
    const galleries = await Gallery.findAll();
    res.status(200).json(galleries);

  } catch (error) {
    res.status(404).json({ message: GALLERIES_NOT_FOUND });
  }
}

/**
 * ? READ GALLERY
 * * Retrieves a gallery by its ID.
 * 
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @return {object} The retrieved gallery as a JSON response.
 * @throws {Error} If the gallery is not found in the database.
 */
exports.readGallery = async (req, res) => {
  const { GALLERY_NOT_FOUND } = process.env;
  const ID = parseInt(req.params.id, 10);

  try {
    const gallery = await Gallery.findByPk(ID);
    res.status(200).json(gallery);

  } catch (error) {
    res.status(404).json({ message: GALLERY_NOT_FOUND });
  }
}

//! ******************** PRIVATE ********************

/**
 * ? CREATE GALLERY
 * * Creates a new gallery based on the request data.
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 * @return {Object} A message indicating that the gallery was created.
 * @throws {Error} If the gallery was not created.
 */
exports.createGallery = async (req, res, next) => {
  const { GALLERY_CREATED, GALLERY_NOT_CREATED } = process.env;

  form.parse(req, async (err, fields) => {
    if (err) { next(err); return }

    const { author, name } = fields;
    const cover = getPosterName(name);

    try {
      this.checkGalleryData(name, author, res);

      const galleries = await Gallery.findAll();

      if (!galleries) {
        return res.status(404).json({ message: GALLERIES_NOT_FOUND });
      }

      for (const gallery of galleries) {
        this.checkGalleryUnique(name, gallery, res);
      }

      await Gallery.create({ ...fields, cover });
      res.status(201).json({ message: GALLERY_CREATED });

    } catch (error) {
      res.status(400).json({ message: GALLERY_NOT_CREATED });
    }
  })
}

/**
 * ? UPDATE GALLERY
 * * Update the gallery by its ID & based on the request data.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {Object} A message indicating that the gallery was updated.
 * @throws {Error} If the gallery is not updated.
 */
exports.updateGallery = async (req, res, next) => {
  const { GALLERY_NOT_UPDATED, GALLERY_UPDATED } = process.env;
  const ID = parseInt(req.params.id, 10);

  form.parse(req, async (err, fields) => {
    if (err) { next(err); return }

    const { author, name } = fields;

    try {
      this.checkGalleryData(name, author, res);

      const galleries = await Gallery.findAll();

      if (!galleries || galleries.length === 0) {
        return res.status(404).json({ message: GALLERIES_NOT_FOUND });
      }

      galleries
        .filter((gallery) => gallery.id !== ID)
        .forEach((gallery) => this.checkGalleryUnique(name, gallery, res));

      await Gallery.update({ ...fields }, { where: { id: ID } });
      res.status(200).json({ message: GALLERY_UPDATED });

    } catch (error) {
      res.status(400).json({ message: GALLERY_NOT_UPDATED });
    }
  })
}

/**
 * ? DELETE GALLERY
 * * Deletes a gallery by its ID.
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @return {Object} A message indicating that the gallery was deleted.
 * @throws {Error} If the gallery is not deleted.
 */
exports.deleteGallery = async (req, res) => {
  const { GALLERY_DELETED, GALLERY_NOT_DELETED, IMAGES_NOT_FOUND } = process.env;
  const ID = parseInt(req.params.id, 10);

  try {
    const images = await Image.findAll({ where: { galleryId: ID }});

    if (!images) {
      return res.status(404).json({ message: IMAGES_NOT_FOUND });
    }

    for (const image of images) {
      await fs.promises.unlink(GALLERIES_THUMB + image.name);
      await fs.promises.unlink(GALLERIES_IMG + image.name);
    }

    await Image.destroy({ where: { galleryId: ID }});
    await Gallery.destroy({ where: { id: ID }});

    res.status(204).json({ message: GALLERY_DELETED });

  } catch (error) {
    res.status(400).json({ message: GALLERY_NOT_DELETED });
  }
}
