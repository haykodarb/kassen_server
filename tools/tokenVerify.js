const jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");

const router = express.Router();

router.use(cookieParser());

module.exports = function verify(req, res, next) {
	if (typeof req.cookies === "undefined") {
		return res.redirect("./login");
	} else {
		const token = req.cookies.token;
		jwt.verify(token, process.env.TOKEN_SECRET, function (err, decoded) {
			console.log(err);
			console.log(decoded);

			if (typeof decoded === "undefined") {
				res.redirect("./login");
			} else {
				next();
			}
		});
	}
};
