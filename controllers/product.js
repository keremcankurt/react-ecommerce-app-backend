const asyncErrorWrapper = require("express-async-handler");
const {
  productSortHelper,
  paginationHelper,
} = require("../middlewares/query/queryMiddlewareHelpers");
const Product = require("../models/Product");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { default: mongoose } = require("mongoose");



const getAllProducts = asyncErrorWrapper(async (req, res, next) => {
  try {
    let query = Product.find({
      $or: [
        { name: { $regex: req.query.search || "", $options: "i" } },
        { category: { $regex: req.query.search || "", $options: "i" } },
        { desc: { $regex: req.query.search || "", $options: "i" } },
        { "seller.company": { $regex: req.query.search || "", $options: "i" } },
      ],
    });

    if (req.query.categories) {
      const categories = req.query.categories;
      query = query.where("category").in(categories);
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};

      if (req.query.minPrice) {
        priceFilter.$gte = parseInt(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        priceFilter.$lte = parseInt(req.query.maxPrice);
      }

      query = query.where("price", priceFilter);
    }

    query = productSortHelper(query, req);

    const totalQuery = {
      name: { $regex: req.query.search || "", $options: "i" },
    };

    if (req.query.categories) {
      const categories = req.query.categories;
      totalQuery.category = { $in: categories };
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};

      if (req.query.minPrice) {
        priceFilter.$gte = parseInt(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        priceFilter.$lte = parseInt(req.query.maxPrice);
      }

      totalQuery.price = priceFilter;
    }

    const total = await Product.countDocuments(totalQuery);
    const paginationResult = await paginationHelper(total, query, req);
    query = paginationResult.query;
    const pagination = paginationResult.pagination;

    const queryResults = await query;
    console.log(queryResults, pagination, total)
    res.status(200).json({
      success: true,
      data: {
        count: total,
        pagination: pagination,
        products: queryResults,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});



const getSellerProducts = asyncErrorWrapper(async (req, res, next) => {
  try {
    let query = Product.find({
      ["seller.id"]: req.params.id,
      name: { $regex: req.query.search ||"", $options: "i" },
    }).select("-seller.id");


    query = productSortHelper(query, req);
    const total = await Product.countDocuments({
      ["seller.id"]: req.params.id,
      name: { $regex: req.query.search||"", $options: "i" },
    });
    const paginationResult = await paginationHelper(total, query, req);

    query = paginationResult.query;
    const pagination = paginationResult.pagination;

    const queryResults = await query;

    res.status(200).json({
      success: true,
      count: queryResults.length,
      pagination: pagination,
      data: queryResults,
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    const commentIds = product.comments;

    const comments = await Comment.find({ _id: { $in: commentIds } });
    let recommendedProducts = [];
    let remainingLimit = 10;

    const campaignProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
    })
      .sort({"campaign.endDate": -1,star: -1,createdAt: -1})
      .limit(remainingLimit);

    recommendedProducts.push(...campaignProducts);
    remainingLimit -= campaignProducts.length;

    if (remainingLimit > 0 && ( product.category === "Telefon" ||product.category === "Tablet" || product.category === "Bilgisayar") ) {
      const excludedProductIds = [
        ...campaignProducts.map((p) => p._id),
        product._id,
      ];

      const sameCategoryProducts = await Product.find({
        category: { $in: ["Telefon", "Tablet", "Bilgisayar"] },
        _id: { $nin: excludedProductIds },
      })
        .sort({"campaign.endDate": -1, star: -1 ,createdAt: -1})
        .limit(remainingLimit);
      recommendedProducts.push(...sameCategoryProducts);
      remainingLimit -= sameCategoryProducts.length;
    }

    if (remainingLimit > 0 && ( product.category === "Erkek Giyim" ||product.category === "Kadın Giyim" || product.category === "Çocuk Giyim")) {
      const excludedProductIds = [
        ...campaignProducts.map((p) => p._id),
        product._id,
      ];

      const sameCategoryProducts = await Product.find({
        category: { $in: ["Erkek Giyim", "Kadın Giyim", "Çocuk Giyim"] },
        _id: { $nin: excludedProductIds },
      })
        .sort({"campaign.endDate": -1, star: -1 ,createdAt: -1})
        .limit(remainingLimit);

      recommendedProducts.push(...sameCategoryProducts);
      remainingLimit -= sameCategoryProducts.length;
    }
    res.status(200).json({
      data: product,
      comments,
      recommendedProducts,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};





const getFavProducts = asyncErrorWrapper(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let favProducts = [];
    await Promise.all(
      user.favProducts.map(async (productId) => {
        const favProduct = await Product.findOne({
          _id: productId,
          sellerBlockState: false,
        }).select("-seller.id -favs -sellerBlockState");
        !favProduct || favProducts.push(favProduct);
      })
    );
    res.status(200).json({
      success: true,
      data: favProducts,
    });
  } catch (error) {
    res.status(500).json(error);
  }
});
const getRecommendedCampaignProducts = asyncErrorWrapper(async (req, res, next) => {
  const currentDate = new Date();

  try {
    const products = await Product.find({
      "campaign.endDate": { $gt: currentDate },
    })
      .sort({ "star": -1, "campaign.discountPercentage": -1}) 
      .limit(10); 

    res.status(200).json({
      products,
    });
  } catch (error) {
    next(error);
  }
});
const getRecommendedTechnologyProducts = asyncErrorWrapper(async (req, res, next) => {
  const products = await Product.find({ category: { $in: ["Telefon", "Tablet", "Bilgisayar"] } })
    .sort({ star: -1 , createdAt:-1, "campaign?.endDate": 1})
    .limit(10);
  res.status(200).json(products);
});
const getRecommendedDressProducts = asyncErrorWrapper(async (req, res, next) => {
  const products = await Product.find({ category: { $in: ["Erkek Giyim", "Çocuk Giyim", "Kadın Giyim"] } })
    .sort({ star: -1 , createdAt:-1, "campaign?.endDate": 1})
    .limit(10);
  res.status(200).json(products);
});
const getCampaignProducts = asyncErrorWrapper(async (req, res, next) => {
  try {
    const campaignId = req.query.campaignId;
    const objectId = mongoose.Types.ObjectId(campaignId);
    const products = await Product.find({"campaign.id": objectId});
    res.status(200).json({
      products,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
});





module.exports = {
  getAllProducts,
  getSellerProducts,
  getProduct,
  getFavProducts,
  getRecommendedCampaignProducts,
  getRecommendedTechnologyProducts,
  getCampaignProducts,
  getRecommendedDressProducts
};
