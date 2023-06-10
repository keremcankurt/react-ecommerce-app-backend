const asyncErrorWrapper = require("express-async-handler");
const CustomError = require("../helpers/error/CustomError");
const {
  commentSortHelper,
  paginationHelper,
} = require("../middlewares/query/queryMiddlewareHelpers");
const Comment = require("../models/Comment");
const Product = require("../models/Product");



const getComments = asyncErrorWrapper(async (req, res, next) => {
  try {
    let query = Comment.find({
      ["product.id"]: req.params.productId
    });
    query = commentSortHelper(query, req);
    const total = await Comment.countDocuments({
      ["product.id"]: req.params.productId
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
const deleteComment = asyncErrorWrapper(async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (req.user.role == "admin" || req.user.id == comment.user.id) {
      await Product.findByIdAndUpdate(comment.product.id, {
        $pull: {
          comments: comment._id,
        },
      });

      await comment.remove();
    } else {
      return next(
        new CustomError("You don't have permission to delete this comment", 401)
      );
    }
    res.status(200).json({
      success: true,
      message: "The comment has deleted successfully",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = {
  getComments,
  deleteComment,
};
