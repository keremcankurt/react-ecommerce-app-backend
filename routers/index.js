const express = require("express");
const auth = require("./auth");
const admin = require("./admin");
const user = require("./user");
const seller = require("./seller");
const product = require("./product");
const comment = require("./comment");


const router = express.Router();

router.use("/auth",auth);
router.use("/admin",admin);
router.use("/user",user);
router.use("/seller",seller);
router.use("/comment",comment);

router.use("/product",product);
module.exports = router;