"use strict";

const formidable  = require("formidable");
const fs          = require("fs");
const db          = require("../model");

require("dotenv").config();

const { checkRange, checkUrl, getName, setImage, setThumbnail } = require("../app/middlewares");
const { ARTICLE_NOT_FOUND, ARTICLES_NOT_FOUND, IMG_EXT, IMG_URL, THUMB_URL } = process.env;

const ARTICLES_IMG    = `${IMG_URL}articles/`;
const ARTICLES_THUMB  = `${THUMB_URL}articles/`;

const form = formidable({ uploadDir: ARTICLES_IMG, keepExtensions: true });

const Article = db.article;

//! ******************** UTILS ********************

/**
 * ? CHECK ARTICLE DATA
 * * Checks the validity of article data.
 * 
 * @param {string} name - The name of the article.
 * @param {string} text - The text of the article.
 * @param {string} alt - The alternative text for the article.
 * @param {string} url - The url of the article.
 * @param {string} cat - The category of the article.
 * @param {Object} res - The response object.
 * @return {object} The response object with an error message if the article is not correct.
 */
exports.checkArticleData = (name, text, alt, url, cat, res) => {
  const { CHECK_CAT, CHECK_NAME, CHECK_TEXT, CHECK_URL, STRING_MAX, STRING_MIN, TEXT_MAX, TEXT_MIN } = process.env;

  const IS_NAME_CHECKED = checkRange(name, STRING_MIN, STRING_MAX);
  const IS_TEXT_CHECKED = checkRange(text, TEXT_MIN, TEXT_MAX);
  const IS_ALT_CHECKED  = checkRange(alt, STRING_MIN, STRING_MAX);

  const IS_URL_CHECKED  = url ? checkUrl("https://" + url) : true;
  const IS_CAT_CHECKED  = checkRange(cat, STRING_MIN, STRING_MAX);

  if (!IS_NAME_CHECKED || !IS_TEXT_CHECKED || !IS_ALT_CHECKED || !IS_URL_CHECKED || !IS_CAT_CHECKED) {
    return res.status(403).json({ 
      message: CHECK_NAME || CHECK_TEXT || CHECK_NAME || CHECK_URL || CHECK_CAT
    });
  }
}

/**
 * ? CHECK ARTICLE UNIQUE
 * * Checks if an article is unique based on its name & text.
 * 
 * @param {string} name - The name of the article.
 * @param {string} text - The text of the article.
 * @param {object} article - The existing article to compare with.
 * @param {object} res - The response object used to send the result.
 * @return {object} The response object with an error message if the article is not unique.
 */
exports.checkArticleUnique = (name, text, article, res) => {
  const { DISPO_NAME, DISPO_TEXT } = process.env;

  if (article.name === name || article.text === text) {
    return res.status(403).json({ message: DISPO_NAME || DISPO_TEXT })
  }
}

/**
 * ? SET IMAGES
 * * Sets the images for an article.
 * 
 * @param {string} input - The name of the input image.
 * @param {string} output - The name of the output image.
 */
exports.setImages = async (input, output) => {
  const INPUT   = `articles/${input}`;
  const OUTPUT  = `articles/${output}`;

  await setImage(INPUT, OUTPUT);
  await setThumbnail(INPUT, OUTPUT);
}

//! ******************** PUBLIC ********************

/**
 * ? LIST ARTICLES
 * * Retrieves a list of articles.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The JSON response containing the list of articles.
 * @throws {Error} If the articles are not found in the database.
 */
exports.listArticles = async (req, res) => {
  try {
    const articles = await Article.findAll();
    res.status(200).json(articles);

  } catch (error) {
    res.status(404).json({ message: ARTICLES_NOT_FOUND });
  }
}

/**
 * ? READ ARTICLE
 * * Retrieves an article by its ID.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @return {Object} The retrieved article as a JSON response.
 * @throws {Error} If the article is not found in the database.
 */
exports.readArticle = async (req, res) => {
  const ID = parseInt(req.params.id, 10);

  try {
    const article = await Article.findByPk(ID);
    res.status(200).json(article);

  } catch (error) {
    res.status(404).json({ message: ARTICLE_NOT_FOUND });
  }
}

//! ******************** PRIVATE ********************

/**
 * ? CREATE ARTICLE
 * * Creates an article based on the request data.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next function in the middleware chain
 * @return {Object} A message indicating that the article was created.
 * @throws {Error} If the article is not created in the database.
 */
exports.createArticle = async (req, res, next) => {
  const { ARTICLE_CREATED, ARTICLE_NOT_CREATED } = process.env;

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, text, alt, url, cat } = fields;
    const { image } = files;

    try {
      this.checkArticleData(name, text, alt, url, cat, res);

      const articles = await Article.findAll();
      if (!articles) return res.status(404).json({ message: ARTICLES_NOT_FOUND });

      for (const article of articles) {
        this.checkArticleUnique(name, text, article, res);
      }

      const IMG = `${getName(name)}-${Date.now()}.${IMG_EXT}`;

      if (image && image.newFilename) {
        await this.setImages(image.newFilename, IMG);
        await fs.promises.unlink(ARTICLES_IMG + image.newFilename);
      }

      await Article.create({ ...fields, image: IMG });
      res.status(201).json({ message: ARTICLE_CREATED });

    } catch (error) {
      res.status(400).json({ message: ARTICLE_NOT_CREATED });
    }
  })
}

/**
 * ? UPDATE ARTICLE
 * * Updates an article by its ID & based on the request data.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 * @return {Object} A message indicating that the article was updated.
 * @throws {Error} If the article is not updated in the database.
 */
exports.updateArticle = async (req, res, next) => {
  const { ARTICLE_NOT_UPDATED , ARTICLE_UPDATED} = process.env;
  const ID = parseInt(req.params.id, 10);

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, text, alt, url, cat } = fields;
    const { image } = files;

    try {
      this.checkArticleData(name, text, alt, url, cat, res);

      const articles = await Article.findAll();

      if (!articles || articles.length === 0) {
        return res.status(404).json({ message: ARTICLES_NOT_FOUND });
      }

      articles
        .filter(article => article.id !== ID)
        .forEach(article => this.checkArticleUnique(name, text, article, res));

      let img = articles.find(article => article.id === ID)?.image;

      if (image && image.newFilename) {
        await fs.promises.unlink(ARTICLES_IMG + img);
        await fs.promises.unlink(ARTICLES_THUMB + img);

        img = `${getName(name)}-${Date.now()}.${IMG_EXT}`;

        await this.setImages(image.newFilename, img);
        await fs.promises.unlink(ARTICLES_IMG + image.newFilename);
      }

      await Article.update({ ...fields, image: img }, { where: { id: ID }});
      res.status(200).json({ message: ARTICLE_UPDATED });

    } catch (error) {
      res.status(400).json({ message: ARTICLE_NOT_UPDATED });
    }
  })
}

/**
 * ? DELETE ARTICLE
 * * Deletes an article by its ID.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} A message indicating that the article was deleted.
 * @throws {Error} If the article is not deleted in the database.
 */
exports.deleteArticle = async (req, res) => {
  const { ARTICLE_DELETED, ARTICLE_NOT_DELETED } = process.env;
  const ID = parseInt(req.params.id, 10);

  try {
    const article = await Article.findByPk(ID);

    if (!article) {
      return res.status(404).json({ message: ARTICLE_NOT_FOUND });
    }

    await fs.promises.unlink(ARTICLES_IMG + article.image);
    await fs.promises.unlink(ARTICLES_THUMB + article.image);

    await Article.destroy({ where: { id: ID } });
    res.status(204).json({ message: ARTICLE_DELETED });

  } catch (error) {
    res.status(400).json({ message: ARTICLE_NOT_DELETED });
  }
};
