const asyncErrorWrapper = require("express-async-handler");
const { sendJwtToClient } = require("../helpers/authorization/tokenHelpers");
const CustomError = require("../helpers/error/CustomError");
const User = require("../models/User");
const {
  validateUserInput,
  comparePassword,
} = require("../helpers/input/inputHelpers");
const sendEmail = require("../helpers/libraries/sendEmail");
const Product = require("../models/Product");

const register = asyncErrorWrapper(async (req, res, next) => {
  const infos = req.body;
  const email = req.body.email;
  const inactiveUser = await User.findOne({
    email,
  });
  if (inactiveUser) {
    if (
      !inactiveUser.isAccountConfirmed &&
      inactiveUser.tempTokenExpire > Date.now()
    ) {
      return next(
        new CustomError(
          "Your account already created, please check your email to confirm your account",
          400
        )
      );
    } else if (
      !inactiveUser.isAccountConfirmed &&
      inactiveUser.tempTokenExpire <= Date.now()
    ) {
      inactiveUser.remove();
    }
  }

  const user = await User.create({
    ...infos,
  });
  const registerUserToken = user.getTempTokenFromUser();

  const confirmAccountUrl = `http://localhost:3000/confirmaccount/?registerUserToken=${registerUserToken}&id=${user._id}`; //değiştirilecek
  const emailTemplate = `
        <h3>Confirm Your Account</h3>
        <p>This <a href= '${confirmAccountUrl}' target = '_blank'>link</a>will expire in 1 hour</p>
    `;

  try {
    
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: email,
      subject: "Confirm Your Account",
      html: emailTemplate,
    });
    await user.save();
    return res.status(200).json({
      message: "Token Sent To Your Email",
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});

const confirmAccount = asyncErrorWrapper(async (req, res, next) => {
  const { registerUserToken, id } = req.query;
  const isUserActive = await User.findOne({
    _id: id,
    isAccountConfirmed: true,
  });
  console.log(registerUserToken);
  if (isUserActive) {
    return next(new CustomError("Hesabınız zaten aktif edildi.", 400));
  }
  if (!registerUserToken) {
    return next(new CustomError("Please provide a valid token.", 403));
  }

  const user = await User.findOne({
    tempToken: registerUserToken,
    tempTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    const user = await User.findOne({
      tempToken: registerUserToken,
    });
    console.log(user)
    if (user) {
      await user.remove();
    }
    return next(new CustomError("Bir hata meydana geldi.", 404));
  }
  user.isAccountConfirmed = true;
  user.tempToken = undefined;
  user.tempTokenExpire = undefined;
  await user.save();
  return res.status(200).json({
    message: "Hesabınız Başarıyla Onaylandı.",
  });
});

const login = asyncErrorWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  if (!validateUserInput(email, password)) {
    return next(new CustomError("Please check your inputs", 400));
  }
  const user = await User.findOne({ email }).select("+password");

  if (!comparePassword(password, user.password)) {
    return next(new CustomError("Please check your credentials", 400));
  }
  sendJwtToClient(user, res);
});

const logout = asyncErrorWrapper(async (req, res, next) => {
  const { NODE_ENV } = process.env;
  return res
    .status(200)
    .cookie({
      httpOnly: true,
      expires: new Date(Date.now()),
      secure: NODE_ENV === "development" ? false : true,
    })
    .json({
      message: "Logged out successfully",
    });
});

const forgotPassword = asyncErrorWrapper(async (req, res, next) => {
  const email = req.body.email;
  console.log(email)
  const user = await User.findOne({
    email,
  });
  const forgotPasswordToken = user.getTempTokenFromUser();

  const forgotPasswordUrl = `http://localhost:3000/forgotpassword/change/?forgotPasswordToken=${forgotPasswordToken}`; //değiştirilecek
  const emailTemplate = `
        <h3>Forgot Password</h3>
        <p>This <a href= '${forgotPasswordUrl}' target = '_blank'>link</a>will expire in 1 hour</p>
    `;

  try {
    await user.save();
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: email,
      subject: "Change Your Password",
      html: emailTemplate,
    });
    return res.status(200).json({
      message: "Email was sent successfully"
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});

const changePassword = asyncErrorWrapper(async (req, res, next) => {
  const { forgotPasswordToken } = req.query;
  const { password } = req.body;
  if (!forgotPasswordToken) {
    return next(new CustomError("Please provide a valid token.", 403));
  }
  const user = await User.findOne({
    tempToken: forgotPasswordToken,
    tempTokenExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new CustomError("Invalid Token or Session Expired", 404));
  }
  user.tempToken = undefined;
  user.tempTokenExpire = undefined;
  user.password = password;
  await user.save();

  res.status(200).json({
    message: 'Your password has been changed successfully'
  });
});


module.exports = {
  register,
  login,
  logout,
  confirmAccount,
  forgotPassword,
  changePassword,
};
