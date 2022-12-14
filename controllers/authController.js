const User = require('../models/userModel');

const jwt = require('jsonwebtoken');

const AppError = require('../utils/appError');
const sendMail = require('../utils/email');

const crypto = require('crypto');

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signUp = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      nickname: req.body.nickname,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      phoneNumber: req.body.phoneNumber,
      bornDate: req.body.bornDate,
      photo: req.body.photo,
    });

    const token = createToken(newUser.id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        newUser,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      err,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    if (!req.body.email && !req.body.password) {
      return next(new AppError('Theres no email and password', 400));
    }

    const user = await User.findOne({ email: req.body.email }).select(
      '+password'
    );

    console.log(user);

    if (!user) next(new AppError('Theres no user for this email', 400));

    if (user.password !== req.body.password)
      next(new AppError('Wrong password or email', 400));

    const token = createToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) next(new AppError('Theres no user for this email'));

    const resetToken = user.createPasswordResetToken();

    user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/resetPasssword/${resetToken}`;

    const message = `If you forget your passsowrd, please click this url: ${resetUrl}`;

    const mailContent = {
      email: user.email,
      subject: 'Reset Password',
      text: message,
    };

    await sendMail(mailContent);

    res.status(200).json({
      message: 'success',
      body: 'Token sended',
    });
  } catch (err) {
    console.log(err);
    res.status(404).json({ err: err.message });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const resetToken = req.params.token;

    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({ passwordResetToken: hashedResetToken });

    if (!user) next(new AppError('Theres no user for this reset token', 404));

    user.password = req.body.password;
    user.passwordConfirm = req.body.password;

    user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated',
    });
  } catch (err) {
    res.status(404).json({
      message: 'fail',
      err: err,
    });
  }
};
