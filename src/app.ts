import express, { Request, Response } from 'express';
import sqlite3, { Database } from 'better-sqlite3';
import multer from "multer";
import path from 'path';

const PORT = process.env.KASSEN_PORT;

const db: Database = new sqlite3("./database.db");

const storage = multer.diskStorage({
	destination: "./uploads",
	filename: (_, file, cb) => {
		const uniqueName =
			Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
		cb(null, uniqueName);
	},
});

const upload = multer({ storage });

db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   INTEGER NOT NULL,
      sensor_id   TEXT NOT NULL,
      temperature REAL NOT NULL,
      humidity    REAL NOT NULL
    )
  `);

db.exec(`
    CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   INTEGER NOT NULL,
      sensor_id   TEXT NOT NULL,
      image_path  TEXT NOT NULL
    )
  `);

const app = express();

app.use(express.json()); // For parsing JSON bodies
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

// POST endpoint to handle temperature data
app.post('/temp', (req: Request, res: Response) => {
	try {
		// Validate request body
		console.log(req.body);
		if (!req.body || typeof req.body.temperature !== 'number') {
			return res.status(400).json({
				error: 'Invalid request. Please provide a numeric temperature value in JSON format.',
				example: { "temperature": 22.5 }
			});
		}

		const temperature = req.body.temperature;
		const timestamp = new Date().toISOString();

		// Send success response
		res.status(200).json({
			message: 'Temperature logged successfully',
			temperature: temperature,
			timestamp: timestamp
		});
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post("/upload", upload.single("image"), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

	const { filename, path: filePath } = req.file;
	const uploadedAt = Date.now();

	let stmt = db.prepare(
		`INSERT INTO images (timestamp, sensor_id, image_path) VALUES (?, ?, ?)`,
	);


	stmt.run(uploadedAt, "SENSOR", filePath);

	res.json({
		message: "File uploaded successfully",
		filename,
		path: filePath,
	});
});

app.get("/images", (req, res) => {
	try {
		const stmt = db.prepare("SELECT id, timestamp, sensor_id, image_path FROM images ORDER BY timestamp DESC");
		const rows = stmt.all();
		res.json(rows);
	} catch (err) {
		console.error("Error fetching images:", err);
		res.status(500).json({ error: "Failed to fetch images" });
	}
});

app.use(express.static('uploads'));

// Start the server
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log('Ready to receive temperature data at POST /temperature');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\nShutting down server...');
	process.exit(0);
});
