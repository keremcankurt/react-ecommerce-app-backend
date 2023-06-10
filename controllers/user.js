const asyncErrorWrapper = require("express-async-handler");
const { sendJwtToClient } = require("../helpers/authorization/tokenHelpers");
const CustomError = require("../helpers/error/CustomError");
const { comparePassword } = require("../helpers/input/inputHelpers");
const Comment = require("../models/Comment");
const Product = require("../models/Product");
const User = require("../models/User");
const sendEmail = require("../helpers/libraries/sendEmail");
const Campaign = require("../models/Campaign");

const deleteUser = asyncErrorWrapper(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.seller.isSeller) {
      user.seller.company = "";

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

const editDetails = asyncErrorWrapper(async (req, res, next) => {
  try {
    const informations = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, informations, {
      new: true,
      runValidators: true,
    }).select(
      "-__v -_id"
    );
    if (informations["seller.company"]) {

      const products = user.seller.products;
      if (products !== undefined && products?.length > 0) {
        await Product.updateMany(
          { _id: { $in: products } },
          { $set: { 'seller.company': informations['seller.company'] } }
        );
      }
  }
    res.status(200).json({
      data: user,
      message: "Kullanıcı bilgileri başarıyla güncellendi.",
    });
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
});

const resetPassword = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.user;
  const { password } = req.body;

  const user = await User.findById(id).select("+password");
  if (comparePassword(password, user.password)) {
    return next(
      new CustomError(
        "The new password can not be the same as the old password",
        400
      )
    );
  }
  user.password = password;
  await user.save();

  res.status(200).json({
    message: "Reset password operation is successful",
  });
});

const getUser = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id).select(
    "-isAccountConfirmed -isBlocked -__v -_id"
  );
  res.status(200).json({
    user
  });
});

const imageUpload = asyncErrorWrapper(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      profilePicture: req.savedImage,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select(
    "-seller.isSend -role -isAccountConfirmed -tempToken -tempTokenExpire"
  );
  if (user.seller.isSeller) {
    const products = user.seller.products;
    await Promise.all(
      products.map(async (productId) => {
        const product = await Product.findById(productId);
        product.seller.profilePicture = req.savedImage;
        await product.save();
      })
    );
  }
  res.status(200).json({
    data: req.savedImage,
  });
});

const addOrders = asyncErrorWrapper(async (req, res, next) => {
  const orders = req.body.orders;
  const productIds = orders.map(order => Object.keys(order)[0]);
  const products = await Product.find({ _id: { $in: productIds } });
  
  if (!products || products.length !== productIds.length) {
    return next(
      new CustomError(
        "Ürün veya ürünler bulunamadı",
        400
      )
    );
  }
  try {
    await Promise.all(products.map(async (product) => {
      const orderedQuantity = orders.find(order => order[product.id.toString()]);

      if (!orderedQuantity || product.stock < orderedQuantity[product.id.toString()]) {
        throw new CustomError(
          product.name + " isimli ürün tükenmiş.",
          400
        );
      }
    }));
    
    await Promise.all(products.map(async product => {
      const orderedQuantity = orders.find(order => order[product.id.toString()])[product.id.toString()];

      await User.findByIdAndUpdate(
        req.user.id,
        {
          $push: {
            orders: {
              productId: product.id,
              name: product.name,
              price: new Date(product.campaign?.endDate) > new Date() ? 
              (product.price - (product.price * product.campaign.discountPercentage / 100)):
              product.price
              ,
              unit: orderedQuantity,
              img: product.img,
              seller: product.seller,
              createdAt: Date.now(),
            }
          },
        },
        {
          new: true,
        }
      ).exec();

      await Product.updateOne(
        { _id: product.id },
        { $inc: { stock: -orderedQuantity } }
      );
    }));
    console.log("first")
    const updatedUser = await User.findById(req.user.id);
    res.status(200).json({
      message: "Satın alma işlemi başarılı. Siparişlerim sayfasından değerlendirebilirsiniz.",
      orders: updatedUser.orders
    });
  } catch (error) {
    return next(error);
  }
});


const getAllFollowingStores = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    const followingUsers = await User.find(
      { _id: { $in: user.followings } },
      { profilePicture: 1,'seller.company': 1,  'seller.productCount': 1, 'seller.followerCount': 1 }
    );

    res.status(200).json({
      data: followingUsers
    });
  } catch (error) {
    next(error);
  }
};
const getCart = async (req, res, next) => {
  try {
    const cartItems = req.body;
    const selectedProducts = [];

    for (const item of cartItems) {
      const productId = Object.keys(item)[0];
      const quantity = item[productId];
      const product = await Product.findById(productId);

      if (!product) {
        continue;
      }

      if (product.stock === 0) {
        continue;
      }

      const selectedProduct = {
        ...product.toObject(),
        quantity: product.stock < quantity ? product.stock : quantity
      };

      selectedProducts.push(selectedProduct);
    }
    res.json(selectedProducts);
  } catch (error) {
    next(error);
  }
};


const beSeller = asyncErrorWrapper(async (req, res, next) => {
  const informations = req.body;
  const { id } = req.user;
  const user = await User.findById(id);
  if (user.seller.isSeller) {
    return next(new CustomError("You are already seller", 400));
  }
  if (user.seller.isSend) {
    return next(new CustomError("You are already send seller request", 400));
  }
  const sellerUrl = `http://localhost:3000/confirmseller/?id=${id}&company=${informations.company}&name=${informations.name}`; //link değişecek
  const emailTemplate = `
        <h3>Seller Request</h3>
        <p>Seller Informations <br>${Object.keys(informations).map(function (
          key
        ) {
          const message = key + ": " + informations[key] + "<br>";
          return message;
        })}</p>
        <p>Seller Confirm<a href= '${sellerUrl}' target = '_blank'> link</a></p>
    `;

  try {
    await sendEmail({
      from: process.env.SMTP_ADMIN,
      to: process.env.SMTP_ADMIN,
      subject: "Seller Request",
      html: emailTemplate,
    });
    user.seller.isSend = true;
    await user.save();
    return res.status(200).json({
      message: "Seller Request Sent",
    });
  } catch (err) {
    return next(new CustomError("Email Could Not Be Sent", 500));
  }
});

const favProduct = asyncErrorWrapper(async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (product.favs.includes(req.user.id)) {
      await product.updateOne({
        $pull: {
          favs: req.user.id,
        },
      });
      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          $pull: {
            favProducts: req.params.productId,
          },
        },
        {
          new: true,
        }
      ).select(
        "-isAccountConfirmed -isBlocked -__v"
      );
      user.favCount = user.favProducts.length;
      await user.save();
      res.status(200).json({
        message: "The product has been removed from your favorites list",
        data: user
      });
    } else {
      await product.updateOne({
        $push: {
          favs: req.user.id,
        },
      });
      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          $push: {
            favProducts: req.params.productId,
          },
        },
        {
          new: true,
        }
      ).select(
        "-isAccountConfirmed -isBlocked -__v"
      );
      user.favCount = user.favProducts.length;
      await user.save();
      res.status(200).json({
        message: "The product has been added to your favorites list",
        data: user
      });
    }
  } catch (error) {
    res.status(500).json(error.message);
  }
});

const addComment = asyncErrorWrapper(async (req, res, next) => {
  try {
    const info = req.body;
    if (!info.text && !info.star) {
      return next(new CustomError("Fill in at least one field", 400));
    }
    const product = await Product.findById(req.params.productId);
    const user = await User.findById(req.user.id);
    const order = user.orders.find(order => order.id === info.orderId);
    console.log(order)
    if (!product) {
      
      if (order) {
        order.comment = 'Ürün kaldırılmış';
        user.markModified('orders');
        await user.save();
        console.log(user.orders)
        return res.status(400).json({
          data: order,
          message: "Ürün kaldırıldığı için değerlendiremiyorsunuz...",
        });
      }
    }
    order.comment = info.text;
    order.star = info.star;
    user.markModified('orders');
    await user.save();
    const fullName = req.user.name[0] + "**** " + req.user.surname[0] + "****";
    const newComment = await Comment.create({
      text: info.text,
      star: info.star,
      ["user.id"]: req.user.id,
      ["user.fullName"]: fullName,
      ["user.profilePicture"]: req.user.profilePicture,
      ["product.id"]: product._id,
    });
    await product.updateOne({
      $push: {
        comments: newComment._id,
      },
    });
    if (info.star) {
      if (product.comments.length === 0) {
        product.star = info.star;
      } else {
        const star = product.star || 0;
        const newStar = (star + info.star) / 2;
        product.star = Number(newStar.toFixed(1));
      }
      await product.save();
    }
    res.status(201).json({
      data: order,
      message: "Comment has added succesfully",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});



const getFavProducts = asyncErrorWrapper(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let favProducts = [];
    await Promise.all(
      user.favProducts.map(async (productId) => {
        const favProduct = await Product.findOne({
          _id: productId,
          sellerBlockState: false,
        })
        !favProduct || favProducts.push(favProduct);
      })
    );
    res.status(200).json({
      data: favProducts,
    });
  } catch (error) {
    res.status(500).json(error);
  }
});


const follow = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const seller = await User.findById(id);
    if (seller.seller.followers.includes(req.user.id)) {
      return next(
        new CustomError("You are already following this seller", 400)
      );
    } else if (id === req.user.id) {
      return next(new CustomError("You can not follow yourself", 400));
    }
    seller.seller.followers.push(req.user.id);
    seller.seller.followerCount = seller.seller.followers.length;
    const currentUser = await User.findById(req.user.id);
    currentUser.followings.push(req.params.id);
    await currentUser.save();
    await seller.save();

    res.status(200).json({
      message: "Seller has followed",
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

const unfollow = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const seller = await User.findById(id);
    if (!seller.seller.followers.includes(req.user.id)) {
      return next(new CustomError("You are not following this seller", 400));
    }
    const index = seller.seller.followers.indexOf(req.user.id);
    seller.seller.followers.splice(index, 1);
    seller.seller.followerCount = seller.seller.followers.length;
    const currentUser = await User.findById(req.user.id);
    const indexSeller = currentUser.followings.indexOf(req.params.id);
    currentUser.followings.splice(indexSeller, 1);
    await currentUser.save();
    await seller.save();

    res.status(200).json({
      message: "Seller has unfollowed",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});
const getCampaignsandStores = asyncErrorWrapper(async (req, res, next) => {
  const currentDate = new Date();
  const campaigns = await Campaign.find({ endDate: { $gt: currentDate } }).lean();

  const users = await User.find({ 'seller.isSeller': true }).lean();
  shuffleArray(campaigns);
  shuffleArray(users);

  const stores = users.map(user => ({
    id: user._id,
    profilePicture: user.profilePicture,
    company: user.seller.company
  }));

  res.json({
    campaigns,
    stores,
  });
});
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


module.exports = {
  deleteUser,
  editDetails,
  resetPassword,
  getUser,
  imageUpload,
  addOrders,
  getAllFollowingStores,
  beSeller,
  favProduct,
  getCart,
  addComment,
  getFavProducts,
  follow,
  unfollow,
  getCampaignsandStores
};
