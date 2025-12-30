// ===== 應用物件（命名空間，避免全域污染） =====
window.app = {
  // ===== DOM 參考 =====
  calendar: document.getElementById("calendar"),
  monthTotalEl: document.getElementById("monthTotal"),
  modal: document.getElementById("jobModal"),
  clientName: document.getElementById("clientName"),
  startPeriod: document.getElementById("startPeriod"),
  startHour: document.getElementById("startHour"),
  startMin: document.getElementById("startMin"),
  endPeriod: document.getElementById("endPeriod"),
  endHour: document.getElementById("endHour"),
  endMin: document.getElementById("endMin"),
  estimatedHours: document.getElementById("estimatedHours"),
  hoursInput: document.getElementById("hoursInput"),
  hourlyRateInput: document.getElementById("hourlyRateInput"),
  totalPriceEl: document.getElementById("totalPriceEl"),
  detailJobsList: document.getElementById("detailJobsList"),
  detailDate: document.getElementById("detailDate"),

  // ===== 應用狀態 =====
  jobsByDate: {},
  selectedDate: "",
  currentDate: new Date(),
  draggedJob: null,

  // ===== 日期格式化 =====
  formatDateKey(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  },

  // ===== 計算工作時數 =====
  calculateHours() {
    const startH = Number(this.startHour.value);
    const startM = Number(this.startMin.value);
    const endH = Number(this.endHour.value);
    const endM = Number(this.endMin.value);

    if (!this.startHour.value || !this.endHour.value) {
      this.estimatedHours.textContent = "0";
      return;
    }

    const startTotalMin = startH * 60 + startM;
    const endTotalMin = endH * 60 + endM;

    let diffMin = endTotalMin - startTotalMin;

    // 跨越午夜的情況（例如 23:00 到 02:00）
    if (diffMin < 0) {
      diffMin += 24 * 60;
    }

    const hours = (diffMin / 60).toFixed(1);
    this.estimatedHours.textContent = hours;
    this.hoursInput.value = hours;
    this.updateTotalPrice();
  },

  // ===== 設定預設價格 =====
  setPresetPrice(price, btnEl) {
    this.hourlyRateInput.value = price;

    // 更新按鈕狀態
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    btnEl.classList.add("active");
    this.updateTotalPrice();
  },

  // ===== 更新總金額 =====
  updateTotalPrice() {
    const hours = Number(this.hoursInput.value) || 0;
    const rate = Number(this.hourlyRateInput.value) || 0;
    this.totalPriceEl.textContent = (hours * rate).toLocaleString();
  },

  // ===== 計算月總收益 =====
  calculateMonthTotal() {
    let total = 0;
    Object.values(this.jobsByDate).forEach((jobs) => {
      jobs.forEach((job) => {
        total += job.total || 0;
      });
    });
    this.monthTotalEl.textContent = total.toLocaleString();
  },

  // ===== 拖移開始 =====
  startDrag(event, dateKey, jobIndex) {
    this.draggedJob = {
      fromDate: dateKey,
      jobIndex: jobIndex,
      job: { ...this.jobsByDate[dateKey][jobIndex] },
    };
    event.target.style.opacity = "0.5";
  },

  // ===== 允許放下 =====
  allowDrop(event) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = "#ede9e3";
  },

  // ===== 移出時移除亮起 =====
  dragLeave(event) {
    if (event.currentTarget === event.target) {
      event.currentTarget.style.backgroundColor = "";
    }
  },

  // ===== 放下案件 =====
  async dropJob(event, toDate) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = "";

    if (!this.draggedJob) return;

    const { fromDate, jobIndex, job } = this.draggedJob;

    if (fromDate === toDate) {
      this.draggedJob = null;
      this.renderCalendar(this.currentDate);
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: toDate }),
      });

      if (!res.ok) throw new Error("更新失敗");

      // 前端更新資料
      this.jobsByDate[fromDate].splice(jobIndex, 1);

      if (!this.jobsByDate[toDate]) {
        this.jobsByDate[toDate] = [];
      }
      this.jobsByDate[toDate].push(job);

      this.renderCalendar(this.currentDate);
      this.calculateMonthTotal();
    } catch (err) {
      alert("移動失敗，請稍後重試");
      console.error(err);
    }

    this.draggedJob = null;
  },

  // ===== 畫日曆 =====
  renderCalendar(date) {
    this.calendar.innerHTML = "";
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 補空白
    for (let i = 0; i < firstDay; i++) {
      this.calendar.appendChild(document.createElement("div"));
    }

    // 畫日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement("div");
      dayEl.className = "day";

      dayEl.dataset.date = this.formatDateKey(year, month + 1, day);

      let html = `<div class="day-number">${day}</div>`;

      const dateKey = this.formatDateKey(year, month + 1, day);
      const jobs = this.jobsByDate[dateKey] || [];

      jobs.forEach((job, index) => {
        html += `
          <div class="job-item" 
               draggable="true"
               ondragstart="window.app.startDrag(event, '${dateKey}', ${index})"
               ondragend="window.app.draggedJob = null; this.style.opacity = '1';"
               data-job-index="${index}">
            ${job.client} $${job.total}
          </div>
        `;
      });

      dayEl.innerHTML = html;

      // 拖移事件監聽
      dayEl.ondragover = (e) => this.allowDrop(e);
      dayEl.ondragleave = (e) => this.dragLeave(e);
      dayEl.ondrop = (e) => this.dropJob(e, dateKey);

      dayEl.addEventListener("click", (e) => {
        if (e.target.classList.contains("job-item")) return;
        this.selectedDate = dateKey;
        this.goToDetail(dateKey);
      });

      this.calendar.appendChild(dayEl);
    }

    this.calculateMonthTotal();
  },

  // ===== 跳到詳情頁 =====
  goToDetail(dateKey) {
    document.getElementById("calendarPage").classList.remove("active");
    document.getElementById("detailPage").classList.add("active");
    this.detailDate.textContent = dateKey;
    this.renderDetailJobs(dateKey);
  },

  // ===== 回到日曆 =====
  goToCalendar() {
    document.getElementById("detailPage").classList.remove("active");
    document.getElementById("calendarPage").classList.add("active");
  },

  // ===== 畫詳情頁案件 =====
  renderDetailJobs(dateKey) {
    this.detailJobsList.innerHTML = "";
    const jobs = this.jobsByDate[dateKey] || [];

    if (jobs.length === 0) {
      this.detailJobsList.innerHTML =
        '<div class="no-jobs-message">此日期尚無案件</div>';
      return;
    }

    let totalHours = 0;
    let totalAmount = 0;

    jobs.forEach((job, jobIndex) => {
      totalHours += job.hours || 0;
      totalAmount += job.total || 0;

      const card = document.createElement("div");
      card.className = "job-detail-card";
      card.innerHTML = `
        <div class="job-card-header">
          <div class="job-client">${job.client}</div>
          <button class="btn-delete-job" data-date="${dateKey}" data-index="${jobIndex}" title="刪除案件">✕</button>
        </div>
        <div class="job-info">
          <div class="job-info-item">
            <span class="job-info-label">時間區塊</span>
            <span class="job-info-value">${job.timeSlot || "-"}</span>
          </div>
          <div class="job-info-item">
            <span class="job-info-label">工作時數</span>
            <span class="job-info-value">${job.hours || 0} 小時</span>
          </div>
        </div>
        <div class="job-info">
          <div class="job-info-item">
            <span class="job-info-label">時價</span>
            <span class="job-info-value">$${job.hourly_rate || 0}</span>
          </div>
        </div>
        <div class="job-total">總金額：$${job.total.toLocaleString()}</div>
      `;
      this.detailJobsList.appendChild(card);
    });

    // 摘要
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
    this.detailJobsList.appendChild(summary);

    // 綁定刪除按鈕事件
    document.querySelectorAll(".btn-delete-job").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const date = btn.dataset.date;
        const index = Number(btn.dataset.index);
        this.deleteJob(date, index);
      });
    });
  },

  // ===== 開啟新增模態框 =====
  openAddJobModal() {
    // 重置表單
    this.clientName.value = "";
    this.startPeriod.value = "am";
    this.startHour.value = "";
    this.startMin.value = "00";
    this.endPeriod.value = "am";
    this.endHour.value = "";
    this.endMin.value = "00";
    this.hoursInput.value = "";
    this.hourlyRateInput.value = "";
    this.totalPriceEl.textContent = "0";
    this.estimatedHours.textContent = "0";

    // 重置按鈕狀態
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    this.modal.classList.add("active");
    this.clientName.focus();
  },

   // ===== 刪除案件 =====
  async deleteJob(dateKey, jobIndex) {
    if (!confirm("確定要刪除此案件嗎？")) {
      return;
    }

    const job = this.jobsByDate[dateKey][jobIndex];

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("刪除失敗");

      // 前端刪除資料
      this.jobsByDate[dateKey].splice(jobIndex, 1);

      // 如果該日期沒有案件了，刪除該日期的鍵
      if (this.jobsByDate[dateKey].length === 0) {
        delete this.jobsByDate[dateKey];
      }

      // 重新渲染
      this.renderDetailJobs(dateKey);
      this.renderCalendar(this.currentDate);
      this.calculateMonthTotal();
    } catch (err) {
      alert("刪除失敗，請稍後重試");
      console.error(err);
    }
  },


  // ===== 關閉模態框 =====
  closeModal() {
    this.modal.classList.remove("active");
  },

  // ===== 儲存案件 =====
  async saveJob(event) {
    event.preventDefault();

    const startTimeStr = `${String(this.startHour.value).padStart(2, "0")}:${this.startMin.value}`;
    const endTimeStr = `${String(this.endHour.value).padStart(2, "0")}:${this.endMin.value}`;

    const payload = {
      date: this.selectedDate,
      client_name: this.clientName.value,
      hours: Number(this.hoursInput.value),
      hourly_rate: Number(this.hourlyRateInput.value),
      time_slot: `${startTimeStr}～${endTimeStr}`,
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

      if (!this.jobsByDate[this.selectedDate]) {
        this.jobsByDate[this.selectedDate] = [];
      }

      this.jobsByDate[this.selectedDate].push({
        id: savedJob.id,
        client: savedJob.client_name,
        total: savedJob.total,
        hours: savedJob.hours,
        hourly_rate: savedJob.hourly_rate,
        timeSlot: payload.time_slot,
      });

      this.renderCalendar(this.currentDate);
      this.renderDetailJobs(this.selectedDate);
      this.closeModal();
    } catch (err) {
      alert("存檔失敗，請確認後端是否啟動");
      console.error(err);
    }
  },

  // ===== 從伺服器載入案件 =====
  async loadJobsFromServer() {
    const year = this.currentDate.getFullYear();
    const month = String(this.currentDate.getMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${month}`;

    try {
      const res = await fetch(`/api/jobs?month=${monthKey}`);
      const jobs = await res.json();

      if (!Array.isArray(jobs)) return;

      Object.keys(this.jobsByDate).forEach(
        (key) => delete this.jobsByDate[key]
      );

      jobs.forEach((job,jobIndex) => {
        if (!this.jobsByDate[job.date]) {
          this.jobsByDate[job.date] = [];
        }
        this.jobsByDate[job.date].push({
          id: job.id,
          client: job.client_name,
          total: job.total,
          hours: job.hours,
          hourly_rate: job.hourly_rate,
          timeSlot: job.time_slot || "-",
        });
      });

      this.renderCalendar(this.currentDate);
    } catch (err) {
      console.error("讀取案件失敗", err);
    }
  },

  // ===== 初始化應用 =====
  init() {
    // 更新年月選擇器
    const updateYearMonthSelector = () => {
      const yearInput = document.getElementById("yearInput");
      const monthInput = document.getElementById("monthInput");
      if (yearInput) yearInput.value = this.currentDate.getFullYear();
      if (monthInput) monthInput.value = this.currentDate.getMonth();
    };
    // 月份切換事件
    document.getElementById("prevMonth").addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      updateYearMonthSelector();
      this.renderCalendar(this.currentDate);
      this.loadJobsFromServer();
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      updateYearMonthSelector();
      this.renderCalendar(this.currentDate);
      this.loadJobsFromServer();
    });

    // 年月選擇器事件
    const yearInput = document.getElementById("yearInput");
    const monthInput = document.getElementById("monthInput");

    if (yearInput) {
      yearInput.addEventListener("change", () => {
        const year = Number(yearInput.value);
        const month = Number(monthInput.value);
        this.currentDate = new Date(year, month, 1);
        this.renderCalendar(this.currentDate);
        this.loadJobsFromServer();
      });
    }

    if (monthInput) {
      monthInput.addEventListener("change", () => {
        const year = Number(yearInput.value);
        const month = Number(monthInput.value);
        this.currentDate = new Date(year, month, 1);
        this.renderCalendar(this.currentDate);
        this.loadJobsFromServer();
      });
    }

    // 時數和時價輸入事件
    this.hoursInput.addEventListener("input", () => this.updateTotalPrice());
    this.hourlyRateInput.addEventListener("input", () =>
      this.updateTotalPrice()
    );

    // 時間輸入事件 - 確保這些元素存在
    if (this.startPeriod) {
      this.startPeriod.addEventListener("change", () => this.calculateHours());
    }
    if (this.startHour) {
      this.startHour.addEventListener("input", () => this.calculateHours());
    }
    if (this.startMin) {
      this.startMin.addEventListener("change", () => this.calculateHours());
    }
    if (this.endPeriod) {
      this.endPeriod.addEventListener("change", () => this.calculateHours());
    }
    if (this.endHour) {
      this.endHour.addEventListener("input", () => this.calculateHours());
    }
    if (this.endMin) {
      this.endMin.addEventListener("change", () => this.calculateHours());
    }

    // 預設價格按鈕事件
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.setPresetPrice(btn.dataset.price, btn);
      });
    });

    // 初始化
    updateYearMonthSelector();
    this.renderCalendar(this.currentDate);
    this.loadJobsFromServer();
  },
};

// ===== 頁面載入完成後初始化應用 =====
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});