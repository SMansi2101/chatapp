const bcrypt = require('bcrypt');
const User = require('../models/userModel');

const registerLoad = async function (req, res) {
    try {
        res.render('register.ejs');

    } catch (error) {
        console.log(error.message);
    };
};

const register = async function (req, res) {
    try {
        const passwordHash = await bcrypt.hash(req.body.password, 10);

        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            image: 'images/' + req.file.filename,
            password: passwordHash,
        });

        await user.save();
        res.render('register', { message: 'Your Registration has been completed!' });

    } catch (error) {
        console.log(error.message);
    };
};

const loadlogin = async function (req, res) {
    try {
        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
};

const login = async function (req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email: email });

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password); // Await bcrypt.compare

            console.log('Password Match:', passwordMatch);

            if (passwordMatch) {
                req.session.user = userData;
                return res.redirect('/dashboard');
            } else {
                return res.render('login', { message: "Email or Password is incorrect!" });
            }
        } else {
            console.log('User not found');
            return res.render('login', { message: "Email or Password is incorrect!" });
        }

    } catch (error) {
        console.log(error.message);
    }
};


const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Failed to destroy session during logout:", err);
            return res.status(500).send("Failed to logout");
        }

        
        res.redirect('/login');  
    });
};

const loadDashboard = async function (req, res) {
    try {
        const users = await User.find({ _id: {$nin:[req.session.user._id]}});
        res.render('dashboard',{user:req.session.user,users:users});

    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    registerLoad,
    register,
    loadlogin,
    login,
    logout,
    loadDashboard,
};