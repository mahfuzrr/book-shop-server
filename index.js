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
    const {email, uId} = req.body;
    const token = jwt.sign({
        email,
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

    console.log(updatedObject);

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

app.get('/get-user-role/:id', (req, res) =>{
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
app.post('/add-products', (req, res) => {
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
app.get('/get-seller-products/:uid', (req, res) => {
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
app.get('/get-specific-products/:id', (req, res) => {
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
app.patch('/update-booked-product', (req, res) => {
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
app.delete('/delete-product-seller/:id', (req, res) => {
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
app.get('/get-my-orders/:uid', (req, res) => {
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


// 404 handler
app.use(notFoundHandler);

//default error handler
app.use(errorHandler);

//listen app
app.listen(port, () => {
    console.log(`App listening to port ${port}`);
});
