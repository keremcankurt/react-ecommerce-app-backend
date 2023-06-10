const asyncErrorWrapper = require("express-async-handler");
const CustomError = require("../helpers/error/CustomError");
const sendEmail = require("../helpers/libraries/sendEmail");
const Comment = require("../models/Comment");
const Product = require("../models/Product");
const User = require("../models/User");

const blockUser = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user.isBlocked == true) {
      return next(new CustomError("This user already blocked", 400));
    }
    user.isBlocked = true;
    if (user.seller.isSeller) {
      await Promise.all(
        user.seller.products.map(async (productId) => {
          await Product.findByIdAndUpdate(
            productId,
            {
              sellerBlockState: true,
            },
            { new: true }
          );
        })
      );
    }
    await user.save();

    res.status(200).json({
      message: "User block operation is successful",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});
const unblockUser = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user.isBlocked == false) {
      return next(new CustomError("This user is not blocked", 400));
    }
    await Promise.all(
      user.seller.products.map(async (productId) => {
        await Product.findByIdAndUpdate(
          productId,
          {
            sellerBlockState: false,
          },
          { new: true }
        );
      })
    );
    user.isBlocked = false;
    await user.save();

    res.status(200).json({
      message: "User unblock operation is successful",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

const deleteUser = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user.seller.isSeller) {
      await Promise.all(
        user.seller.products.map(async (productId) => {
          const product = await Product.findOne({ _id: productId });
          await Promise.all(
            product.favs.map(async (userId) => {
              const user = await User.findOneAndUpdate(
                { _id: userId },
                {
                  $pull: {
                    favProducts: productId,
                  },
                },
                { new: true }
              );
              user.favCount = user.favProducts.length;
              await user.save();
            })
          );
          await Promise.all(
            product.comments.map(async (commentId) => {
              await Comment.findByIdAndDelete(commentId);
            })
          );
          await product.remove();
        })
      );

      await Promise.all(
        user.seller.followers.map(async (followerId) => {
          const follower = await User.findById(followerId);
          const index = follower.followings.indexOf(user.id);
          follower.followings.splice(index, 1);
          await follower.save();
        })
      );
      user.seller.company = "";
    }
    await Promise.all(
      user.followings.map(async (followingId) => {
        const following = await User.findById(followingId);
        const index = following.seller.followers.indexOf(user.id);
        following.seller.followers.splice(index, 1);
        following.seller.followerCount = following.seller.followers.length;
        await following.save();
      })
    );
    await user.remove();

    res.status(200).json({
      message: "User delete operation is successful",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});
const confirmSeller = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);
    if (user.seller.isSeller) {
      return next(new CustomError("User is already seller", 400));
    }
    if (!user.seller.isSend) {
      return next(new CustomError("User did not send seller request", 400));
    }
    user.seller.isSeller = true;
    user.seller.isSend = false;
    user.seller.company = req.query.company;

    const emailTemplate = `
        <h3>Seller Request</h3>
        <p>Your request was accepted</p>
    `;
    await user.save();
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: user.email,
      subject: "Seller Request",
      html: emailTemplate,
    });
    return res.status(200).json({
      message: "Seller Request Accepted",
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});
const rejectSeller = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.query;
  const user = await User.findById(id);
  if (user.seller.isSeller) {
    return next(new CustomError("User is already seller", 400));
  }
  if (!user.seller.isSend) {
    return next(new CustomError("User did not send seller request", 400));
  }
  const emailTemplate = `
        <h3>Seller Request</h3>
        <p>Your request was rejected because you did not meet the required conditions.</p>
    `;

  try {
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: user.email,
      subject: "Seller Request",
      html: emailTemplate,
    });
    user.seller.isSend = false;
    await user.save();
    return res.status(200).json({
      message: "Seller Request Rejected",
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});

const removeSeller = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);

  const emailTemplate = `
        <h3>Remove Seller</h3>
        <p>You are no longer a seller</p>
    `;

  try {
    await Promise.all(
      user.seller.products.map(async (productId) => {
        const product = await Product.findOne({ _id: productId });
        await Promise.all(
          product.favs.map(async (userId) => {
            const user = await User.findOneAndUpdate(
              { _id: userId },
              {
                $pull: {
                  favProducts: productId,
                },
              },
              { new: true }
            );
            user.favCount = user.favProducts.length;
            await user.save();
          })
        );
        await Promise.all(
          product.comments.map(async (commentId) => {
            await Comment.findByIdAndDelete(commentId);
          })
        );
        await product.remove();
      })
    );

    user.seller.products = [];
    user.seller.productCount = 0;
    user.seller.followerCount = 0;
    user.seller.company = "";

    await Promise.all(
      user.seller.followers.map(async (followerId) => {
        const follower = await User.findById(followerId);
        const index = follower.followings.indexOf(user.id);
        follower.followings.splice(index, 1);
        await follower.save();
      })
    );
    user.seller.followers = [];
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: user.email,
      subject: "Remove Seller",
      html: emailTemplate,
    });
    user.seller.isSend = false;
    user.seller.isSeller = false;
    await user.save();
    return res.status(200).json({
      message: "Remove Seller is Successful",
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});

module.exports = {
  blockUser,
  deleteUser,
  confirmSeller,
  rejectSeller,
  unblockUser,
  removeSeller,
};
