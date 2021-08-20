const verify = require("../tools/tokenVerify");
const express = require("express");
const Joi = require("@hapi/joi");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const randomize = require("../tools/randomize");

const router = express.Router();
router.use(cookieParser());
router.use(express.urlencoded({ extended: true }));

let salt = bcrypt.genSaltSync(10);
var farFuture = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 10);

let con = mysql.createPool({
	connectionLimit: 4,
	host: process.env.MYSQL_DB_HOST,
	user: process.env.MYSQL_DB_USER,
	password: process.env.MYSQL_DB_PASS,
	database: process.env.MYSQL_DB_NAME,
});

const userSchema = Joi.object({
	username: Joi.string().min(6).required(),
	password: Joi.string().min(6).required(),
});

router.get("/", (req, res) => {
	if (!req.cookies) {
		return res.render("login");
	} else if (!req.cookies.token) {
		return res.render("login");
	} else {
		try {
			const token = req.cookies.token;
			let data = jwt.verify(token, process.env.TOKEN_SECRET);
			res.redirect("./dashboard");
		} catch {
			return res.render("login");
		}
	}
});

router.post("/", (req, res) => {
	let user = {
		username: req.body.username,
		password: req.body.password,
	};
	const { error } = userSchema.validate(req.body);
	if (error) {
		let err = error.details[0].message;
		return res.render("login", {
			err: err,
		});
	} else {
		let sqlVerify = `SELECT serie, password FROM users WHERE username = '${user.username}'`;
		con.query(sqlVerify, (err, result) => {
			if (err) {
				return res.render("login", {
					err: `Error con la conexión a la base de datos: ${err}`,
				});
			} else {
				if (result[0]) {
					let validPass = bcrypt.compareSync(user.password, result[0].password);
					if (!validPass) {
						let error = "La contraseña ingresada es incorrecta ";
						return res.render("login", {
							err: error,
						});
					} else {
						const token = jwt.sign(
							{ username: user.username, serie: result[0].serie },
							process.env.TOKEN_SECRET
						);
						res.cookie("token", token, {
							expires: farFuture,
							secure: true,
						});
						res.redirect("../dashboard");
					}
				} else {
					let error = "El usuario ingresado no existe";
					return res.render("login", {
						err: error,
					});
				}
			}
		});
	}
});

module.exports = router;
