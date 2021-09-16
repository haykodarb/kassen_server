const express = require("express");
const mysql = require("mysql");
const moment = require("moment-timezone");

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
