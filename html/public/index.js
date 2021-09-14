let socket = io();
let roomContainer = document.getElementById('room-container');

socket.on("new room",room => {
  let roomElement = document.createElement('div')
  let roomLink = document.createElement('a')
  roomLink.href = `/r/${room}`
  roomLink.innerText = room;
  roomContainer.appendChild(roomElement);
  roomElement.appendChild(roomLink);
});

socket.on("room deleted", room => {
  let links = document.getElementsByTagName("a");
  Array.from(links).forEach(a => {
    if(a.innerHTML==room) a.parentNode.remove();
  });
});