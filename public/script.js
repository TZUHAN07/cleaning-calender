const calendar = document.getElementById("calendar");
const currentMonthEl = document.getElementById("currentMonth");
const modal = document.getElementById("jobModal");
const closeModalBtn = document.getElementById("closeModal");
const saveJobBtn = document.getElementById("saveJob");
const clientName = document.getElementById("clientName");
const hoursInput = document.getElementById("hours");
const hourlyRateInput = document.getElementById("hourlyRate");
const totalPriceEl = document.getElementById("totalPrice");

const jobsByDate = {};
let selectedDate = "";
let currentDate = new Date();

function updateTotalPrice() {
  const hours = Number(hoursInput.value) || 0;
  const rate = Number(hourlyRateInput.value) || 0;
  totalPriceEl.textContent = hours * rate;
}

hoursInput.addEventListener("input", updateTotalPrice);
hourlyRateInput.addEventListener("input", updateTotalPrice);

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

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    const dateKey = `${year}-${month + 1}-${day}`;
    dayEl.dataset.date = dateKey;
    dayEl.dataset.day = day;

    dayEl.innerHTML = `<div class="day-number">${day}</div>`;

    dayEl.addEventListener("click", () => {
      selectedDate = `${year}-${month + 1}-${day}`;
      modal.classList.remove("hidden");
    });

    calendar.appendChild(dayEl);
  }
}

renderCalendar(currentDate);
loadJobsFromServer();

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

saveJobBtn.addEventListener("click", async () => {
  // 檢查資料抓取是否正常
  const payload = {
    date: selectedDate,
    client_name: clientName.value,
    hours: Number(hoursInput.value),
    hourly_rate: Number(hourlyRateInput.value),
  };

  if (!payload.date || !payload.client_name || !payload.hours || !payload.hourly_rate) {
    alert("請填寫完整資訊");
    return;
  }

  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("後端回傳錯誤:", errorData);
      throw new Error("儲存失敗");
    }

    const savedJob = await res.json(); // 後端回傳含 total 的資料

    if (!jobsByDate[selectedDate]) {
      jobsByDate[selectedDate] = [];
    }

    jobsByDate[selectedDate].push({
      client: savedJob.client_name,
      total: savedJob.total,
    });

    renderJobs();
    modal.classList.add("hidden");
    alert("同步成功！");
  } catch (err) {
    alert("存檔失敗，請確認後端是否啟動");
    console.error(err);
  }
});

function renderJobs() {
  document.querySelectorAll(".day").forEach((dayEl) => {
    const date = dayEl.dataset.date;
    const jobs = jobsByDate[date] || [];

    let html = `<div class="day-number">${dayEl.dataset.day}</div>`;
    jobs.forEach((job) => {
      html += `<div class="job-item">${job.client} $${job.total}</div>`;
    });

    dayEl.innerHTML = html;
  });
}

async function loadJobsFromServer() {
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}-${month}`;

  try {
    const res = await fetch(`/api/jobs?month=${monthKey}`);
    const jobs = await res.json();

    jobs.forEach(job => {
      if (!jobsByDate[job.date]) {
        jobsByDate[job.date] = [];
      }

      jobsByDate[job.date].push({
        client: job.client_name,
        total: job.total,
      });
    });

    renderJobs();
  } catch (err) {
    console.error("讀取案件失敗", err);
  }
}
