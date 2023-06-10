const express = require("express");
const {
  getAllProducts,
  getSellerProducts,
  getProduct,
  getFavProducts,
  getRecommendedCampaignProducts,
  getRecommendedTechnologyProducts,
  getCampaignProducts,
  getRecommendedDressProducts
} = require("../controllers/product");
const { getAccessToRoute } = require("../middlewares/authorization/auth");
const {
  checkSellerExists,
  checkUserExists,
  checkIsUserBlocked,
  checkProductExist,
} = require("../middlewares/database/databaseErrorHelpers");
const router = express.Router();

router.get("/getallproducts", getAllProducts);
router.get("/product/:productId", checkProductExist, getProduct);
router.get(
  "/getsellerproducts/:id",
  checkUserExists,
  checkIsUserBlocked,
  checkSellerExists,
  getSellerProducts
);
router.get("/getfavproducts",getAccessToRoute,getFavProducts);

router.get("/recommendedcampaignproducts",getRecommendedCampaignProducts);
router.get("/recommendedtechnologyproducts",getRecommendedTechnologyProducts);
router.get("/recommendeddressproducts",getRecommendedDressProducts);
router.get("/getcampaignproducts",getCampaignProducts);

module.exports = router;
