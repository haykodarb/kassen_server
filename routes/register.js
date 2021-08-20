const express = require("express");
const Joi = require("@hapi/joi");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const randomize = require("../tools/randomize");

const router = express.Router();

router.use(express.json());
router.use(cookieParser());
router.use(express.urlencoded({ extended: true }));

let salt = bcrypt.genSaltSync(10);

let con = mysql.createPool({
	connectionLimit: 4,
	host: process.env.MYSQL_DB_HOST,
	user: process.env.MYSQL_DB_USER,
	password: process.env.MYSQL_DB_PASS,
	database: process.env.MYSQL_DB_NAME,
});

const registerSchema = Joi.object({
	username: Joi.string().min(6).alphanum().required(),
	email: Joi.string().min(10).required().email(),
	password: Joi.string().min(6).alphanum().required(),
});

function obtenerTiempo() {
	let now = moment().tz("America/Argentina/Buenos_Aires").format();
	return now;
}

router.get("/", (req, res) => {
	let token = req.cookies.token;
	if (!token) {
		return res.render("register");
	}
	try {
		let data = jwt.verify(token, process.env.TOKEN_SECRET);
		return res.redirect("./dashboard");
	} catch {
		return res.render("register");
	}
});

router.post("/", (req, res) => {
	let hassedPass = bcrypt.hashSync(req.body.password, salt);
	let user = {
		username: req.body.username,
		email: req.body.email,
		password: hassedPass,
		date: obtenerTiempo(),
	};
	const { error } = registerSchema.validate(req.body);
	if (error) {
		let err = error.details[0].message;
		res.render("register", {
			err: err,
		});
	} else {
		let sqlVerify = `SELECT username, email FROM users WHERE email = '${user.email}' OR username = '${user.username}'`;
		con.query(sqlVerify, (err, result) => {
			if (err) {
				return res.render("register", {
					err: `Error con la conexión a la base de datos: ${e}`,
				});
			} else {
				if (result[0]) {
					let error = "Este usuario o email ya está siendo utilizado";
					res.render("register", {
						err: error,
					});
				} else {
					let serie = randomize(8);
					let sqlCreate = `INSERT INTO users (id, date, serie, username, email, password) `;
					sqlCreate += `VALUES (NULL, '${user.date}', '${serie}', '${user.username}', '${user.email}', '${user.password}')`;
					con.query(sqlCreate, (err) => {
						if (err) {
							res.render("register", {
								err: `Error con la conexión a la base de datos: ${e}`,
							});
						} else {
							res.render("register", {
								err: `Su usuario fue creado correctamente. Su código individual es "${serie}", por favor ingreselo junto con sus credenciales de WiFi en su dispositivo.`,
							});
						}
					});
				}
			}
		});
	}
});

module.exports = router;
