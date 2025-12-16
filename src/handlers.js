import { Markup } from 'telegraf'
import service from './data-access/dal.js';
import { buildPaginatedInlineKeyboard } from './messageBuilder.js';

import dotenv from 'dotenv';
import moment from 'moment';


dotenv.config()


const onStart = async (ctx, message) => {
    if(message.chat.type !== 'group' && message.chat.id !== process.env.ADMIN_GROUP_ID ) {

		const client = await service.getOrCreateClinet(message.chat)
		
		if(!client.phone || client.phone.length === 0 ){
			return ctx.reply(
				"Чтобы идентифицировать вас для получения помощи необходим ваш номер телефона!",
				Markup.keyboard([
					Markup.button.contactRequest("Send contact")
				]).resize(),
			);
	
		} else {
			await welcomeMessage(ctx, client)
		}
	
	} else if(message.chat.id !== process.env.ADMIN_GROUP_ID){
		  
	}
};

const onContactReceived = async (ctx) => {

	let client_id = 0;
	let client_fullname = ctx.message.from.first_name + ' ' + ctx.message.from.last_name;

	const updated = await service.updateClinet(ctx.message.chat, ctx.message.contact.phone_number, client_id, client_fullname)

	welcomeMessage(ctx, updated)
};


const welcomeMessage = async (ctx, account) => {

	  await ctx.reply('Здравствуйте ' + account.vetmanager_fullname  + '! Опишите свой вопрос или проблему. Незабудьте сообщить о состоянии питомца, если вы недавно проходили процедуры.', {
        reply_markup: { remove_keyboard: true }
    });
}


const onClinetMessage = async (ctx) => {

	const photosToSend = [];

	if(ctx.update.message?.photo?.length > 0) {
		ctx.message.photo.shift();
		const photos = ctx.message.photo;

		for await (const photo of photos) {
			const fileId = photo.file_id;
	
			
			if(photosToSend.length === 0){
				photosToSend.push(
					{ type: 'photo', media:  fileId }
				  )
			} else {
				photosToSend.push(
					{ type: 'photo', media: fileId  }
				  )
			}

		}
	}
  

    if(Number(ctx.message.chat.id) === Number(process.env.ADMIN_GROUP_ID)) {
	
		var re = /\+?[0-9]{10,13}/gm; 
		const [phone, ] = (ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption).match(re).map(function(s){return s.trim()});

		const manager_id = ctx.message.from.id
		const manager_full_name = ctx.message.from.first_name + ' ' + ctx.message.from.last_name
		const manager_message = ctx.message.text ||  ctx.message.reply_to_message.caption || '';


		await service.getOrCreateManager(ctx.message.from)


		const { rows: [client,] } = await service.query('SELECT * FROM clients WHERE phone = $1', [phone])

		if(client) {
			const text = 'INSERT INTO messages(message, client_id, manager_id, message_type, message_id)VALUES($1, $2, $3, $4, $5) RETURNING *'
			const values = [manager_message, Number(client.user_id), Number(manager_id),  photosToSend.length === 0 ? 'message': 'photo',  ctx.message.message_id ]

			const { rows: [created_message,] } = await service.query(text, values);



			if(photosToSend.length > 0) {
				photosToSend[0].caption = `
				 \r\n\
					${manager_message}  `;

				const new_photo = await ctx.telegram.sendMediaGroup(client.user_id, photosToSend )
				.then(() => console.log('Media group sent successfully!'))
				.catch(err => console.error('Error sending media group:', err));

				
			///	const text = 'UPDATE messages SET message_id=$1 WHERE id=$2 RETURNING *'
		//		const values = [ new_message.message_id, created_message.id ]
	//			const { rows: [updated_message, ] } = await service.query(text, values)

			} else {


				const new_message = await ctx.telegram.sendMessage(client.user_id, 
					`Вам ответила служба поддержки ТерраВет</b>
					\r\n\
					${manager_message}  `,
					{
						parse_mode: 'html'
					}
				)

				
			///	const text = 'UPDATE messages SET message_id=$1 WHERE id=$2 RETURNING *'
		//		const values = [ new_message.message_id, created_message.id ]
	//			const { rows: [updated_message, ] } = await service.query(text, values)
		
			}
		}

    } else {

		const client = await service.getOrCreateClinet(ctx.message.chat)


		if(!client.phone || client.phone.length === 0 ){
			return ctx.reply(
				"Чтобы идентифицировать вас для получения помощи необходим ваш номер телефона!",
				Markup.keyboard([
					Markup.button.contactRequest("Send contact")
				]).resize(),
			);
	
		}

		let vetmanager_id = 0;
		let vetmanager_fullname = '';

		if(client.phone  && client.phone.length > 0){
			let { id, fullname } = await service.getClinetVetmanagerID(client.phone);
			vetmanager_id = id;
			vetmanager_fullname = fullname
		}

		await service.updateClinet(ctx.message.chat, client.phone, vetmanager_id, vetmanager_fullname)

		if(client) {

			const client_message =  ctx.message.text || ctx.message.caption 

			const text = 'INSERT INTO messages(message, client_id, message_type)VALUES($1, $2, $3 ) RETURNING *'
			const values = [client_message, ctx.message.from.id,  photosToSend.length === 0 ? 'message': 'photo' ]

			const { rows: [created_message,] } = await service.query(text, values);

			const chat_id = ctx.message.chat.id;

			const view_history_keyboard = Markup.inlineKeyboard([
				[
					Markup.button.callback('Посмотреть переписку', 'open_chat_from_client__' + chat_id),
				],
			]);

			

			if(photosToSend.length > 0) {
				const message = client.vetmanager_fullname +  ' (' + client.phone + ', id:<b>' + client.vetmanager_id + '</b>)' +
				' \r\n\ \r\n\ ' +
				'<b>' + ( client_message || '' )  + '</b>' 
				

				photosToSend[0].caption="Фото от " + client.vetmanager_fullname +  ' (' + client.phone +  ', id:' + client.vetmanager_id + ')'

					 const new_message_photo = await ctx.telegram.sendMediaGroup(process.env.ADMIN_GROUP_ID, photosToSend)
					
					console.log(new_message_photo)
					const new_message = await ctx.telegram.sendMessage(process.env.ADMIN_GROUP_ID, 
						message,
						{
							parse_mode: 'html',
							reply_markup: view_history_keyboard.reply_markup
						}
					)

					const text = 'UPDATE messages SET message_id=$1, photo_message_id=$3 WHERE id=$2 RETURNING *'
					const values = [ new_message.message_id, created_message.id, new_message_photo[0].message_id ]
					const { rows: [updated_message, ] } = await service.query(text, values)

		
			} else {

				const message =  client.vetmanager_fullname +  ' (' + client.phone + ', id:<b>' + client.vetmanager_id + '</b>)' +
				' \r\n\ \r\n\ ' +
				'<b>' + ( client_message || '' )  + '</b>' 
				
				const new_message =  await ctx.telegram.sendMessage(process.env.ADMIN_GROUP_ID, 
					message,
					{
						parse_mode: 'html',
						reply_markup: view_history_keyboard.reply_markup
					}
				)	

			    
				const text = 'UPDATE messages SET message_id=$1 WHERE id=$2 RETURNING *'
				const values = [ new_message.message_id, created_message.id ]
				const { rows: [updated_message, ] } = await service.query(text, values)

			}		
			
			
			
		} else {
			await ctx.reply('Здравствуйте ' + ctx.message.form.first_name + ' ' +  ( ctx.message.form.last_name || '') + 
				'! Вы не авторизоавны в боте, презапустите бота или ввдетие команду /start', 
				{ reply_markup: { remove_keyboard: true } });
		}
  
    }

};

const onCallbackQuery = async (ctx) => {
	const [action, clinet_id] = ctx.update.callback_query.data.split('__')

	const { rows: [client,] } = await service.query('SELECT * FROM clients WHERE user_id = $1', [clinet_id])

	
	if(action === 'open_chat_from_client') {
	
		const { rows } = await service.query(
			`SELECT ms.message, 
					ms.created_at,
					ms.message_id, 
					ms.photo_message_id,
				    ms.manager_id, 
					mr.account_data 
			FROM messages ms
			 LEFT JOIN managers mr ON mr.user_id=ms.manager_id  WHERE client_id = $1`, [clinet_id])

	    const message_ids  = []

		rows.map(row => {
			if(row.photo_message_id > 0) {
				message_ids.push(row.photo_message_id);
			}
			if(row.message_id > 0) {
				message_ids.push(row.message_id);	
			}
		
		});


		await ctx.telegram.forwardMessages(ctx.update.callback_query.from.id, Number(process.env.ADMIN_GROUP_ID), message_ids)

		/*const messageString = rows.map(row => {

				const message_sender = 
					row.manager_id > 0 ? 
						'Менеджер ' + row.account_data.first_name + ' ' + row.account_data.last_name :  
						'Клиент ' + client.account_data.first_name + ' ' + client.account_data.last_name;

				const message_datetime = 	moment(row.created_at).format('DD.MM HH:mm')	
				return `<u>${message_sender}</u> ${message_datetime}  \r\n${row.message}\r\n` 
			}).join('\r\n')
		
		const max_size = 4096;

		var amount_sliced = messageString.length / max_size
		var start = 0
		var end = max_size
		var message
		var messagesArray = []
		for (let i = 0; i < amount_sliced; i++) {
			message = messageString.slice(start, end) 
			messagesArray.push(message)
			start = start + max_size
			end = end + max_size
		}
		let index = 0;
		for await (const message of messagesArray) {
			await ctx.telegram.sendMessage(ctx.update.callback_query.from.id, 
				(index === 0 ? `История общения с  <b> ${client.account_data.first_name} ${client.account_data.last_name}</b>`: '') +
				`\r\n
				 ${message}`,
				{
					parse_mode: 'html'
				}
			)

			index++;
		}*/

		
	}

}


const onReplyInPrivateBotChat = async (ctx) => {
    const chatId = ctx.message.chat.id


	const { rows: [client,] } = await service.query('SELECT * FROM clients WHERE user_id = $1', [chatId])


  
	welcomeMessage(ctx, updated)
};

export default {
	onStart,
	onClinetMessage,
    onContactReceived,
	onCallbackQuery
};
