require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

app.get("/", (req, res) => {
  res.send("清潔接案系統 API 啟動中");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

app.post("/api/jobs", async (req, res) => {
  try {
    const { date, client_name, hours, hourly_rate } = req.body;
    const total_price = hours * hourly_rate;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          Date.now().toString(),
          date,
          client_name,
          hours,
          hourly_rate,
          total_price
        ]]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "寫入失敗" });
  }
});
