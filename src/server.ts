import express, { Application, Request, Response } from "express";
import socketIO, { Server as SocketIOServer, Socket } from "socket.io";
import { createServer, Server as HTTPServer } from "https";
import { readFileSync } from "fs";
import path from "path";
import { error } from "console";
const multer = require('multer');
const userService = require('../service/UserService');
const chatService = require('../service/ChatService');
const leaveRoom = require('./utilitys/leave-room');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const CHAT_BOT = 'ChatBot';
let chatRoom = '';

interface User {
  id: string;
  username: string;
  room: string;
  profilePic: string;
}

let allUsers: User[] = [];

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io!: SocketIOServer;
  private activeSockets: string[] = [];
  private readonly DEFAULT_PORT = 5000;
  private readonly IP_ADDRESS = '10.92.5.36';
  private readonly SSL_CERT_PATH = path.resolve(__dirname, "server.pem");
  constructor() {
    this.app = express();
    this.app.use(express.json());
    // this.app.use(cors());

    this.httpServer = createServer({
      cert: readFileSync(this.SSL_CERT_PATH),
      key: readFileSync(this.SSL_CERT_PATH)
    }, this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.handleSocketConnection();
  }

  private configureApp(): void {
    this.app.use((_, res, next) => {
      res.header('Cross-Origin-Opener-Policy', 'same-origin');
      res.header('Cross-Origin-Embedder-Policy', 'require-corp');
      res.header('Access-Control-Allow-Origin', 'https://10.92.5.36:5000');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    this.app.use(express.static(path.join(__dirname, "../public")));

    this.app.get("/", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
    });

    this.app.get("/select", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../public/selectroom.html"));
    });

    this.app.get("/newchat", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../public/newchat/new.html"));
    });

    this.app.get("/video", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../public/video/index.html"));
    });


    this.app.get('/socket.io/socket.io.js', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../node_modules/socket.io/client-dist/socket.io.js'));
    });

    this.app.post('/register', upload.single('image'), userService.register);

    this.app.get('/users', userService.getUsers);

  }




  private handleSocketConnection(): void {


    this.io.on("connection", (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);


      this.activeSockets.push(socket.id);



      this.io.emit("update-user-list", {
        users: this.activeSockets.filter((id) => id !== socket.id),
      });

      socket.broadcast.emit("update-user-list", {
        users: [socket.id],
      });

      socket.on("call-user", (data: any) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id,
        });
      });

      socket.on("reject-call", (data: any) => {
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id,
        });
      });

      socket.on("make-answer", (data: any) => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer,
        });
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter((id) => id !== socket.id);
        socket.broadcast.emit("remove-user", {
          socketId: socket.id,
        });
        console.log(`User disconnected: ${socket.id}`);
      });

      socket.on('join_room', async (data) => {
        const { username, room } = data;
        socket.join(room);

        try {
          let user = await userService.getUserByName(username);

          if (user) {
            if (!user.socket_id) {
              userService.createSocket(username, socket.id);
            } else {
              socket.id = user.socket_id;
            }

            let __createdtime__ = Date.now();

            socket.to(room).emit('receive_message', {
              message: `${username} has joined the chat room`,
              username: CHAT_BOT,
              __createdtime__,
            });

            socket.emit('receive_message', {
              message: `Welcome ${username}`,
              username: CHAT_BOT,
              __createdtime__
            });

            chatRoom = room;
            console.log(user.profile_pic)
            allUsers.push({ id: socket.id, username, room, profilePic: user.profile });
            const chatRoomUsers = allUsers.filter((user) => user.room === room);
            socket.to(room).emit('chatroom_users', chatRoomUsers);
            socket.emit('chatroom_users', chatRoomUsers);

            socket.emit('user_profile', {
              profilePic: user.profile
            });

            socket.to(room).emit('user_joined', { username });

            const last100Messages = await chatService.getChat(room);
            socket.emit('last_100_messages', last100Messages);
          } else {
            socket.emit('error_message', {
              message: `User ${username} not found`,
            });
          }
        } catch (error) {
          console.error(error);
          socket.emit('receive_message', {
            message: `An error occurred while trying to join the room`,
            username: CHAT_BOT,
            __createdtime__: Date.now(),
          });
        }
      });

      socket.on('send_message', (data) => {
        const { message, username, room, __createdtime__ } = data;
        this.io.in(room).emit('receive_message', data);
        chatService.createChat(message, username, room, __createdtime__);
      });

      socket.on('leave_room', (data) => {
        const { username, room } = data;
        socket.leave(room);

        const __createdtime__ = Date.now();

        allUsers = leaveRoom(socket.id, allUsers);

        socket.to(room).emit('chatroom_users', allUsers);

        const chatRoomUsers = allUsers.filter((user) => user.room === room);

        this.io.in(room).emit('chatroom_users', chatRoomUsers);

        socket.to(room).emit('receive_message', {
          username: CHAT_BOT,
          message: `${username} has left the chat`,
          __createdtime__,
        });
        console.log(`${username} has left the chat`);
      });

      socket.on("disconnect-chat", () => {
        const user = allUsers.find((user) => user.id === socket.id);
        if (user) {
          allUsers = leaveRoom(socket.id, allUsers);

          const chatRoomUsers = allUsers.filter((user) => user.room === user.room);
          this.io.in(user.room).emit('chatroom_users', chatRoomUsers);
        }
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, this.IP_ADDRESS, () => {
      callback(this.DEFAULT_PORT);
      console.log(`Server is running on https://${this.IP_ADDRESS}:${this.DEFAULT_PORT}`);
    });
  }
}
