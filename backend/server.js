const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// ===== 提供靜態文件（前端 HTML/CSS/JS）=====
app.use(express.static(path.join(__dirname, "..", "public")));

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===== Google Sheets 認證 =====
const sheets = google.sheets({ version: "v4", auth });

// ===== 建立案件 API =====
app.post("/api/jobs", async (req, res) => {
  try {
    const { date, client_name, hours, hourly_rate } = req.body;

    // 驗證必填欄位
    if (!date || !client_name || !hours || !hourly_rate) {
      return res.status(400).json({
        error: "缺少必填欄位",
        required: ["date", "client_name", "hours", "hourly_rate"],
      });
    }

    const total_price = hours * hourly_rate;

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            Date.now().toString(),
            date,
            client_name,
            hours,
            hourly_rate,
            total_price,
          ],
        ],
      },
    });

    res.json({
      success: true,
      date,
      client_name,
      hours,
      hourly_rate,
      total: total_price,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "寫入失敗" });
  }
});

// API: 讀取當月案件
app.get("/api/jobs", async (req, res) => {
  try {
    const { month } = req.query; 

    if (!month) {
      return res.status(400).json({ error: "缺少 month 參數" });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:F", // 跳過標題列
    });

    const rows = response.data.values || [];

    const jobs = rows
      .map(row => ({
        job_id: row[0],
        date: row[1],
        client_name: row[2],
        hours: Number(row[3]),
        hourly_rate: Number(row[4]),
        total: Number(row[5]),
      }))
      .filter(job => job.date && job.date.startsWith(month));

      console.log(`成功讀取google資料:`, jobs)

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "讀取失敗" });
  }
});


// ===== 伺服器啟動 =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log(`Google Sheet ID: ${process.env.SPREADSHEET_ID}`);
});
