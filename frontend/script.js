const calendar = document.getElementById("calendar");
const currentMonthEl = document.getElementById("currentMonth");

let currentDate = new Date();

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

    dayEl.innerHTML = `<div class="day-number">${day}</div>`;

    dayEl.addEventListener("click", () => {
      alert(`${year}-${month + 1}-${day} 新增案件`);
    });

    calendar.appendChild(dayEl);
  }
}

renderCalendar(currentDate);
