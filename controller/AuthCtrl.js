"use strict";

const bcrypt      = require("bcrypt");
const formidable  = require("formidable");
const Recaptcha   = require("google-recaptcha");
const db          = require("../model");

require("dotenv").config();

const { checkEmail, getMailer, getMessage, getPassword, setAuth } = require("../app/middlewares");
const { USER_NOT_FOUND } = process.env;

const form      = formidable();
const recaptcha = new Recaptcha({ secret: process.env.RECAPTCHA_SECRET });

const User = db.user;

//! ******************** PUBLIC ********************

/**
 * ? READ AVATAR
 * * Retrieves the avatar information for a specific user.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @return {object} The avatar information for the user.
 * @throws {Error} If the user is not found in the database.
 */
exports.readAvatar = async (req, res) => {
  try {
    const ID    = parseInt(req.params.id, 10);
    const user  = await User.findByPk(ID);

    const { name, image, role } = user;
    const avatar = { name, image, role };

    res.status(200).json(avatar);

  } catch (error) {
    res.status(404).json({ message: USER_NOT_FOUND });
  }
}

/**
 * ? CHECK RECAPTCHA
 * * Checks the validity of a recaptcha response.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {Object} The validity of the recaptcha response.
 * @throws {Error} If the recaptcha response is invalid.
 */
exports.checkRecaptcha = (req, res, next) => {
  form.parse(req, (err, fields) => {
    if (err) { next(err); return }

    const response = fields.response;
    const remoteIp = req.connection.remoteAddress;

    recaptcha.verify({ response, remoteIp }, (err, data) => {
      if (!err) res.send(data);
      else res.status(500).send(err);
    });
  })
}

/**
 * ? LOGIN USER
 * * Login a user.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 * @throws {Error} If the user is not found in the database.
 */
exports.loginUser = async (req, res, next) => {
  const { AUTH_LOGIN }  = process.env;

  form.parse(req, async (err, fields) => {
    if (err) { next(err); return }

    const { email, pass } = fields;

    try {
      const user = await User.findOne({ where: { email: email }});

      if (!user) {
        return res.status(404).json({ message: USER_NOT_FOUND });
      }

      await setAuth(pass, user, res);

    } catch (error) {
      res.status(401).json({ message: AUTH_LOGIN });
    }
  })
}

/**
 * ? FORGOT PASSWORD
 * * Handles the forgot password functionality.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {Object} A message indicating that the password was sent.
 * @throws {Error} If the user is not found in the database.
 */
exports.forgotPass = async (req, res, next) => {
  const { AUTH_MESSAGE, CHECK_EMAIL, DISPO_EMAIL_REF, USER_NOT_PASS, USER_NOT_UPDATED } = process.env;

  form.parse(req, async (err, fields) => {
    if (err) { next(err); return }

    const { email, html } = fields;
    const pass  = getPassword();
    fields.html = `<p>${html}</p><b>${pass}</b>`;

    if (!checkEmail(email)) return res.status(403).json({ message: CHECK_EMAIL });

    const mailer  = getMailer();
    const mail    = getMessage(fields);

    try {
      const user = await User.findOne({ where: { email: email }});
      if (!user) return res.status(403).json({ message: DISPO_EMAIL_REF });
    
      const hash    = await bcrypt.hash(pass, 10);
      const newUser = { ...user, pass: hash };
    
      await User.update(newUser, { where: { id: user.id }});
    
      await mailer.sendMail(mail);
      res.status(202).json({ message: AUTH_MESSAGE });

    } catch (err) {
      if (err.name === 'SequelizeEmptyResultError') {
        res.status(404).json({ message: USER_NOT_FOUND });
      } else if (err.name === 'SequelizeValidationError') {
        res.status(400).json({ message: USER_NOT_UPDATED });
      } else {
        res.status(400).json({ message: USER_NOT_PASS });
      }
    }
  })
}
