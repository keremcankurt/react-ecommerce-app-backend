const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const slugify = require("slugify");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    minlength: [3, "Please provide a name at least 3 characters"],
    maxlength: [15, "Please provide a name with maximum 15 characters"],
  },
  surname: {
    type: String,
    required: [true, "Please provide a surname"],
    minlength: [3, "Please provide a surname at least 3 characters"],
    maxlength: [15, "Please provide a surname with maximum 15 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide a email"],
    match: [
      /^\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [6, "Please provide a password at least 6 characters"],
    select: false,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "admin"],
  },
  favProducts: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
    },
  ],
  orders: [
    {
      productId: "",
      name: "",
      price: 0,
      img: "",
      unit: 0,
      seller: "",
      createdAt: '',
      star: 0,
      comment: "",
    },
  ],
  favCount: {
    type: Number,
    default: 0,
  },
  place: {
    type: String,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAccountConfirmed: {
    type: Boolean,
    default: false,
  },
  seller: {
    company: {
      type: String,
      maxlength: [30, "Please provide a company with maximum 30 characters"],
    },
    about: {
      type: String,
    },
    isSeller: {
      type: Boolean,
      default: false,
    },
    isSend: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    followerCount: {
      type: Number,
      default: 0,
    },
    products: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    productCount: {
      type: Number,
      default: 0,
    },
  },
  followings: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  tempToken: {
    type: String,
  },
  tempTokenExpire: {
    type: Date,
  },
});
UserSchema.methods.getTempTokenFromUser = function () {
  const randomHexString = crypto.randomBytes(15).toString("hex");
  const { TEMP_TOKEN_EXPIRE } = process.env;
  const tempToken = crypto
    .createHash("SHA256")
    .update(randomHexString)
    .digest("hex");
  this.tempToken = tempToken;
  this.tempTokenExpire = Date.now() + parseInt(TEMP_TOKEN_EXPIRE);
  return tempToken;
};
UserSchema.methods.generateJwtFromUser = function () {
  const { JWT_SECRET_KEY, JWT_EXPIRE } = process.env;
  const payload = {
    id: this._id,
    name: this.name,
    surname: this.surname,
    profilePicture: this.profilePicture,
    role: this.role,
  };

  const token = jwt.sign(payload, JWT_SECRET_KEY, {
    expiresIn: JWT_EXPIRE,
  });
  
  return token;
};

UserSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const saltRounds = 10;
  const myPlaintextPassword = this.password;
  bcrypt.genSalt(saltRounds, (err, salt) => {
    bcrypt.hash(myPlaintextPassword, salt, (err, hash) => {
      if (err) next(err);
      this.password = hash;
      next();
    });
  });
});
module.exports = mongoose.model("User", UserSchema);
