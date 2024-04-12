const socket = io()

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $sidebar = document.querySelector('#sidebar')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoScroll = () => {
	// New message element
	const $newMessage = $messages.lastElementChild

	// Height o fthe new message
	const newMessageStyles = getComputedStyle($newMessage)
	const newMessageMargin = parseInt(newMessageStyles.marginBottom)
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

	// Visible Height
	const VisibleHeight = $messages.offsetHeight

	// Height of messages container
	const containerHeight = $messages.scrollHeight

	// How far have I scrolled?
	const scrollOffset = $messages.scrollTop + VisibleHeight

	if (containerHeight - newMessageHeight <= scrollOffset) {
		$messages.scrollTop = $messages.scrollHeight
	}
}

socket.on('message', msg => {
	const html = Mustache.render(messageTemplate, {
		username: msg.username,
		message: msg.text,
		createdAt: moment(msg.createdAt).format('hh:mm A'),
	})
	$messages.insertAdjacentHTML('beforeend', html)
	autoScroll()
})

socket.on('locationMessage', location => {
	const html = Mustache.render(locationMessageTemplate, {
		username: location.username,
		url: location.url,
		createdAt: moment(location.createdAt).format('hh:mm A'),
	})
	$messages.insertAdjacentHTML('beforeend', html)
	autoScroll()
})

socket.emit('join', { username, room }, error => {
	if (error) {
		alert(error)
		location.href = '/'
	}
})

socket.on('roomData', ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, { room, users })
	$sidebar.innerHTML = html
})

$messageForm.addEventListener('submit', event => {
	event.preventDefault()

	$messageFormButton.setAttribute('disabled', 'disabled')

	const message = event.target.elements.message.value
	socket.emit('sendMessage', message, error => {
		$messageFormButton.removeAttribute('disabled')
		$messageFormInput.value = ''
		$messageFormInput.focus()

		if (error) {
			return alert('Profanity is not allowed!')
		}
		console.log('Message delivered')
	})
})

$sendLocationButton.addEventListener('click', () => {
	if (!navigator.geolocation) {
		return alert('Geolocation is not supported by your browser.')
	}
	$sendLocationButton.setAttribute('disabled', 'disabled')

	navigator.geolocation.getCurrentPosition(position => {
		socket.emit('sendLocation', { lat: position.coords.latitude, lng: position.coords.longitude }, () => {
			$sendLocationButton.removeAttribute('disabled')
			console.log('Location shared!')
		})
	})
})
