const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage,generateLocationMessage} = require('./utils/messages')
const {getUser,getUsersInRoom,removeUser,addUser} = require('./utils/users')

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

app.use(express.json())

//define paths for express config
const publicDirectory = path.join(__dirname, "../public");

//setup static directory to serve
app.use(express.static(publicDirectory))

io.on('connection',(socket)=>{

    socket.on('join',({username,room},callback)=>{
        const {error,user} = addUser({id:socket.id,username,room})
        if(error){
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message',generateMessage('Admin','Welcome!'))
        //send message to all clients except current client
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })
        callback()
    })
    socket.on('sendMessage',(clientMessage,callback)=>{
        //get user information
        const user = getUser(socket.id);
        if(!user){
            callback('User not found')
        }
    
        //check profanity
        const filter = new Filter()
        if(filter.isProfane(clientMessage)){
            return callback('profanity is not allowed')
        }
        io.to(user.room).emit('message',generateMessage(user.username,clientMessage))
        callback('Delivered')
    })

    socket.on('sendLocation',(location,callback)=>{
        //get user information
        const user = getUser(socket.id);
        if(!user){
            callback('User not found')
        }

        const url = 'http://google.com/maps?q='+ location.latitude +','+ location.longitude
        io.to(user.room).emit('locationMessage',generateLocationMessage('Admin',url))
        callback()
    })

    socket.on('disconnect',()=>{
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message',generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
    })
})


server.listen(port,()=>{
    console.log('console is up on port: ',port)
})