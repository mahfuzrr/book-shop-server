const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
    {
        userId:{
            type: String,
            required: true,
        },
        sellerName:{
            type: String,
            required: true,
        },
        buyerName:{
            type: String,
            default: null,
        },
        paymentDetails:{
            type: String,
            default: null,
        },
        isBooked:{
            type: Boolean,
            default: false,
        },
        customerLocation:{
            type: String,
            default: null
        },
        customerPhone:{
            type: String,
            default: null,
        },
        posted:{
            type: Date,
            required: true,
        },
        productName:{
            type: String,
            required: true,
        },
        originalPrice:{
            type: String,
            required: true,
        },
        resalePrice:{
            type: String,
            required: true,
        },
        condition:{
            type: String,
            default: 'Good',
        },
        phone:{
            type: String,
            required: true,
        },
        location:{
            type: String,
            required: true,
        },
        category:{
            type: String,
            required: true,
        },
        purchageYear:{
            type: String,
            required: true,
        },
        photoURL:{
            type: String,
            required: true
        },
        isAvailable:{
            type: Boolean,
            default: true
        },
        isAdvertised:{
            type: Boolean,
            default: false,
        },
    },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
