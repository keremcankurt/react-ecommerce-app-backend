const express = require("express");
const {
  getAllSellers,
  getSingleSeller,
  removeSeller,
  reportSeller,
  addProduct,
  deleteProduct,
  updateProduct,
  getProducts,
  addCampaign
} = require("../controllers/seller");
const { getAccessToRoute } = require("../middlewares/authorization/auth");
const {
  checkUserExists,
  checkSellerExists,
  checkProductExist,
  checkHasProduct,
} = require("../middlewares/database/databaseErrorHelpers");
const userQueryMiddleware = require("../middlewares/query/userQueryMiddleware");
const User = require("../models/User");
const profileImageUpload = require("../middlewares/libraries/profileImageUpload");

const router = express.Router();


router.delete("/removeseller",getAccessToRoute,checkSellerExists,removeSeller);
router.get("/getallsellers",userQueryMiddleware(User), getAllSellers);
router.get("/getsingleseller/:id", checkUserExists,checkSellerExists, getSingleSeller);

router.post("/report/:id",[getAccessToRoute,checkUserExists,checkSellerExists],reportSeller);



router.post("/add", [getAccessToRoute, checkSellerExists, profileImageUpload.single("product_image")], addProduct);
router.delete(
  "/delete/:productId",
  [getAccessToRoute, checkProductExist, checkHasProduct],
  deleteProduct
);
router.put(
  "/update/:productId",
  [getAccessToRoute, checkProductExist, checkHasProduct, profileImageUpload.single("product_image")],
  updateProduct
);
router.get("/getproducts",getAccessToRoute,checkSellerExists,getProducts);
router.post("/addcampaign", [getAccessToRoute, checkSellerExists, profileImageUpload.single("campaign_image")], addCampaign);


module.exports = router;
