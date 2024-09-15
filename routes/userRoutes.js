const express = require('express');
const router = express();
const auth = require('../middlewares/auth');


router.set('view engine','ejs');
router.set('views','./views');

const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/images'));
    },
    filename:function(req,file,cb){
      const name = Date.now()+'-'+file.originalname;
      cb(null,name);
    }
});
 
const upload = multer({storage:storage});

const userController = require('../controllers/userController');

router.get('/register',auth.isLogout,userController.registerLoad);
router.post('/register',upload.single('image'),userController.register);

router.get('/login',auth.isLogout,userController.loadlogin);
router.post('/login',userController.login);
router.get('/logout',auth.isLogin,userController.logout);

router.get('/dashboard',auth.isLogin,userController.loadDashboard);
router.post('/save-chat',userController.saveChat);

router.get('*',function(req,res){
  res.redirect('/');
})


module.exports = router;


