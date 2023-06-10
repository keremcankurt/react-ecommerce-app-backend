const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  text: {
    type: String,
    maxlength: [300, "Please provide a company with maximum 300 characters"],
  },
  user: {
    id: {
      type: mongoose.Schema.ObjectId,
      ref: "User"
    },
    fullName: {
      type: String,
    },
    profilePicture: {
      type: String,
    }
  },
  product : {
    id: {
      type: mongoose.Schema.ObjectId,
      ref: "Product"
    },
  },
  star: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Comment", CommentSchema);
