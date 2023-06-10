const express = require("express");
const {
  getComments,
  deleteComment,
} = require("../controllers/comment");
const { getAccessToRoute } = require("../middlewares/authorization/auth");
const {
  checkCommentExist, checkProductExist,
} = require("../middlewares/database/databaseErrorHelpers");

const router = express.Router();


router.get("/:productId", checkProductExist, getComments);
router.delete(
  "/:commentId",
  getAccessToRoute,
  checkCommentExist,
  deleteComment
);
module.exports = router;
