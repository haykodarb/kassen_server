//Modules
require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const cors = require("cors");
const chalk = require("chalk");
const http = require("http").createServer(app);

let port = process.env.SERVER_PORT;

//Server config
http.listen(port, () => {
	console.log(chalk.green(`Listening on port: ${port}`));
});

//Routes
const api = require("./routes/api");
const dashboard = require("./routes/dashboard");
const login = require("./routes/login");
const register = require("./routes/register");
const verify = require("./tools/tokenVerify");

//Middleware
app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use("/api", api);
app.use("/dashboard", dashboard);
app.use("/login", login);
app.use("/register", register);

//Views config
app.set("views", "./public/views");
app.set("view engine", "ejs");

app.get("/", verify, (req, res) => {
	res.redirect("./dashboard");
});

app.get("/ping", (req, res) => {
	res.status(200).send("PING");
});
