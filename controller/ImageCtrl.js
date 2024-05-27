"use strict";

const formidable  = require("formidable");
const fs          = require("fs");
const db          = require("../model");

require("dotenv").config();

const { checkRange, getName, setImage, setThumbnail } = require("../app/middlewares");
const { IMAGES_NOT_FOUND, IMG_URL, THUMB_URL } = process.env;

const GALLERIES_IMG   = `${IMG_URL}galleries/`;
const GALLERIES_THUMB = `${THUMB_URL}galleries/`;

const form = formidable({ uploadDir: GALLERIES_IMG, keepExtensions: true });

const Gallery = db.gallery;
const Image   = db.image;

//! ******************** UTILS ********************

/**
 * ? CHECK IMAGE DATA
 * * Checks the image data.
 * 
 * @param {string} description - The description of the image data.
 * @param {object} res - The response object.
 * @return {object} The JSON response.
 */
exports.checkImageData = (description, res) => {
  const { CHECK_NAME, STRING_MIN, TEXT_MAX } = process.env;

  if (!checkRange(description, STRING_MIN, TEXT_MAX)) {
    return res.status(403).json({ message: CHECK_NAME })
  }
}

/**
 * ? CHECK IMAGE UNIQUE
 * * Checks if the given image name is unique.
 *
 * @param {string} name - The name of the image.
 * @param {object} image - The image object to compare with.
 * @param {object} res - The response object.
 * @return {object} The JSON response object with the appropriate message & status code.
 */
exports.checkImageUnique = (name, image, res) => {
  const { DISPO_NAME } = process.env;

  if (image.name === name) {
    return res.status(403).json({ message: DISPO_NAME });
  }
}

/**
 * ? SET IMAGES
 * * Sets the image & thumbnail for a gallery.
 * 
 * @param {string} input - The name of the input image.
 * @param {string} output - The name of the output image.
 */
exports.setImages = async (input, output) => {
  const INPUT   = `galleries/${input}`;
  const OUTPUT  = `galleries/${output}`;

  await setImage(INPUT, OUTPUT);
  await setThumbnail(INPUT, OUTPUT);
}

//! ******************** PUBLIC ********************
/**
 * ? LIST IMAGES
 * * Retrieves a list of all images.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The list of images in JSON format.
 * @throws {Error} If the images are not found in the database.
 */
exports.listImages = async (req, res) => {
  try {
    const images = await Image.findAll();
    res.status(200).json(images);

  } catch (error) {
    res.status(404).json({ message: IMAGES_NOT_FOUND });
  }
}

/**
 * ? LIST GALLERY IMAGES
 * * Retrieves a list of gallery images based on the provided gallery ID.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Promise} A promise that resolves to a response containing the list of gallery images.
 * @throws {Error} If the images are not found in the database.
 */
exports.listGalleryImages = async (req, res) => {
  try {
    Image.belongsTo(Gallery, { foreignKey: "galleryId" });

    const images = await Image.findAll({
      where: { galleryId: req.params.id },
      attributes: ["id", "name", "description", "galleryId"],
      include: { model: Gallery, attributes: ["name"] }
    });

    res.status(200).json(images);

  } catch (error) {
    res.status(404).json({ message: IMAGES_NOT_FOUND });
  }
};

//! ******************** PRIVATE ********************

/**
 * ? CREATE IMAGE
 * * Creates an image based on the request data.
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 * @return {Object} A message indicating that the image was created.
 * @throws {Error} If the image is not created in the database.
 */
exports.createImage = async (req, res, next) => {
  const { GALLERY_NOT_FOUND, IMAGE_CREATED, IMAGE_NOT_CREATED, IMG_EXT } = process.env;

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, description, galleryId } = fields;
    const { image } = files;

    try {
      this.checkImageData(description, res);

      const gallery = await Gallery.findOne({ where: { id: galleryId }});
      const images  = await Image.findAll({ where: { galleryId: galleryId }});

      if (!gallery) {
        return res.status(404).json({ message: GALLERY_NOT_FOUND });

      } else if (!images) {
        return res.status(404).json({ message: IMAGES_NOT_FOUND });
      }

      for (const image of images) {
        this.checkImageUnique(name, image, res);
      }

      const IMG = `${getName(gallery.name)}-${Date.now()}.${IMG_EXT}`;

      if (image && image.newFilename) {
        await this.setImages(image.newFilename, IMG);
        await fs.promises.unlink(GALLERIES_IMG + image.newFilename);
      }

      await Image.create({ ...fields, name: IMG });
      res.status(201).json({ message: IMAGE_CREATED });

    } catch (error) {
      res.status(400).json({ message: IMAGE_NOT_CREATED });
    }
  })
};

/**
 * ? UPDATE IMAGE
 * * Updates an image by its ID & based on the request data.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {Object} A message indicating that the image was updated.
 * @throws {Error} If the image is not updated in the database.
 */
exports.updateImage = async (req, res, next) => {
  const { IMAGE_NOT_UPDATED, IMAGE_UPDATED } = process.env;
  const ID = parseInt(req.params.id, 10);

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, description, galleryId } = fields;
    const { image } = files;

    try {
      this.checkImageData(description, res);

      const gallery = await Gallery.findOne({ where: { id: galleryId }});
      const images  = await Image.findAll({ where: { galleryId: galleryId }});

      if (!gallery) {
        return res.status(404).json({ message: GALLERY_NOT_FOUND });

      } else if (!images || images.length === 0) {
        return res.status(404).json({ message: IMAGES_NOT_FOUND });
      }

      images
        .filter(image => image.id !== ID)
        .forEach(image => this.checkImageUnique(name, image, res));

      let img = images.find(image => image.id === ID)?.image;

      if (image && image.newFilename) {
        await fs.promises.unlink(GALLERIES_IMG + img);
        await fs.promises.unlink(GALLERIES_THUMB + img);

        img = `${getName(gallery.name)}-${Date.now()}.${IMG_EXT}`;

        await this.setImages(image.newFilename, name);
        await fs.promises.unlink(GALLERIES_IMG + image.newFilename);
      }

      await Image.update({ ...fields }, { where: { id: ID }});
      res.status(200).json({ message: IMAGE_UPDATED });

    } catch (error) {
      res.status(400).json({ message: IMAGE_NOT_UPDATED });
    }
  })
};

/**
 * ? DELETE IMAGE
 * * Deletes an image by its ID.
 * 
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @return {Object} A message indicating that the image was deleted.
 * @throws {Error} If the image is not deleted in the database.
 */
exports.deleteImage = async (req, res) => {
  const { IMAGE_DELETED, IMAGE_NOT_DELETED, IMAGE_NOT_FOUND } = process.env;
  const ID = parseInt(req.params.id, 10);

  try {
    const image = await Image.findByPk(ID);

    if (!image) {
      return res.status(404).json({ message: IMAGE_NOT_FOUND });
    }

    await fs.promises.unlink(GALLERIES_IMG + image.name);
    await fs.promises.unlink(GALLERIES_THUMB + image.name);

    await Image.destroy({ where: { id: ID } });
    res.status(204).json({ message: IMAGE_DELETED });

  } catch (error) {
    res.status(400).json({ message: IMAGE_NOT_DELETED });
  }
};
