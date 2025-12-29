// ===== 應用物件（命名空間，避免全域污染） =====
window.app = {
  // ===== DOM 參考 =====
  calendar: document.getElementById("calendar"),
  currentMonthEl: document.getElementById("currentMonth"),
  monthTotalEl: document.getElementById("monthTotal"),
  modal: document.getElementById("jobModal"),
  clientName: document.getElementById("clientName"),
  hoursInput: document.getElementById("hoursInput"),
  hourlyRateInput: document.getElementById("hourlyRateInput"),
  totalPriceEl: document.getElementById("totalPriceEl"),
  detailJobsList: document.getElementById("detailJobsList"),
  detailDate: document.getElementById("detailDate"),
  timeSlotGroup: document.getElementById("timeSlotGroup"),

  // ===== 應用狀態 =====
  jobsByDate: {},
  selectedDate: "",
  currentDate: new Date(),
  selectedTimeSlot: "",
  draggedJob: null,

  // ===== 常數 =====
  TIME_SLOTS: ["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00", "19:00-21:00"],

    // ===== 日期格式化 =====
  formatDateKey(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  },

  // ===== 計算總金額 =====
  updateTotalPrice() {
    const hours = Number(this.hoursInput.value) || 0;
    const rate = Number(this.hourlyRateInput.value) || 0;
    this.totalPriceEl.textContent = (hours * rate).toLocaleString();
  },

  // ===== 計算月總收益 =====
  calculateMonthTotal() {
    let total = 0;
    Object.values(this.jobsByDate).forEach(jobs => {
      jobs.forEach(job => {
        total += job.total || 0;
      });
    });
    this.monthTotalEl.textContent = total.toLocaleString();
  },

  // =====拖移開始 =====
  startDrag(event, dateKey, jobIndex) {
    this.draggedJob = {
      fromDate: dateKey,
      jobIndex: jobIndex,
      job: { ...this.jobsByDate[dateKey][jobIndex] }  // 複製案件資料
    };
    event.target.style.opacity = "0.5";  // 半透明表示被拖移
  },

  // ===== 允許放下 =====
  allowDrop(event) {
    event.preventDefault();  // 必須加才能觸發 drop
    event.currentTarget.style.backgroundColor = "#ede9e3";  // 亮起來
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
    event.currentTarget.style.backgroundColor = "";  // 移除亮起
    
    if (!this.draggedJob) return;

    const { fromDate, jobIndex, job } = this.draggedJob;

    // 如果放在同一天就不做什麼
    if (fromDate === toDate) {
      this.draggedJob = null;
      this.renderCalendar(this.currentDate);
      return;
    }

    try {
      //  後端更新案件日期
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: toDate })
      });

      if (!res.ok) throw new Error("更新失敗");

      // ✅ 前端更新資料
      this.jobsByDate[fromDate].splice(jobIndex, 1);  // 從舊日期移除
      
      if (!this.jobsByDate[toDate]) {
        this.jobsByDate[toDate] = [];
      }
      this.jobsByDate[toDate].push(job);  // 加到新日期

      // 重新畫日曆
      this.renderCalendar(this.currentDate);
      this.calculateMonthTotal();

    } catch (err) {
      alert("移動失敗，請稍後重試");
      console.error(err);
    }

    this.draggedJob = null;
  },

  // ===== 初始化時間區塊 =====
  initializeTimeSlots() {
    this.timeSlotGroup.innerHTML = "";
    this.TIME_SLOTS.forEach(slot => {
      const btn = document.createElement("div");
      btn.className = "time-slot";
      btn.textContent = slot;
      btn.onclick = () => {
        document.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected"));
        btn.classList.add("selected");
        this.selectedTimeSlot = slot;
      };
      this.timeSlotGroup.appendChild(btn);
    });
  },


  // ===== 渲染日曆 =====
  renderCalendar(date) {
    this.calendar.innerHTML = "";
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 空白補齊
    for (let i = 0; i < firstDay; i++) {
      this.calendar.appendChild(document.createElement("div"));
    }

    // 渲染日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement("div");
      dayEl.className = "day";

     dayEl.dataset.date = this.formatDateKey(year, month + 1, day);

      let html = `<div class="day-number">${day}</div>`;
      
      const dateKey = this.formatDateKey(year, month + 1, day);
      const jobs = this.jobsByDate[dateKey] || [];
      
      jobs.forEach((job, index) => {
        // 加上 draggable 屬性
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

      // 加上拖移事件監聽
      dayEl.ondragover = (e) => this.allowDrop(e);
      dayEl.ondragleave = (e) => this.dragLeave(e);
      dayEl.ondrop = (e) => this.dropJob(e, dateKey);

      dayEl.addEventListener("click", (e) => {
        if (e.target.classList.contains("job-item")) return;  // 不要點到案件時跳頁
        this.selectedDate = dateKey;
        this.goToDetail(dateKey);
      });

      this.calendar.appendChild(dayEl);
    }

    this.calculateMonthTotal();
  },

  // ===== 頁面切換：去詳情頁 =====
  goToDetail(dateKey) {
    document.getElementById("calendarPage").classList.remove("active");
    document.getElementById("detailPage").classList.add("active");
    this.detailDate.textContent = dateKey;
    this.renderDetailJobs(dateKey);
  },

  // ===== 頁面切換：返回日曆 =====
  goToCalendar() {
    document.getElementById("detailPage").classList.remove("active");
    document.getElementById("calendarPage").classList.add("active");
  },

  // ===== 渲染詳情頁的案件 =====
  renderDetailJobs(dateKey) {
    this.detailJobsList.innerHTML = "";
    const jobs = this.jobsByDate[dateKey] || [];

    if (jobs.length === 0) {
      this.detailJobsList.innerHTML = '<div class="no-jobs-message">此日期尚無案件</div>';
      return;
    }

    let totalHours = 0;
    let totalAmount = 0;

    jobs.forEach(job => {
      totalHours += job.hours || 0;
      totalAmount += job.total || 0;

      const card = document.createElement("div");
      card.className = "job-detail-card";
      card.innerHTML = `
        <div class="job-client">${job.client}</div>
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
  },

  // ===== 開啟新增案件模態框 =====
  openAddJobModal() {
    this.initializeTimeSlots();
    this.selectedTimeSlot = "";
    this.modal.classList.add("active");
    this.clientName.focus();
  },

  // ===== 關閉模態框 =====
  closeModal() {
    this.modal.classList.remove("active");
    this.clientName.value = "";
    this.hoursInput.value = "";
    this.hourlyRateInput.value = "";
    this.totalPriceEl.textContent = "0";
    this.selectedTimeSlot = "";
  },

  // ===== 保存案件 =====
  async saveJob(event) {
    event.preventDefault();

    const payload = {
      date: this.selectedDate,
      client_name: this.clientName.value,
      hours: Number(this.hoursInput.value),
      hourly_rate: Number(this.hourlyRateInput.value),
      time_slot: this.selectedTimeSlot,
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
        timeSlot: this.selectedTimeSlot,
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

      Object.keys(this.jobsByDate).forEach(key => delete this.jobsByDate[key]);

      jobs.forEach(job => {
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
    // 月份切換事件
    document.getElementById("prevMonth").addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar(this.currentDate);
      this.loadJobsFromServer();
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar(this.currentDate);
      this.loadJobsFromServer();
    });

    // 時數和時價輸入事件
    this.hoursInput.addEventListener("input", () => this.updateTotalPrice());
    this.hourlyRateInput.addEventListener("input", () => this.updateTotalPrice());

    // 初始化
    this.renderCalendar(this.currentDate);
    this.loadJobsFromServer();
  }
};

// ===== 頁面載入完成後初始化應用 =====
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});