const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const room = urlParams.get('room');

    document.getElementById('talking-with-info').textContent = `Room : ${room}`;

    socket.emit('join_room', { username, room });

    socket.on('last_100_messages', (messages) => {
      const messageContainer = document.getElementById('messages');
      messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.username === username ? 'sent' : 'received');
        messageElement.innerHTML = `<strong>${message.username}</strong>: ${message.message}`;
        messageContainer.appendChild(messageElement);
      });
    });

    socket.on('chatroom_users', (users) => {
      console.log('DATA USER ', users)

      const userContainer = document.getElementById('active-user-container');
      userContainer.innerHTML = '<h3 class="panel-title">Active Users:</h3>'; // Clear the list before updating

      const uniqueUsers = new Set(users.map(user => JSON.stringify(user)));
      uniqueUsers.forEach(userStr => {
        const user = JSON.parse(userStr);
        const userElement = document.createElement('div');
        userElement.classList.add('active-user');
        userElement.innerHTML = `
          <img src="data:image/jpeg;base64,${user.profilePic}" alt="Profile Picture" class="profile-pic">
          <span class="username">${user.username}</span>`;
        userContainer.appendChild(userElement);
      });
    });

    socket.on('user_profile', (data) => {
      const { profilePic } = data;
      // console.log('Profile : ',profilePic)

      const userProfilePic = document.getElementById('user-profile-pic');
      userProfilePic.src = `data:image/jpeg;base64,${profilePic}`;
    });

    socket.on('receive_message', (data) => {
      console.log('Welcome :',data)
      const messageContainer = document.getElementById('messages');
      const messageElement = document.createElement('div');
      if (data.username === 'ChatBot') {
        console.log('Message :', data);
        messageElement.classList.add('message', 'bot');
      } else {
        messageElement.classList.add('message', data.username === username ? 'sent' : 'received');
      }
      messageElement.innerHTML = `<strong>${data.username}</strong>: ${data.message}`;
      messageContainer.appendChild(messageElement);
      messageContainer.scrollTop = messageContainer.scrollHeight;
    });

    document.getElementById('message-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const messageInput = document.getElementById('message-input');
      const message = messageInput.value.trim();
      if (message) {
        const __createdtime__ = Date.now();
        socket.emit('send_message', { message, username, room, __createdtime__ });
        messageInput.value = '';
      }
    });

    document.getElementById('disconnect-button').addEventListener('click', () => {
      socket.emit('leave_room', { username, room });
      window.location.href = `/select`;
    });