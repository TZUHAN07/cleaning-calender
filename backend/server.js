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

// ===== 新增案件 =====
app.post("/api/jobs", async (req, res) => {
  try {
    const { date, client_name, hours, hourly_rate, time_slot } = req.body;

    // 驗證必填欄位
    if (!date || !client_name || !hours || !hourly_rate) {
      return res.status(400).json({
        error: "缺少必填欄位",
        required: ["date", "client_name", "hours", "hourly_rate"],
      });
    }

    const job_id = Date.now().toString();
    const total_price = hours * hourly_rate;

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            job_id,
            date,
            client_name,
            hours,
            hourly_rate,
            total_price,
            time_slot || "",
          ],
        ],
      },
    });

    res.json({
      success: true,
      id: job_id,
      date,
      client_name,
      hours,
      hourly_rate,
      total: total_price,
      time_slot: time_slot || "",
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
      range: "jobs!A2:G",
    });

    const rows = response.data.values || [];

    const jobs = rows
      .map((row) => ({
        id: row[0],
        date: row[1],
        client_name: row[2],
        hours: Number(row[3]),
        hourly_rate: Number(row[4]),
        total: Number(row[5]),
        time_slot: row[6] || "",
      }))
      .filter((job) => job.date && job.date.startsWith(month));

    console.log(`成功讀取google資料:`, jobs);
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "讀取失敗" });
  }
});

// ===== 更新案件日期（拖移功能） =====
app.put("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "缺少 date 參數" });
    }

    // 取得所有資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:G",
    });

    const rows = response.data.values || [];

    // 找出要更新的列
    let targetRowIndex = -1;
    rows.forEach((row, index) => {
      if (row[0] === jobId) {
        targetRowIndex = index;
      }
    });

    if (targetRowIndex === -1) {
      return res.status(404).json({ error: "找不到案件" });
    }

    // 更新該列的日期
    const updateRow = rows[targetRowIndex];
    updateRow[1] = date;

    // 寫回 Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `jobs!A${targetRowIndex + 2}:G${targetRowIndex + 2}`, // +2 因為跳過標題
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updateRow],
      },
    });

    res.json({
      success: true,
      message: "案件日期已更新",
      jobId,
      newDate: date,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "更新失敗" });
  }
});

// ===== 🆕 刪除案件（額外功能） =====
app.delete("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:G",
    });

    const rows = response.data.values || [];
    let targetRowIndex = -1;

    rows.forEach((row, index) => {
      if (row[0] === jobId) {
        targetRowIndex = index;
      }
    });

    if (targetRowIndex === -1) {
      return res.status(404).json({ error: "找不到案件" });
    }

    // 刪除該列
    rows.splice(targetRowIndex, 1);

    // 重新寫入所有資料
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:G",
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "jobs!A2:G",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rows,
        },
      });
    }

    res.json({
      success: true,
      message: "案件已刪除",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "刪除失敗" });
  }
});

// ===== 伺服器啟動 =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log(`Google Sheet ID: ${process.env.SPREADSHEET_ID}`);
});
