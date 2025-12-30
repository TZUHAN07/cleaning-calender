const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// ===== 提供前端 =====
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(
  "/images",
  express.static(path.join(__dirname, "..", "public", "images"))
);

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===== Google Sheets 認證 =====
const sheets = google.sheets({ version: "v4", auth });

// ===== 新增案件 =====
app.post("/api/jobs", async (req, res) => {
  try {
    const { date, client_name, hours, hourly_rate, time_slot, address } = req.body;

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
      range: "jobs!A:H",
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
            address || "",
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
      address: address || "",
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
      range: "jobs!A2:H",
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
        address: row[7] || "",
      }))
      .filter((job) => job.date && job.date.startsWith(month));

    console.log(`成功讀取google資料:`, jobs);
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "讀取失敗" });
  }
});

// ===== 更新案件（包含日期、地址等） =====
app.put("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const { date, client_name, hours, hourly_rate, time_slot, address } = req.body;

    // 取得所有資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:H",
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

    // 更新該列資料
    const updateRow = rows[targetRowIndex];
    updateRow[1] = date || updateRow[1];
    updateRow[2] = client_name || updateRow[2];
    updateRow[3] = hours || updateRow[3];
    updateRow[4] = hourly_rate || updateRow[4];
    updateRow[5] = (Number(updateRow[3]) * Number(updateRow[4])) || updateRow[5];
    updateRow[6] = time_slot !== undefined ? time_slot : updateRow[6];
    updateRow[7] = address !== undefined ? address : updateRow[7];

    // 寫回 Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `jobs!A${targetRowIndex + 2}:H${targetRowIndex + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updateRow],
      },
    });

    res.json({
      success: true,
      message: "案件已更新",
      jobId,
      id: jobId,
      date: updateRow[1],
      client_name: updateRow[2],
      hours: updateRow[3],
      hourly_rate: updateRow[4],
      total: updateRow[5],
      time_slot: updateRow[6],
      address: updateRow[7],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "更新失敗" });
  }
});

// 刪除案件 API
app.delete("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "jobs!A2:H",
    });

    const rows = response.data.values || [];

    const rowIndex = rows.findIndex(row => row[0] === jobId);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "找不到該訂單" });
    }

    const sheetRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `jobs!A${sheetRowNumber}:H${sheetRowNumber}`,
    });

    res.json({ success: true });
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