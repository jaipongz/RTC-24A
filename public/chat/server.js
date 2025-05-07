
const socket = io();
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const activeUserContainer = document.getElementById('active-user-container');

const unreadMessages = {};

function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(".active-user.active-user--selected");

    alreadySelectedUser.forEach(el => {
        el.classList.remove("active-user--selected");
    });
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");
    userContainerEl.classList.add("active-user");
    userContainerEl.setAttribute("id", socketId);

    const usernameEl = document.createElement("p");
    usernameEl.classList.add("username");
    usernameEl.textContent = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.classList.add("active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        talkingWithInfo.textContent = `Talking with: Socket ${socketId}`;
        removeNewMessageIndicator(socketId);
    });

    return userContainerEl;
}

function updateUserList(socketIds) {
    activeUserContainer.innerHTML = '';

    socketIds.forEach(socketId => {
        let userContainerEl = createUserItemContainer(socketId);

        if (unreadMessages[socketId]) {
            userContainerEl.classList.add("has-new-message");
        }

        activeUserContainer.appendChild(userContainerEl);
    });
}

function removeNewMessageIndicator(socketId) {
    unreadMessages[socketId] = false;
    const userContainerEl = document.getElementById(socketId);
    if (userContainerEl) {
        userContainerEl.classList.remove("has-new-message");
    }
}

messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        const selectedUser = activeUserContainer.querySelector(".active-user.active-user--selected");
        if (selectedUser) {
            const socketId = selectedUser.getAttribute("id");
            socket.emit('chat-message', { to: socketId, message: message });
            appendMessage('You', message, 'sent');
            messageInput.value = '';
            
            removeNewMessageIndicator(socketId);
        } else {
            alert('Please select a user to send a message to.');
        }
    }
});

socket.on('update-user-list', (data) => {
    updateUserList(data.users);
});

socket.on('private-message', (data) => {
    appendMessage(data.from, data.message, 'received');

    if (!unreadMessages[data.from]) {
        unreadMessages[data.from] = true;
        const senderUserContainer = document.getElementById(data.from);
        if (senderUserContainer) {
            senderUserContainer.classList.add("has-new-message");
        }
    }
});
socket.on('receive_message', (data) => {
    appendMessage(data.username, data.message, 'received');

    if (!unreadMessages[data.username]) {
        unreadMessages[data.username] = true;
        const senderUserContainer = document.getElementById(data.username);
        if (senderUserContainer) {
            senderUserContainer.classList.add("has-new-message");
        }
    }
});

function appendMessage(from, message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);

    const senderDiv = document.createElement('div');
    senderDiv.classList.add('sender');
    senderDiv.textContent = `${from}:`;
    messageElement.appendChild(senderDiv);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.textContent = message;
    messageElement.appendChild(messageContent);

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function fetchChatHistory() {
    try {
        const response = await fetch('/messege'); 
        const chatHistory = await response.json();

        chatHistory.forEach(chat => {
            appendMessage(chat.username, chat.message, 'received');
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
    }
}


window.addEventListener('load', () => {
    fetchChatHistory();
});