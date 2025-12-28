const calendar = document.getElementById("calendar");
const currentMonthEl = document.getElementById("currentMonth");
const modal = document.getElementById("jobModal");
const clientName = document.getElementById("clientName");
const hoursInput = document.getElementById("hoursInput");
const hourlyRateInput = document.getElementById("hourlyRateInput");
const totalPriceEl = document.getElementById("totalPriceEl");
const detailJobsList = document.getElementById("detailJobsList");
const detailDate = document.getElementById("detailDate");

const jobsByDate = {};
let selectedDate = "";
let currentDate = new Date();

// ===== 日期格式化 =====
function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

// ===== 更新總價 =====
function updateTotalPrice() {
  const hours = Number(hoursInput.value) || 0;
  const rate = Number(hourlyRateInput.value) || 0;
  totalPriceEl.textContent = (hours * rate).toLocaleString();
}

hoursInput.addEventListener("input", updateTotalPrice);
hourlyRateInput.addEventListener("input", updateTotalPrice);

// ===== 渲染日曆 =====
function renderCalendar(date) {
  calendar.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();

  currentMonthEl.textContent = `${year} 年 ${month + 1} 月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 空白補齊
  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  // 渲染日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    const dateKey = formatDateKey(year, month + 1, day);
    dayEl.dataset.date = dateKey;
    dayEl.dataset.day = day;

    let html = `<div class="day-number">${day}</div>`;
    const jobs = jobsByDate[dateKey] || [];
    jobs.forEach((job) => {
      html += `<div class="job-item">${job.client} $${job.total}</div>`;
    });

    dayEl.innerHTML = html;

    // ===== 點擊進入詳情頁 =====
    dayEl.addEventListener("click", () => {
      selectedDate = dateKey;
      goToDetail(dateKey);
    });

    calendar.appendChild(dayEl);
  }
}

// ===== 頁面切換：去詳情頁 =====
function goToDetail(dateKey) {
  document.getElementById("calendarPage").classList.remove("active");
  document.getElementById("detailPage").classList.add("active");
  detailDate.textContent = dateKey;
  renderDetailJobs(dateKey);
}

// ===== 頁面切換：返回日曆 =====
function goToCalendar() {
  document.getElementById("detailPage").classList.remove("active");
  document.getElementById("calendarPage").classList.add("active");
}

// ===== 渲染詳情頁的案件 =====
function renderDetailJobs(dateKey) {
  detailJobsList.innerHTML = "";
  const jobs = jobsByDate[dateKey] || [];

  if (jobs.length === 0) {
    detailJobsList.innerHTML =
      '<div class="no-jobs-message">此日期尚無案件</div>';
    return;
  }

  let totalHours = 0;
  let totalAmount = 0;

  jobs.forEach((job) => {
    totalHours += job.hours || 0;
    totalAmount += job.total || 0;

    const card = document.createElement("div");
    card.className = "job-detail-card";
    card.innerHTML = `
          <div class="job-client">${job.client}</div>
          <div class="job-info">
            <div class="job-info-item">
              <span class="job-info-label">工作時數</span>
              <span class="job-info-value">${job.hours || 0} 小時</span>
            </div>
            <div class="job-info-item">
              <span class="job-info-label">時價</span>
              <span class="job-info-value">$${job.hourly_rate || 0}</span>
            </div>
          </div>
          <div class="job-total">總金額：$${job.total.toLocaleString()}</div>
        `;
    detailJobsList.appendChild(card);
  });

  // 新增摘要
  const summary = document.createElement("div");
  summary.className = "summary";
  summary.innerHTML = `
        <div class="summary-item">
          <div class="summary-label">當日總時數</div>
          <div class="summary-value">${totalHours} 小時</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">當日總金額</div>
          <div class="summary-value">$${totalAmount.toLocaleString()}</div>
        </div>
      `;
  detailJobsList.appendChild(summary);
}

// ===== 開啟新增案件模態框 =====
function openAddJobModal() {
  modal.classList.add("active");
  clientName.focus();
}

// ===== 關閉模態框 =====
function closeModal() {
  modal.classList.remove("active");
  clientName.value = "";
  hoursInput.value = "";
  hourlyRateInput.value = "";
  totalPriceEl.textContent = "0";
}

// ===== 保存案件 =====
async function saveJob(event) {
  event.preventDefault();

  const payload = {
    date: selectedDate,
    client_name: clientName.value,
    hours: Number(hoursInput.value),
    hourly_rate: Number(hourlyRateInput.value),
  };

  if (!payload.client_name || !payload.hours || !payload.hourly_rate) {
    alert("請填寫完整資訊");
    return;
  }

  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("儲存失敗");

    const savedJob = await res.json();

    if (!jobsByDate[selectedDate]) {
      jobsByDate[selectedDate] = [];
    }

    jobsByDate[selectedDate].push({
      client: savedJob.client_name,
      total: savedJob.total,
      hours: savedJob.hours,
      hourly_rate: savedJob.hourly_rate,
    });

    renderCalendar(currentDate);
    renderDetailJobs(selectedDate);
    closeModal();
  } catch (err) {
    alert("存檔失敗，請確認後端是否啟動");
    console.error(err);
  }
}

// ===== 月份切換 =====
document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
  loadJobsFromServer();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
  loadJobsFromServer();
});

// ===== 從伺服器載入案件 =====
async function loadJobsFromServer() {
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}-${month}`;

  try {
    const res = await fetch(`/api/jobs?month=${monthKey}`);
    const jobs = await res.json();

    if (!Array.isArray(jobs)) return;

    Object.keys(jobsByDate).forEach((key) => delete jobsByDate[key]);

    jobs.forEach((job) => {
      if (!jobsByDate[job.date]) {
        jobsByDate[job.date] = [];
      }
      jobsByDate[job.date].push({
        client: job.client_name,
        total: job.total,
        hours: job.hours,
        hourly_rate: job.hourly_rate,
      });
    });

    renderCalendar(currentDate);
  } catch (err) {
    console.error("讀取案件失敗", err);
  }
}

// ===== 初始化 =====
renderCalendar(currentDate);
loadJobsFromServer();
