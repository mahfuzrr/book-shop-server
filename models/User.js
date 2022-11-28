const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    userId:{
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        default: null,
    },
    name: {
        type: String,
        default: null,
    },
    isVarified:{
        type: Boolean,
        default: false,
    },
    photoURL:{
        type: String,
        default: null,
    },
    role:{
        type: String,
        default: 'buyer',
    },
    myProducts:[
        {
            type: mongoose.Types.ObjectId,
            ref: 'Product'
        }
    ],
    myOrders:[
        {
            type: mongoose.Types.ObjectId,
            ref: 'Product',
            unique: true,
        }
    ],
    report:[
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

const User = mongoose.model("User", userSchema);
module.exports = User;
