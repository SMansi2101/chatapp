const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv').config();
const connectDb = require('./config/dbConnnection');
const userRoutes = require('./routes/userRoutes');
const path = require('path');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

// Create an Express app
const app = express();
const http = require('http').Server(app);

// Use body-parser middleware globally
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
connectDb();

const io = require('socket.io')(http);
const usp = io.of('/user-namespace');

usp.on('connection', async function (socket) {

  console.log("User connected");
  const userId = socket.handshake.auth.token;

  await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' } });
  //broadcast userid of user
  socket.broadcast.emit('getOnlineStatus', { user_id: userId });

  socket.on('disconnect', async function () {
    console.log("User disconnected");

    const userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' } });
    //broadcast userid of user
    socket.broadcast.emit('getOfflineStatus', { user_id: userId });
  });
  //chat implementation
  socket.on('newChat',function(data){
    socket.broadcast.emit('loadNewChat',data);
  });

  //load old chats
  socket.on('existsChat',async function(data){
     const chats = await Chat.find({ $or:[
          {sender_id:data.sender_id,receiver_id:data.receiver_id},
          {sender_id:data.receiver_id,receiver_id:data.sender_id}
     ]});
     socket.emit('loadChats',{chats:chats});
  })
});

// Use session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Use user routes
app.use('/', userRoutes);

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Start server
http.listen(3000, function () {
  console.log('Server is running');
});
