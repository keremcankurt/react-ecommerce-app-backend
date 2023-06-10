const express = require("express");
const {
  register,
  login,
  logout,
  confirmAccount,
  forgotPassword,
  changePassword,
} = require("../controllers/auth");
const { getAccessToRoute } = require("../middlewares/authorization/auth");
const {
  checkIsUserBlocked,
  checkEmailExists,
  checkIsUserConfirmed,
  checkUserExists,
} = require("../middlewares/database/databaseErrorHelpers");

const router = express.Router();

router.post("/register", register);
router.post(
  "/login",
  [checkEmailExists, checkIsUserConfirmed, checkIsUserBlocked],
  login
);

router.get("/logout", getAccessToRoute, logout);
router.put("/confirmaccount",checkUserExists, confirmAccount);
router.post("/forgotpassword", checkEmailExists, forgotPassword);
router.put("/changepassword", changePassword);
module.exports = router;
