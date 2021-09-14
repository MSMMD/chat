let socket = io();
socket.emit('new user', roomName, username);

let form = document.getElementById('form');
let input = document.getElementById('input');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    if(input.value.replace(" ", "") != ""){
      socket.emit('chat message', { msg:`${username}: ${input.value}`, room:roomName});
      input.value = '';
    }
  }
});

socket.once('all messages', (msgs) => {
  msgs.forEach((msg) => {
    let item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });
});

socket.on('chat message', (msg) => {
  let item = document.createElement('li');
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});