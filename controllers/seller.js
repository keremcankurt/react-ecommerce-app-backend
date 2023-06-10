const asyncErrorWrapper = require("express-async-handler");
const CustomError = require("../helpers/error/CustomError");
const User = require("../models/User");
const sendEmail = require("../helpers/libraries/sendEmail");
const Product = require("../models/Product");
const Comment = require("../models/Comment");
const Campaign = require("../models/Campaign");



const removeSeller = asyncErrorWrapper(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
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
    user.seller.isSeller = false;
    user.seller.isSend = false;
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
    await Campaign.deleteMany({ "user.id": user.id });
    await user.save();

    res.status(200).json({
      data: user,
      message: "You are no longer a seller",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

const getAllSellers = asyncErrorWrapper(async (req, res, next) => {
  res.status(200).json(res.queryResults);
});

const getSingleSeller = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const seller = await User.findById(id).select("-email -favCount -favProducts -followings -orders -place");
    
    const productIds = seller.seller.products;
    const products = await Product.find({ _id: { $in: productIds } }).sort({createdAt: -1})
    
    res.status(200).json({
        seller,
        products
    });
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
});


const reportSeller = asyncErrorWrapper(async (req, res, next) => {
  if (req.user.id == req.params.id) {
    return next(new CustomError("You can't report yourself", 400));
  }
  try {
    const seller = await User.findById(req.params.id);
    const info = req.body;

    const sellerUrl = `Kullanıcı profili gelecek`; //link değişecek
    const emailTemplate = `
          <h3>${info.subject}</h3>
          <p>${info.desc}</p>
          <p>Seller Profile<a href= '${sellerUrl}' target = '_blank'> link</a></p>
      `;

    try {
      await sendEmail({
        from: process.env.SMTP_ADMIN,
        to: process.env.SMTP_ADMIN,
        subject: "Seller Report",
        html: emailTemplate,
      });
      return res.status(200).json({
        message: "Your report has been sent",
      });
    } catch (err) {
      return next(new CustomError("Email Could Not Be Sent", 500));
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

const imageUpload = asyncErrorWrapper(async(req,res,next) => {
  const product= await Product.findByIdAndUpdate(req.params.productId,{
      "img": req.savedImage,
  },{
      new: true,
      runValidators: true
  });
  res.status(200)
  .json({
      message: "Image Upload Successful",
  });
});


const updateProduct = asyncErrorWrapper(async (req, res, next) => {
  try {
    const productInfo = JSON.parse(req.body.productData);
    if(req.savedImage) {
      productInfo.img = req.savedImage;
    }
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      productInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      data: product,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
});


const deleteProduct = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    const userId = product.seller.id;
    const user = await User.findById(userId);

    const productIndex = user.seller.products.indexOf(productId);
    user.seller.products.splice(productIndex, 1);
    user.seller.productCount = user.seller.products.length;
    await user.save();

    await Promise.all(
      product.favs.map(async (userId) => {
        const user = await User.findById(userId);
        const productIndex = user.favProducts.indexOf(productId);
        user.favProducts.splice(productIndex, 1);
        user.favCount = user.favCount.length;
        await user.save();
      })
    );

    await Promise.all(
      product.comments.map(async(commentId) => {
        await Comment.findByIdAndDelete(commentId);
      })
    )
    const currentDate = new Date();
    await Campaign.updateMany(
      { endDate: { $gt: currentDate }, products: { $in: [productId] } },
      { $pull: { products: productId } }
    );
    await Campaign.deleteMany({ endDate: { $gt: currentDate }, products: { $size: 0 } });
    await product.remove();

    res.status(200).json({
      message: "Product has deleted successfully",
    });
  } catch (error) {
    
    res.status(500).json(error);
  }
});
const addProduct = asyncErrorWrapper(async (req, res, next) => {
  try {
    const information = JSON.parse(req.body.productData);
    const user = await User.findById(req.user.id);
    const newProduct = await Product.create({
      ...information,
      "img": req.savedImage,
      ["seller.id"]: req.user.id,
      ["seller.company"]: user.seller.company,
      ["seller.profilePicture"]: user.profilePicture,
    });

    user.seller.products.push(newProduct._id);
    user.seller.productCount = user.seller.products.length;
    await user.save();
    res.status(200).json({
      message: 'the product was successfully added'
,      data: newProduct,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({'seller.id': req.user.id}).sort({ createdAt: -1 });
    res.status(200).json({
      data: products
    });
  } catch (err) {
    res.status(500).json(err);
  }
}


const addCampaign = asyncErrorWrapper(async (req, res, next) => {
  try {
    const campaign = JSON.parse(req.body.campaign);
    const user = await User.findById(req.user.id);
    const newCampaign =  new Campaign({
      "img": req.savedImage,
      ["user.id"]: req.user.id,
      ["user.company"]: user.seller.company,
      ["user.profilePicture"]: user.profilePicture,
      ...campaign
    });
    await Product.updateMany(
      { _id: { $in: campaign.products } },
      {
        $set: {
          "campaign.id": newCampaign._id,
          "campaign.endDate": newCampaign.endDate,
          "campaign.discountPercentage": campaign.discountPercentage
        }
      }
    ).then(async() => {
      await newCampaign.save()
    }).catch(error => {
      res.status(500).json(error);
    });
    const products = await Product.find(
        { _id: { $in: campaign.products } },
    )
    res.status(200).json({
      message: 'Campaign added successfully',
      data: products
    });
    
  } catch (err) {
    res.status(500).json(err);
  }
});
module.exports = {
  removeSeller,
  getAllSellers,
  getSingleSeller,
  reportSeller,
  imageUpload,
  updateProduct,
  deleteProduct,
  addProduct,
  getProducts,
  addCampaign
};
