const calendar = document.getElementById("calendar");
const currentMonthEl = document.getElementById("currentMonth");
const modal = document.getElementById("jobModal");
const closeModalBtn = document.getElementById("closeModal");
const saveJobBtn = document.getElementById("saveJob");
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

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

saveJobBtn.addEventListener("click", () => {
  const job = {
    client: clientName.value,
    hours: hoursInput.value,
    rate: hourlyRateInput.value,
    total: Number(hoursInput.value) * Number(hourlyRateInput.value),
  };

  if (!jobsByDate[selectedDate]) {
    jobsByDate[selectedDate] = [];
  }

  jobsByDate[selectedDate].push(job);

  renderJobs();
  modal.classList.add("hidden");
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
