"use strict";

const bcrypt      = require("bcrypt");
const formidable  = require("formidable");
const fs          = require("fs");
const db          = require("../model");

require("dotenv").config();

const { checkEmail, checkRange, checkPassword, getMailer, getMessage, getName } = require("../app/middlewares");
const { IMG_EXT, IMG_URL, USER_NOT_FOUND } = process.env;

const USERS_IMG   = `${IMG_URL}users/`;

const form = formidable({ uploadDir: USERS_IMG, keepExtensions: true });

const User = db.user;

//! ******************** UTILS ********************

/**
 * ? CHECK USER DATA
 * * Validates user data & returns a JSON response with an error message if it fails.
 *
 * @param {string} name - The user's name.
 * @param {string} email - The user's email.
 * @param {object} res - The response object.
 * @return {object} - JSON response with an error message if any validation fails.
 */
exports.checkUserData = (name, email, res) => {
  const { CHECK_EMAIL, CHECK_NAME, STRING_MAX, STRING_MIN } = process.env;

  const IS_NAME_CHECKED   = checkRange(name, STRING_MIN, STRING_MAX);
  const IS_EMAIL_CHECKED  = checkEmail(email);

  if (!IS_NAME_CHECKED || !IS_EMAIL_CHECKED) {
    return res.status(403).json({ message: CHECK_NAME || CHECK_EMAIL });
  }
}

/**
 * ? CHECK USER PASSWORD
 * * Checks if the user password is valid.
 *
 * @param {string} password - The user password to be checked.
 * @param {object} res - The response object.
 * @return {object} - The response object with an error message if the password is invalid.
 */
exports.checkUserPassword = (password, res) => {
  const { CHECK_PASSWORD } = process.env;

  if (!checkPassword(password)) return res.status(403).json({ message: CHECK_PASSWORD });
}

/**
 * ? CHECK USER UNIQUE
 * * Checks if the given user's name & email are unique.
 *
 * @param {string} name - The name to check against the user's name.
 * @param {string} email - The email to check against the user's email.
 * @param {object} user - The user object to compare against.
 * @param {object} res - The response object to send the result to.
 * @return {object} The JSON response containing the error message if the name or email is not unique.
 */
exports.checkUserUnique = (name, email, user, res) => {
  const { DISPO_EMAIL, DISPO_NAME } = process.env;

  if (user.name === name || user.email === email) {
    return res.status(403).json({ message: DISPO_NAME || DISPO_EMAIL })
  }
}

/**
 * ? SET IMAGE
 * * Sets the image for a user.
 *
 * @param {string} input - The name of the input image.
 * @param {string} output - The name of the output image.
 */
exports.setImage = async (input, output) => {
  const INPUT   = `users/${input}`;
  const OUTPUT  = `users/${output}`;
}

//! ******************** PUBLIC ********************

/**
 * ? CREATE USER
 * * Creates a new user based on the request data.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {Object} A message indicating that the user was created.
 * @throws {Error} If the user is not created.
 */
exports.createUser = async (req, res, next) => {
  const { USER_CREATED, USER_NOT_CREATED } = process.env;

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, email, password } = fields;
    const { image } = files;

    try {
      this.checkUserData(name, email, res);
      this.checkUserPassword(password, res);

      const users = await User.findAll();
      if (!users) return res.status(404).json({ message: USER_NOT_FOUND });

      for (const user of users) {
        this.checkUserUnique(name, email, user, res);
      }

      const IMG = `${getName(name)}-${Date.now()}.${IMG_EXT}`;

      if (image && image.newFilename) {
        await this.setImage(image.newFilename, IMG);
        await fs.promises.unlink(USERS_IMG + image.newFilename);
      }

      const hash = await bcrypt.hash(password, 10);

      await User.create({ ...fields, image: IMG, password: hash });
      res.status(201).json({ message: USER_CREATED });

    } catch (error) {
      res.status(400).json({ message: USER_NOT_CREATED });
    }
  });
}

/**
 * ? SEND USER MESSAGE
 * * Sends a message.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 */
exports.sendMessage = (req, res, next) => {
  const { USER_MESSAGE } = process.env;
  const mailer = getMailer();

  form.parse(req, (err, fields) => {
    if (err) { next(err); return }

    const mail  = getMessage(fields);
    fields.html = `<p>${fields.html}</p>`;

    (async function () {
      try {
        await mailer.sendMail(mail, function () { 
          res.status(202).json({ message: USER_MESSAGE })
        });
      } catch (e) { console.error(e) }
    })();
  })
}

//! ******************** PRIVATE ********************

/**
 * ? LIST ALL USERS WITHOUT PASSWORD
 * * Retrieves the list of users.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The list of users in JSON format.
 * @throws {Error} If the users are not found in the database.
 */
exports.listUsers = async (req, res) => {
  const { USERS_NOT_FOUND } = process.env;
  
  try {
    const users = await User.findAll();

    const usersList = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    }));

    res.status(200).json(usersList);

  } catch (error) {
    res.status(404).json({ message: USERS_NOT_FOUND });
  }
}

/**
 * ? READ A USER
 * * Retrieves a user by its ID.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @return {object} The user data in JSON format.
 * @throws {Error} If the user is not found in the database.
 */
exports.readUser = (req, res) => {
  const ID = parseInt(req.params.id, 10);

  User.findByPk(ID)
    .then((user) => res.status(200).json(user))
    .catch(() => res.status(404).json({ message: USER_NOT_FOUND }));
}

/**
 * ? UPDATE USER
 * * Updates a user by its ID & based on the request data.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {undefined} This function does not return anything.
 * @throws {Error} If the user is not updated in the database.
 */
exports.updateUser = async (req, res, next) => {
  const { USER_NOT_UPDATED, USER_UPDATED } = process.env;
  const ID = parseInt(req.params.id, 10);

  form.parse(req, async (err, fields, files) => {
    if (err) { next(err); return }

    const { name, email, password } = fields;
    const { image } = files;

    try {
      this.checkUserData(name, email, res);

      const users = await User.findAll();

      if (!users || users.length === 0) {
        return res.status(404).json({ message: USER_NOT_FOUND });
      }

      users
        .filter(user => user.id !== ID)
        .forEach(user => this.checkUserUnique(name, email, user, res));

      let img = users.find(user => user.id === ID)?.image;

      if (image && image.newFilename) {

        img = `${getName(name)}-${Date.now()}.${IMG_EXT}`

        await this.setImage(image.newFilename, img);
        await fs.promises.unlink(USERS_IMG + image.newFilename);
      }

      let user;

      if (password) {
        this.checkUserPassword(password, res);
        const hash = await bcrypt.hash(password, 10);

        user = { ...fields, image: img, password: hash };

      } else { 
        user = { ...fields, image: img };
      }

      await User.update(user, { where: { id: ID }});
      res.status(200).json({ message: USER_UPDATED });

    } catch (error) {
      res.status(400).json({ message: USER_NOT_UPDATED });
    }
  })
}

/**
 * ? DELETE USER
 * * Deletes a user by its ID.
 *
 * @param {Object} req - The request object containing the user id in the params.
 * @param {Object} res - The response object to send the result.
 * @return {Object} The response object with a status & JSON message.
 * @throws {Error} If the user is not deleted from the database.
 */
exports.deleteUser = async (req, res) => {
  const { USER_DELETED, USER_NOT_DELETED } = process.env;
  const ID = parseInt(req.params.id, 10);

  try {
    const user = await User.findByPk(ID);

    if (!user) {
      return res.status(404).json({ message: USER_NOT_FOUND });
    }

    await User.destroy({ where: { id: ID }});
    res.status(204).json({ message: USER_DELETED });

  } catch (error) {
    res.status(404).json({ message: USER_NOT_FOUND });
  }
}
