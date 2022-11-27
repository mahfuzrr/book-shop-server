const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    categoryName:{
        type: String,
        required: true,
    },
    products:[
        {
            type: mongoose.Types.ObjectId,
            ref: 'Product',
        }
    ],
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
