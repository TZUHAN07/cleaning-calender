require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// ===== 提供靜態文件（前端 HTML/CSS/JS）=====
app.use(express.static(path.join(__dirname, "..", "public")));

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===== Google Sheets 認證 =====
const sheets = google.sheets({ version: "v4", auth });

app.get("/", (req, res) => {
  res.send("清潔接案系統 API 啟動中");
});

// ===== 建立案件 API =====
app.post("/api/jobs", async (req, res) => {
  try {
    console.log("收到 /api/jobs", req.body);

    const { date, client_name, hours, hourly_rate } = req.body;

    // 驗證必填欄位
    if (!date || !client_name || !hours || !hourly_rate) {
      console.warn("缺少必填欄位");
      return res.status(400).json({
        error: "缺少必填欄位",
        required: ["date", "client_name", "hours", "hourly_rate"],
      });
    }

    const total_price = hours * hourly_rate;

    console.log("spreadsheetId =", process.env.SPREADSHEET_ID);

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

    console.log("Google Sheets 寫入成功：", response.data);

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

// ===== 伺服器啟動 =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log(`Google Sheet ID: ${process.env.SPREADSHEET_ID}`);
});
