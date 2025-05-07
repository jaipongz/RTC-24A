const { error } = require('console');
const { request } = require('https');
const { response } = require('express');
const Pool = require('pg').Pool
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})


const getUsers = (request, response) => {
  pool.query('SELECT * FROM tbl_users ORDER BY user_id ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const createSocket = (username,socketId)=>{
  pool.query('UPDATE users SET socket_id = $1 WHERE name = $2',[socketId,username],
    (error)=>{
        if(error){
          throw error
        }
        console.log('Update Socket Successfully');
    }
  )
}
const getUserByName = (username) => {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE name = $1', [username], (error, results) => {
      if (error) {
        return reject(error);
      }
      if (results.rows.length === 0) {
        return resolve(null);
      }
      resolve(results.rows[0]);
    });
  });
};


const register = (request, response) => {
  const {
    id_card_number, phone_number, first_name, last_name, gender, status, birth_date, age,
    ethnicity, nationality, religion, job, father_name, mother_name, spouse_name, email,
    house_number, moo, village_name, alley, road, province, district, sub_district,
    drug_allergy, right_treatment, congenital_disease, had_surgery, emergency_name,
    emergency_phone_number, emergency_relavance, emergency_house_number, emergency_moo,
    emergency_village_name, emergency_alley, emergency_road, emergency_province, emergency_district,
    emergency_sub_district
  } = request.body;

  try {
    const query = `
      INSERT INTO tbl_users (
        id_card_number, phone_number, first_name, last_name, gender, status, birth_date, age,
        ethnicity, nationality, religion, job, father_name, mother_name, spouse_name, email,
        house_number, moo, village_name, alley, road, province, district, sub_district,
        drug_allergy, right_treatment, congenital_disease, had_surgery, emergency_name,
        emergency_phone_number, emergency_relavance, emergency_house_number, emergency_moo,
        emergency_village_name, emergency_alley, emergency_road, emergency_province, emergency_district,
        emergency_sub_district
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
      )
    `;
    const values = [
      id_card_number, phone_number, first_name, last_name, gender, status, birth_date, age,
      ethnicity, nationality, religion, job, father_name, mother_name, spouse_name, email,
      house_number, moo, village_name, alley, road, province, district, sub_district,
      drug_allergy, right_treatment, congenital_disease, had_surgery, emergency_name,
      emergency_phone_number, emergency_relavance, emergency_house_number, emergency_moo,
      emergency_village_name, emergency_alley, emergency_road, emergency_province, emergency_district,
      emergency_sub_district
    ];

    pool.query(query, values, (error, results) => {
      if (error) {
        throw error;
      }
      response.status(201).send('Registered Successfully');
    });
  } catch (error) {
    throw error,
    response.status(500).send('Error registering user');
  }
}

module.exports = {
  getUsers,
  register,
  createSocket,
  getUserByName

}