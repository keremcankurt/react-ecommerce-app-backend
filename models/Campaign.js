const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  img: {
    type: String,
    default: "",
    required: [true, "Please add a valid image"]
  },
  user: {
    id: String,
    company: String,
    profilePicture: String,
  },
  discountPercentage: {
    type: Number,
    required: [true, "Please enter a percentage"]
  },
  products: [],
  endDate: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Campaign", CampaignSchema);
