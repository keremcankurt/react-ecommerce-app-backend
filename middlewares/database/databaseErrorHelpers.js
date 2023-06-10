const CustomError = require("../../helpers/error/CustomError");
const User = require("../../models/User");
const asyncErrorWrapper = require("express-async-handler");
const Product = require("../../models/Product");
const Comment = require("../../models/Comment");

const checkUserExists = asyncErrorWrapper(async (req, res, next) => {
  const id = req.params.id || req.query.id;
  const user = await User.findById({ _id: id });
  if (!user) {
    return next(new CustomError("There is no user with that id", 500));
  }
  next();
});
const checkSellerExists = asyncErrorWrapper(async (req, res, next) => {
  const id = req.params.id || req.user.id;
  const user = await User.findById(id);
  if (!user.seller.isSeller) {
    return next(new CustomError("This user is not seller", 400));
  }
  next();
});
const checkProductExist = asyncErrorWrapper(async (req, res, next) => {
  const id = req.params.productId;
  const product = await Product.findById(id);
  if (!product) {
    return next(new CustomError("There is no product with that id", 400));
  }
  next();
});
const checkCommentExist = asyncErrorWrapper(async (req, res, next) => {
  const id = req.params.commentId;
  const comment = await Comment.findById(id);
  if (!comment) {
    return next(new CustomError("There is no comment with that id", 400));
  }
  next();
});
const checkHasProduct = asyncErrorWrapper(async (req, res, next) => {
  const id = req.params.productId;
  const product = await Product.findById(id);
  if (req.user.role == "admin" || product.seller.id == req.user.id) {
    return next();
  }
  return next(
    new CustomError(
      "You dont have access to update or delete this product",
      401
    )
  );
});
const checkIsUserBlocked = asyncErrorWrapper(async (req, res, next) => {
  const email = req.body.email;
  const { id } = req.params;
  let user;
  if (email) {
    user = await User.findOne({
      email,
    });
  } else if (id) {
    user = await User.findById(id);
  }
  if (user.isBlocked) {
    return next(new CustomError("This user is blocked", 403));
  }
  next();
});
const checkIsUserConfirmed = asyncErrorWrapper(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({
    email,
  });
  if (!user.isAccountConfirmed) {
    return next(
      new CustomError("Your account is inactive, please check your email", 403)
    );
  }
  next();
});
const checkEmailExists = asyncErrorWrapper(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({
    email,
  });
  if (!user)
    return next(new CustomError("There is no user with that email", 400));
    
  next();
});

module.exports = {
  checkUserExists,
  checkIsUserBlocked,
  checkEmailExists,
  checkIsUserConfirmed,
  checkSellerExists,
  checkProductExist,
  checkHasProduct,
  checkCommentExist,
};
