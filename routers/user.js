const express = require("express");
const {
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
  unfollow,
  follow,
  getCampaignsandStores
} = require("../controllers/user");
const { getAccessToRoute } = require("../middlewares/authorization/auth");
const profileImageUpload = require("../middlewares/libraries/profileImageUpload");
const { checkProductExist, checkUserExists, checkIsUserBlocked, checkSellerExists } = require("../middlewares/database/databaseErrorHelpers");

const router = express.Router();

router.get("/profile", getAccessToRoute, getUser);
router.post("/cart", getCart);
router.put("/resetpassword", getAccessToRoute, resetPassword);
router.delete("/delete", getAccessToRoute, deleteUser);
router.put("/edit",getAccessToRoute,editDetails);
router.put("/upload",[getAccessToRoute,profileImageUpload.single("profile_image")],imageUpload);
router.put("/addorder",getAccessToRoute,addOrders);
router.get("/getallfollowingsellers", [getAccessToRoute],getAllFollowingStores);
router.post("/beseller", getAccessToRoute, beSeller);
router.put("/:productId/fav",[getAccessToRoute,checkProductExist],favProduct);

router.post("/addcomment/:productId", getAccessToRoute, addComment);

router.put(
  "/:id/follow",
  [getAccessToRoute, checkUserExists, checkIsUserBlocked, checkSellerExists],
  follow
);
router.put("/:id/unfollow", [getAccessToRoute, checkUserExists, checkSellerExists ], unfollow);

router.get("/campaignsandstores", getCampaignsandStores);

module.exports = router;
