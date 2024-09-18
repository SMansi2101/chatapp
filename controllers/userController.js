const bcrypt = require('bcryptjs');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const Group = require('../models/groupModel');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer')
const config = require('../config/config');

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
                res.cookie(`user`, JSON.stringify(userData));
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
    res.clearCookie('user');
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
        const users = await User.find({ _id: { $nin: [req.session.user._id] } });
        res.render('dashboard', { user: req.session.user, users: users });

    } catch (error) {
        console.log(error.message);
    }
};

const saveChat = async function (req, res) {
    try {
        const chat = new Chat({
            sender_id: req.body.sender_id,
            receiver_id: req.body.receiver_id,
            message: req.body.message
        });

        const newChat = await chat.save();
        res.status(200).send({ success: true, msg: 'Chat inserted!', data: newChat });
    } catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};

const deleteChat = async function (req, res) {
    try {

        await Chat.deleteOne({ _id: req.body.id });
        res.status(200).send({ success: true });

    } catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};

const editChat = async function (req, res) {
    try {

        await Chat.findByIdAndUpdate({ _id: req.body.id }, {
            $set: {
                message: req.body.message,
            }
        });
        res.status(200).send({ success: true });

    } catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};

const loadGroups = async function (req, res) {
    try {
        const groups = await Group.find({ creator_id: req.session.user._id });
        res.render('group', { groups: groups });

    } catch (error) {
        console.log(error.message);
    }
};

const createGroups = async function (req, res) {
    try {
        const group = new Group({
            creator_id: req.session.user._id,
            name: req.body.name,
            image: 'images/' + req.file.filename,
            limit: req.body.limit
        });

        await group.save();
        const groups = await Group.find({ creator_id: req.session.user._id });
        res.render('group', { message: req.body.name + ' Group Created Successfully', groups: groups });

    } catch (error) {
        console.log(error.message);
    }
};

const addMember = async function (req, res) {
    try {

        const users = await User.find({ _id: { $nin: [req.session.user._id] } });
        res.status(200).send({ success: true, data: users });

    } catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};

const LoadforgotPassword = async function (req, res) {
    try {
        res.render('forgotpass');

    } catch (error) {
        console.log(error.message);
    };
};
const sendresetpasswordMail = async function (name, email, token) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
        });

        const mailOptions = {
            to: email,
            from: config.emailUser, // Sender's email
            subject: 'LinkUp Password Reset',
            html: `
                <p>Hello ${name},</p>
                <p>You are receiving this email because you requested a password reset for your account.</p>
                <p>Please click the following link to reset your password:</p>
                <p><a href="http://localhost:3000/reset-password/${token}" style="color: #018fed; text-decoration: none;">Reset Password</a></p>
            `
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log("mail has been sent: ", info, res)
                
            }
        });

    } catch (error) {
        console.log("Error in sending mail:", error.message);
    }
};

const forgotPassword = async function (req, res) {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email })
        if (userData) {
            const randomString = randomstring.generate();
            const data = await User.updateOne({ email: email }, { token: randomString, new: true });
            sendresetpasswordMail(userData.name, userData.email, randomString)
            res.render('forgotpass', { message: "Please check your inbox for a reset password link." });

        } else {
            res.render('forgotpass', { message: "User with this email does not exist." });
        }


    } catch (error) {
        res.render('forgotpass', { message: error.message });
    }
};

const loadresetPassword = async (req, res) => {
    try {
        const token = req.params.token;
        res.render('resetpass', { token: token, message: undefined }); // No message initially
    } catch (error) {
        console.log(error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const token = req.params.token;
        const tokenData = await User.findOne({ token: token });

        if (tokenData) {
            const password = req.body.password;
            const newPassword = await securePassword(password);

            await User.findByIdAndUpdate(
                { _id: tokenData._id },
                { $set: { password: newPassword, token: '' } }, // Clear token after reset
                { new: true }
            );
            res.render('resetpass', { token: token, message: "Password has been reset successfully." });
        } else {
            
            res.render('resetpass', { token: token, message: "This link has expired or is invalid." });
        }
    } catch (error) {
        res.render('resetpass', { token: req.params.token, message: "An error occurred while resetting the password." });
    }
};


const securePassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw new Error('Error in password encryption');
    }
};



module.exports = {
    registerLoad,
    register,
    loadlogin,
    login,
    logout,
    loadDashboard,
    saveChat,
    deleteChat,
    editChat,
    loadGroups,
    createGroups,
    addMember,
    forgotPassword,
    LoadforgotPassword,
    resetPassword,
    loadresetPassword
};