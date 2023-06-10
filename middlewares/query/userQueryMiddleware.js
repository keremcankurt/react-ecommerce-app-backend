const asyncErrorWrapper = require("express-async-handler");
const User = require("../../models/User");
const { paginationHelper, sellerSortHelper } = require("./queryMiddlewareHelpers");

const userQueryMiddleware = function (model, options) {
  return asyncErrorWrapper(async function (req, res, next) {
    try {
      let query = model
        .find({
          isBlocked: false,
          "seller.isSeller": true,
          name: { $regex: req.query.search || "", $options: "i" },
        })
        .select("-seller.isSend -isAccountConfirmed -isBlocked -role -tempToken -tempTokenExpire");
      if (!query) {
        res.querySelector = {
          success: true,
          message: "There are currently no sellers",
        };
        next();
      } else {
        query = sellerSortHelper(query,req);
        const total = await model.countDocuments({
          isBlocked: false,
          "seller.isSeller": true,
          name: { $regex: req.query.search || "", $options: "i" },
        });
        const paginationResult = await paginationHelper(total, query, req);
        query = paginationResult.query;
        const pagination = paginationResult.pagination;

        const queryResults = await query;
        res.queryResults = {
          success: true,
          count: queryResults.length,
          pagination: pagination,
          data: queryResults,
        };
        next();
      }
    } catch (error) {
      res.status(500).json(error);
    }
  });
};

module.exports = userQueryMiddleware;
