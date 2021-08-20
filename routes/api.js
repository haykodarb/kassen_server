const express = require("express");
const mysql = require("mysql");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
	service: "gmail",
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	requireTLS: true,
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});

let isMailSent = false;

const router = express.Router();
router.use(express.json());

function obtenerAhora() {
	let now = moment().tz("America/Argentina/Buenos_Aires").format();
	return now;
}

function obtenerDia(num) {
	let now = moment()
		.tz("America/Argentina/Buenos_Aires")
		.subtract(num, "days")
		.format();
	return now;
}

let con = mysql.createPool({
	connectionLimit: 4,
	host: process.env.MYSQL_DB_HOST,
	user: process.env.MYSQL_DB_USER,
	password: process.env.MYSQL_DB_PASS,
	database: process.env.MYSQL_DB_NAME,
});

router.post("/insert", (req, res) => {
	let tiempoActual = obtenerAhora();
	const data = req.body;
	const temperatura = data.temp;

	let mailOptions = {
		from: process.env.GMAIL_USER,
		to: process.env.TARGET_EMAIL,
	};

	console.log(`IS MAIL SENT: ${isMailSent}`);
	if (!isMailSent) {
		if (temperatura < 18) {
			mailOptions.text = `Se registró una temperatura de ${temperatura}ºC en el invernadero, por debajo de los 18ºC necesarios.`;
			mailOptions.subject = "Alerta por límite inferior de temperatura";

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.log(error);
				} else {
					console.log(`Correo enviado por limite inferior`);

					isMailSent = true;
				}
			});
		} else if (temperatura > 22) {
			mailOptions.text = `Se registró una temperatura de ${temperatura}ºC en el invernadero, por encima de los 22ºC máximos.`;
			mailOptions.subject = "Alerta por límite superior de temperatura";

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.log(error);
				} else {
					console.log(`Correo enviado por limite superior`);

					isMailSent = true;
				}
			});
		}
	} else {
		if (temperatura >= 18 && temperatura <= 22) {
			console.log(`CORRECT TEMP, RESTARTING EMAIL FLAG`);
			isMailSent = false;
		}
	}

	let sql = `INSERT INTO datos (id, tiempo, serie, temp, hum, lum) `;
	sql += `VALUES (NULL, '${tiempoActual}', '${data.serie}', ${data.temp}, ${data.hum}, ${data.lum})`;
	con.query(sql, (err) => {
		if (err) {
			try {
				throw err;
			} catch (e) {
				res.status(400).json({
					errorMessage: `Endpoint: ${req.path}. Sucedio un error al recibir: ${e}`,
				});
			}
		} else {
			res.status(200).send("Post hecho correctamente");
		}
	});
});

router.post("/fechaMin", (req, res) => {
	const serie = req.body.serie;
	const sql = `SELECT tiempo FROM datos WHERE serie = '${serie}' LIMIT 1`;
	con.query(sql, (err, result) => {
		if (err) {
			try {
				throw err;
			} catch (e) {
				res.status(400).json({
					errorMessage: `Endpoint: ${req.path}. Sucedio un error: ${e}`,
				});
			}
		} else {
			res.status(200).json(result[0]);
		}
	});
});

router.post("/graph_btn", (req, res) => {
	const num = req.body.periodo;
	const serie = req.body.serie;
	const periodo = obtenerDia(num);
	const tiempoActual = obtenerAhora();
	let sql = `SELECT tiempo, temp, hum, lum FROM datos WHERE serie = '${serie}'`;
	sql += `AND tiempo BETWEEN '${periodo}' AND '${tiempoActual}'`;
	con.query(sql, (err, result) => {
		if (err) {
			try {
				throw err;
			} catch (e) {
				res.status(400).json({
					errorMessage: `Endpoint: ${req.path}. Sucedio un error: ${e}`,
				});
			}
		} else {
			let dataArray = {
				tempArray: [],
				humArray: [],
				lumArray: [],
				timeArray: [],
			};
			const forLength = result.length / num;
			let temporalArray = [];
			for (let i = 0; i < forLength; i++) {
				dataArray.tempArray[i] = result[num * i].temp;
				dataArray.humArray[i] = result[num * i].hum;
				dataArray.lumArray[i] = result[num * i].lum;
				temporalArray[i] = moment(result[num * i].tiempo).format(
					"YYYY-MM-DD HH:mm:ss"
				);
				dataArray.timeArray[i] = moment
					.tz(temporalArray[i], "America/Argentina/Buenos_Aires")
					.format();
			}
			res.status(200).json(dataArray);
		}
	});
});

router.post("/graph_picker", (req, res) => {
	const selectedDate = req.body.date;
	const serie = req.body.serie;
	const diaInic = moment(selectedDate).startOf().format();
	const diaFin = moment(selectedDate).add(1, "days").startOf().format();
	let sql = `SELECT tiempo, temp, hum, lum FROM datos WHERE serie = '${serie}'`;
	sql += `AND tiempo BETWEEN '${diaInic}' AND '${diaFin}'`;
	con.query(sql, (err, result) => {
		if (err) {
			try {
				throw err;
			} catch (e) {
				res.status(400).json({
					errorMessage: `Endpoint: ${req.path}. Sucedio un error: ${e}`,
				});
			}
		} else {
			let dataArray = {
				tempArray: [],
				humArray: [],
				lumArray: [],
				timeArray: [],
			};
			for (let i = 0; i < result.length; i++) {
				dataArray.tempArray[i] = result[i].temp;
				dataArray.humArray[i] = result[i].hum;
				dataArray.lumArray[i] = result[i].lum;
				result[i].tiempo = moment(result[i].tiempo).format(
					"YYYY-MM-DD HH:mm:ss"
				);
				dataArray.timeArray[i] = moment
					.tz(result[i].tiempo, "America/Argentina/Buenos_Aires")
					.format();
			}
			res.status(200).json(dataArray);
		}
	});
});

module.exports = router;
