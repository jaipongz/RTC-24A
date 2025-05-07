const Pool = require('pg').Pool
require('dotenv').config();


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

const createRoom = (request, response) => {
    const { roomName, createBy } = request.body

    pool.query('INSERT INTO tbl_chat_room (room_name, created_by) VALUES ($1, $2)', [roomName, createBy], (error, results) => {
        if (error) {
            throw error
        }
        response.status(201).send(`Created Room Successfully`)
    })
}
const getRooms = (request, response) => {
    pool.query('SELECT * FROM tbl_chat_room ORDER BY room_id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const createChat = (message, username,room) => {
    pool.query('INSERT INTO tbl_chat (room_id, message, username, created_at) VALUES ($1, $2, $3, NOW())', [room, message, username], (error, results) => {
        if (error) {
            throw error
        }
        console.log('Message inserted successfully');
    })
}


const getChat = (room) => {
    return new Promise((resolve, reject) => {
      pool.query('SELECT * FROM tbl_chat WHERE room_id = $1 ORDER BY created_at ASC', [room], (error, results) => {
        if (error) {
          reject(error);
        }
        resolve(results.rows);
      });
    });
  };

// const getChat = (request, response) => {
//     pool.query('SELECT * FROM tbl_chat ORDER BY created_at ASC', (error, results) => {
//         if (error) {
//             throw error
//         }
//         response.status(200).json(results.rows)
//     })
// }

module.exports = {
    createRoom,
    getRooms,
    createChat,
    getChat
}