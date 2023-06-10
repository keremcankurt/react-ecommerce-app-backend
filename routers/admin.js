const express = require("express");
const {
  blockUser,
  unblockUser,
  deleteUser,
  confirmSeller,
  rejectSeller,
  removeSeller,
} = require("../controllers/admin");
const {
  getAccessToRoute,
  getAdminAccess,
} = require("../middlewares/authorization/auth");
const {
  checkUserExists,
  checkSellerExists
} = require("../middlewares/database/databaseErrorHelpers");

const router = express.Router();

router.use([getAccessToRoute, getAdminAccess]);
router.put("/blockuser/:id", checkUserExists, blockUser);
router.put("/unblockuser/:id", checkUserExists, unblockUser);
router.put("/confirmseller", checkUserExists, confirmSeller);
router.put("/rejectseller", checkUserExists, rejectSeller);
router.put("/removeseller/:id", checkUserExists, checkSellerExists, removeSeller);
router.delete("/deleteuser/:id", checkUserExists, deleteUser);

module.exports = router;
