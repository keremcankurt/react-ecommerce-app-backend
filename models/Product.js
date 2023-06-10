const mongoose = require("mongoose");
const slugify = require("slugify");
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
  },
  seller: {
    id: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    company: {
      type: String,
    },
    profilePicture: {
      type: String,
      default: ""
    },
  },
  img: {
    type: String,
    default: ""
  },
  category: {
    type: String,
    required: true,
    enum: ["Telefon", "Tablet", "Bilgisayar", "Kadın Giyim", "Erkek Giyim", "Çocuk Giyim"],
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  desc: {
    type: String,
    required: true,
  },
  favs: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  comments: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Comment",
      }
  ],
  star: {
    type: Number,
  },
  sellerBlockState: {
    type: Boolean,
    default: false,
  },
  campaign: {
    id: mongoose.Schema.ObjectId,
    endDate: Date,
    discountPercentage: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


module.exports = mongoose.model("Product", ProductSchema);
