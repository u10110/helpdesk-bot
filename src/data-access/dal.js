
//const { buildMessageFromTitle } = require('../messageBuilder');
import axios from 'axios';

import dotenv from 'dotenv';

dotenv.config()

import { Pool } from 'pg'
 
const pool = new Pool()
 
const query = (text, params) => pool.query(text, params)


const getOrCreateClinet = async (chat) => {
	const { rows: [client,] } = await query('SELECT * FROM clients WHERE user_id = $1', [chat.id])
	console.log(client)
	if(!client) {
		const text = 'INSERT INTO clients(user_id, account_data) VALUES($1, $2) RETURNING *'
		const values = [chat.id, chat ]
		const { rows  } = await query(text, values)
		console.log(rows);

		return rows[0]
		
	} 

	return client
}


const getOrCreateManager = async (chat) => {
	const { rows: [manager,] } = await query('SELECT * FROM managers WHERE user_id = $1', [chat.id])

	if(!manager) {
		const text = 'INSERT INTO managers(user_id, account_data) VALUES($1, $2) RETURNING *'
		const values = [chat.id, chat ]
		const { rows: [manager,] } = await query(text, values)
	} 

	return manager
}


const updateClinet = async (chat, contact, vetmanager_id = 0, vetmanager_fullname = '') => {
	const text = 'UPDATE clients SET phone=$1, account_data=$3, vetmanager_id=$4, vetmanager_fullname=$5  WHERE user_id=$2 RETURNING *'
	const values = [ contact, chat.id, chat, Number(vetmanager_id) > 0 ? Number(vetmanager_id)  : 0, vetmanager_fullname.length > 0 ? vetmanager_fullname : '' ]
	const { rows: [client, ] } = await query(text, values)

	return client;
}


export default {
    query,
	getOrCreateClinet,
	updateClinet,
	getOrCreateManager,
	getClinetVetmanagerID
};

