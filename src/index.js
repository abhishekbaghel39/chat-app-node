const path = require('path')
const http = require('http')

const express = require('express')
const socketio = require('socket.io')
const BadWords = require('bad-words')

const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)
const PORT = process.env.PORT || 8080
const publicDirectoryPath = path.join(__dirname, '..', 'public')

app.use(express.static(publicDirectoryPath))

io.on('connection', socket => {
	socket.on('join', ({ username, room }, callback) => {
		const { error, user } = addUser(socket.id, username, room)

		if (error) {
			return callback(error)
		}

		socket.join(user.room)

		socket.emit('message', generateMessage('ADMIN', 'Welcome!'))
		socket.broadcast.to(user.room).emit('message', generateMessage('ADMIN', `${user.username} has joined!`))

		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room),
		})

		callback()
	})

	socket.on('sendMessage', (message, callback) => {
		const filter = new BadWords()
		const user = getUser(socket.id)

		if (filter.isProfane(message)) {
			return callback('Profanity is not allowed')
		}

		io.to(user.room).emit('message', generateMessage(user.username, message))
		callback()
	})

	socket.on('sendLocation', (coords, callback) => {
		const user = getUser(socket.id)

		io.to(user.room).emit(
			'locationMessage',
			generateLocationMessage(user.username, `https://google.com/maps?=${coords.lat},${coords.lng}`)
		)
		callback()
	})

	socket.on('disconnect', () => {
		const user = removeUser(socket.id)

		if (user) {
			io.to(user.room).emit('message', generateMessage('ADMIN', `${user.username} has left!`))

			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room),
			})
		}
	})
})

server.listen(PORT, () => {
	console.log(`Server is up on port ${PORT}`)
})
