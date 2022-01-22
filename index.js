const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const Database = require("@replit/database");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcryptjs");

const db = new Database();

app.use(express.static(__dirname + '/html/public'));
app.use(cookieParser());
app.use(express.urlencoded({ extended:true }));
app.use(express.json());
app.set('views', "./");
app.set('view engine', 'ejs');

const server = require('http').createServer(app);
const io = require("socket.io")(server);

let rooms = {};
let users = {};

app.get('/', function(req, res){
  if(!req.cookies.sessionId) return res.redirect('/login');
  if(!users[req.cookies.sessionId]) return res.redirect('/login');
  res.render(__dirname + '/html/index.ejs', {error:0, rooms: rooms});
});

app.get('/login', function(req, res){
	if(users[req.cookies.sessionId]) return res.redirect('/');
  res.render(__dirname + '/html/login.ejs', {error: 0, pusername: "", psenha: ""});
});

app.post('/login', async (req, res) => {
  let username = req.body.username;
	let senha = req.body.password;

  if(!username) return res.render(__dirname + '/html/login.ejs', {error: !username + 2*(!senha), pusername: username || "", psenha: senha || ""});
  if(!senha) return res.render(__dirname + '/html/login.ejs', {error: 2, pusername: username || "", psenha: senha || ""});

  db.list().then(keys=>{
	  if(!keys.includes(username)) res.render(__dirname + '/html/login.ejs', {error: 4, pusername: username || "", psenha: senha || ""});
    else{
	    db.get(username).then(async value => {
        const isPasswordMatched = await bcrypt.compare(senha, value);
		    if(isPasswordMatched){
          Object.keys(users).forEach(key => {
            if(users[key]==username) delete users[key];
          });
          let id = uuidv4();;
		    	res.cookie('sessionId', id, {httpOnly:true});
          users[id] = username;
		    	res.redirect('/');
		    }
		    else{
	      	res.render(__dirname + '/html/login.ejs', {error: 4, pusername: username || "", psenha: senha || ""});
		    }
      });
    }
  });
});

app.get('/register', function(req, res){
	if(users[req.cookies.sessionId]) return res.redirect('/');
  res.render(__dirname + '/html/register.ejs', {error:0, pusername: "", psenha: "", pcsenha: ""});
});

app.post('/register', async (req, res) => {
  let username = req.body.username;
	let senha = req.body.password;
  let csenha = req.body.cpassword;

  if(!username) return res.render(__dirname + '/html/register.ejs', {error: 1 + 2*(!senha) + 4*(!csenha), pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});
  if(!senha) return res.render(__dirname + '/html/register.ejs', {error: 2 + 4*(!csenha), pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});
  if(!csenha) return res.render(__dirname + '/html/register.ejs', {error: 4, pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});

  if(csenha != senha) return res.render(__dirname + '/html/register.ejs', {error: 8, pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});
  if(senha.length < 6) return res.render(__dirname + '/html/register.ejs', {error: 9, pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});

  let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  if(format.test(username)) return res.render(__dirname + '/html/register.ejs', {error: 10, pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});

	db.list().then(async keys=>{
	  if(keys.includes(username)) res.render(__dirname + '/html/register.ejs', {error: 11, pusername: username || "", psenha: senha || "", pcsenha: csenha || ""});
    else{
      const hashedPassword = await bcrypt.hash(password, 8);
      db.set(username, hashedPassword);
      Object.keys(users).forEach(key => {
        if(users[key]==username) delete users[key];
      });
      let id =  uuidv4();
      res.cookie('sessionId', id, {httpOnly:true});
      users[id] = username;
      res.redirect("/");
    }
  });
});

app.get('/logout', function(req, res){
  if(req.cookies.sessionId){
    delete users[req.cookies.sessionId];
    res.clearCookie('sessionId');
  }
	res.redirect("/");
});

app.post('/', async (req, res) => {
  let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  if(format.test(req.body.room)) return res.render(__dirname + '/html/index.ejs', {error:1, rooms: rooms});
  if (!!rooms[req.body.room]) {
    return res.redirect('/');
  }
  rooms[req.body.room] = await { owner:users[req.cookies.sessionId], users: {}, messages: []}
  io.emit("new room", req.body.room);
  res.redirect(`/r/${req.body.room}`);
})

app.get('/r/:room', function(req, res){
  if(!req.cookies.sessionId) return res.redirect('/login');
  if(!users[req.cookies.sessionId]) return res.redirect('/login');
  if (!rooms[req.params.room]) {
    return res.redirect('/');
  }
  res.render(__dirname + '/html/room.ejs', { roomName: req.params.room, username:users[req.cookies.sessionId]});
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(room => {
      let susername = rooms[room].users[socket.id]
      if(!!susername){
        delete rooms[room].users[socket.id];
        setTimeout(() => {
          if(!Object.values(rooms[room].users).includes(susername)){
            rooms[room].messages.push(`${susername} left the chat`);
            io.to(room).emit('chat message', `${susername} left the chat`);
            if(!!rooms[room]){
              if(!Object.values(rooms[room].users).length){
                io.emit('room deleted', room);
                delete rooms[room];
              }
            }
          }
        }, 2000);
      }
    });
  });

  socket.on('new user', (room, user) => {
    if(!rooms[room]) return io.to(socket.id).emit('reload');
    socket.join(room);
    rooms[room].users[socket.id]=user;
    io.to(socket.id).emit('all messages', rooms[room].messages);
    if(rooms[room].messages.filter(msg => msg==`${user} joined the chat`).length==rooms[room].messages.filter(msg => msg==`${user} left the chat`).length){
      rooms[room].messages.push(`${user} joined the chat`);
      io.to(room).emit('chat message', `${user} joined the chat`);
    }
  });

  socket.on('chat message', (data) => {
    rooms[data.room].messages.push(data.msg);
    io.to(data.room).emit('chat message', data.msg);
  });
});

app.use(function(req, res, next) {
    res.status(404);
    res.send("404 ERROR");
    //res.redirect(301, "/");
});

server.listen(3000, ()=>{console.log("the website is on!")});