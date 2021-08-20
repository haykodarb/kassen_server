const express = require("express");
const jwt = require("jsonwebtoken");
const verify = require("../tools/tokenVerify");
const cookieParser = require("cookie-parser");

const router = express.Router();

router.use(cookieParser());

router.get("/", verify, (req, res) => {
	console.log(`User has token ${req.cookies.token}`);
	let data = jwt.verify(req.cookies.token, process.env.TOKEN_SECRET);
	res.render("dashboard", {
		serie: data.serie,
	});
});

module.exports = router;
