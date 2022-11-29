//external imports
const express = require("express");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const cors = require("cors");
const { notFoundHandler, errorHandler } = require("./errorHandler");
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const stripe = require("stripe")('sk_test_51M96csL27rePm2jj8eQxMxF9anpa8togScdwQUI3uH5NCG8ja0iM22fU8EeCJMZyRIzqQrlpAvKZTqnORRCX4Rnf00RbjlPzSN');

const port = process.env.PORT || 5000;

const app = express();
dotenv.config();

//database connection
mongoose
    .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Database connection Successfull"))
    .catch((error) => console.log(error.message, process.env.MONGO_URL));


//app.use(cors());
app.use(cors());

//request parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// all routes

// verify user
const authCheck = (req, res, next) => {
    const token = req.headers.authorization;

    if(token){
        const decode = jwt.verify(token, process.env.JWT_SECRET, (err, result) => {
            if(err){
                res.json({
                    success: false,
                    message: "Unauthorized Access!",
                })
            }
            else{
                if(!result?.uId){
                    res.json({
                        success: false,
                        message: "Unauthorized Access!",
                    })
                }
                else next();
            }
        });
    }
    else{
        res.json({
            success: false,
            message: "Unauthorized Access !",
        })
    };
}

// jwt
app.post('/jwt-token', (req, res) => {
    const {uId} = req.body;
    const token = jwt.sign({
        uId,
    }, process.env.JWT_SECRET, {
        expiresIn: '3 days'
    });

    res.json({
        success: true,
        token,
    });
});

app.get('/', (req, res) => {
    res.json({
        message: "Hello There, Welcome to book shop api, Powered by Mahfuzur Rahman",
    });
});

app.post('/register', (req, res) => {
    const {email, name, photoURL, role, userId} = req.body;

    const updatedObject = {
        userId,
        email,
        name,
        photoURL,
        role
    };

    const newUser = new User(updatedObject);

    newUser.save().then((user) => {
        res.json({
            success: true,
            message: user,
        });
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    });

});

app.get('/get-user-role/:id', authCheck, (req, res) =>{
    const {id} = req.params;
    //console.log(id);
    User.findOne({userId: id}).then((result) => {
        res.json({
            success: true,
            message: result.role,
        });
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    });
});


//add products
app.post('/add-products', authCheck, (req, res) => {
    const {uId, productName, originalPrice, resalePrice, condition, phone, location, category, year, posted, photoURL} = req.body;

    const objects = {
        userId: uId,
        posted,
        productName,
        originalPrice,
        resalePrice,
        condition,
        phone,
        location,
        category,
        purchageYear: year,
        photoURL,
    };

    //console.log(objects);

    User.findOne({userId: uId}).then((result) => {
        //console.log(result);
        if(result?.userId){
            objects.sellerName = result.name;
            const newProduct = new Product(objects);

            newProduct.save().then((saveRes) => {
                //update start
                User.updateOne({userId: uId}, {$addToSet:{myProducts: [saveRes._id]}}).then((finalRes) => {
                    const cat = category.toLowerCase();
                    Category.updateMany({categoryName: cat}, {$addToSet: {products: [saveRes._id]}}).then((data) => {
                        if(data.modifiedCount === 0){
                            const newCat = new Category({
                                categoryName: cat,
                                products: [saveRes._id],
                            })

                            newCat.save().then((catRes) => {
                                res.json({
                                    success: true,
                                    message: finalRes,
                                })
                            }).catch((err4) => {
                                res.json({
                                    success: false,
                                    message: err4.message,
                                })
                            })
                        }
                        else{
                            res.json({
                                success: true,
                                message: finalRes,
                            })
                        }
                    }).catch((err2) => {
                        res.json({
                            success: false,
                            message: err2.message,
                        })
                    })
                }).catch((err1)=>{
                    res.json({
                        success: false,
                        message: err1.message,
                    })
                })
                //update finish
            }).catch((err) => {
                res.json({
                    success: false,
                    message: err.message,
                })
            })
        }
        else{
            res.json({
                success: false,
                message: "Server Error!\n",
            })
        }
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get seller product
app.get('/get-seller-products/:uid', authCheck, (req, res) => {
    const {uid} = req.params;

    User.findOne({userId: uid}).populate('myProducts').then((data) => {
        res.json({
            success: true,
            message: data?.myProducts,
        })
    }).catch((err) => {
        res.json({
            message: err.message,
        })
    })
});

// get all category
app.get('/get-all-category', (req, res) => {
    Category.find().then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get products by category id
app.get('/get-specific-products/:id', authCheck, (req, res) => {
    const {id} = req.params;
    const updatedId = mongoose.Types.ObjectId(id);

    Category.findById(updatedId).populate('products').then((data) => {
        res.json({
            success: true,
            message: data.products,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
})

// update booked product
app.patch('/update-booked-product', authCheck, (req, res) => {
    const {id, phone, location, uid} = req.body;
    const updatedId = mongoose.Types.ObjectId(id);

    Product.updateOne({_id: updatedId}, {$set: {isBooked: true, customerPhone: phone, customerLocation: location}}).then((result) => {

        User.updateOne({userId: uid}, {$addToSet: {myOrders: [updatedId]}}).then((upRes) => {
            res.json({
                success: true,
                message: upRes,
            });
        }).catch((err1) => {
            res.json({
                success: false,
                message: "User update",
            });
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: "Probably here",
        })
    })
});

// delete a product by seller
app.delete('/delete-product-seller/:id', authCheck, (req, res) => {
    const {id} = req.params;
    const updatedId = mongoose.Types.ObjectId(id);

    Product.deleteOne({_id: updatedId}).then((result) => {
        res.json({
            success: true,
            message: result,
        });
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        });
    })
})

// get my orders for buyers
app.get('/get-my-orders/:uid', authCheck, (req, res) => {
    const {uid} = req.params;

    User.findOne({userId: uid}).populate('myOrders').then((data) => {
        res.json({
            success: true,
            message: data.myOrders,
        });
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    });
});

// advertise items
app.patch('/advertise-items', authCheck, (req, res) => {
    const {id} = req.body;
    const updatedId = mongoose.Types.ObjectId(id);

    Product.updateOne({_id: updatedId}, {$set: {isAdvertised: true}}).then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get all products for checking advertisement
app.get('/get-advertise-items', (req, res)=>{
    Product.find().then((result) => {
        const resObject = result.filter((data) =>  data.isAdvertised && !data.isPaid);
        res.json({
            success: true,
            message: resObject,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

//report to admin
app.patch('/report-to-admin', authCheck, (req, res) => {
    const {id, uid} = req.body;
    const updatedId = mongoose.Types.ObjectId(id);

    User.updateOne({userId: uid}, {$addToSet: {report: [updatedId]}}).then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        });
    })
});

const adminCheck = (req, res, next) => {
    const {uid} = req.body;
    User.findOne({userId: uid}).then((data) => {
        if(data?.role === 'admin'){
            next();
        }
        else{
            res.json({
                success: false,
                message: "Unauthorized Access!",
            })
        }
    }).catch((err) => {
        req.json({
            success: false,
            message: "Unauthorized Access!",
        })
    })
}

// admin checking middleware
const adminCheckV2 = (req, res, next) => {
    const {uid} = req.params;
    User.findOne({userId: uid}).then((data) => {
        if(data?.role === 'admin'){
            next();
        }
        else{
            res.json({
                success: false,
                message: "Unauthorized Access!",
            })
        }
    }).catch((err) => {
        req.json({
            success: false,
            message: "Unauthorized Access!",
        })
    })
}

//delete an user
app.delete('/delete-user/:uid/:userid', authCheck, adminCheckV2, (req, res) => {
    const {uid, userid} = req.params;

    User.deleteOne({userId: userid}).then((data) => {
        res.json({
            success: true,
            message: data,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
})

// get all seller
app.get('/get-all-seller/:uid', authCheck,  adminCheckV2, (req, res) => {

    User.find().then((data) =>{

        const finalObj = data.filter((elem) => elem.role === 'seller');
        res.json({
            success: true,
            message: finalObj,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get buyers
app.get('/get-all-buyer/:uid', authCheck,  adminCheckV2, (req, res) => {

    User.find().then((data) =>{
        const finalObj = data.filter((elem) => elem.role === 'buyer');
        res.json({
            success: true,
            message: finalObj,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get product info
app.get('/get-product-info/:id', authCheck, (req, res) => {
    const {id} = req.params;
    const updatedId = mongoose.Types.ObjectId(id);

    Product.findById(updatedId).then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// payment
app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const amount = (price) * 100;
  
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      "payment_method_types": [
        "card"
      ]
    });
  
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
});

// update payment details
app.patch('/update-payment', authCheck, (req, res) => {
    const {price, paymentId, user, id} = req.body;

    const paymentObject = {
        price,
        paymentId,
        user,
    };

    const updatedId = mongoose.Types.ObjectId(id);

    Product.updateOne({_id: updatedId}, {$set: {isPaid: true, paymentDetails: paymentObject}}).then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// get reported items
app.get('/get-reported-items/:uid', authCheck, adminCheckV2, (req, res) => {
    User.find().populate('report').then((result) => {
        const updateObj = result.map((data) => data.report);
        let finalObj = [];
        for(let i=0; i<updateObj.length; i++){
            finalObj = [...finalObj, ...updateObj[i]];
        }

        res.json({
            success: true,
            message: finalObj,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
})

app.patch('/verify-user/:uid', authCheck, adminCheckV2, (req, res) => {
    const {uId} = req.body;
    User.updateOne({userId: uId}, {$set: {isVarified: true}}).then((result) => {
        res.json({
            success: true,
            message: result,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
});

// getting verify user information
app.get('/get-verify-info/:id', authCheck, (req, res) => {
    const {id} = req.params;

    User.findOne({userId: id}).then((result) => {
        res.json({
            success: true,
            message: result?.isVarified,
        })
    }).catch((err) => {
        res.json({
            success: false,
            message: err.message,
        })
    })
})

// 404 handler
app.use(notFoundHandler);

//default error handler
app.use(errorHandler);

//listen app
app.listen(port, () => {
    console.log(`App listening to port ${port}`);
});
