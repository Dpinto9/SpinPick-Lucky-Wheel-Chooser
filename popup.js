// DOM Elements
const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spin-btn");
const finalValue = document.getElementById("final-value");
const optionInput = document.getElementById("option-input");
const addBtn = document.getElementById("add-btn");
const optionsList = document.getElementById("options-list");
const resetBtn = document.getElementById("reset-btn");
const winnerNotification = document.getElementById("winner-notification");
const winnerText = document.getElementById("winner-text");
const closeNotification = document.getElementById("close-notification");

// Reset confirmation modal elements
const resetModal = document.getElementById("reset-confirmation");
const confirmResetBtn = document.getElementById("confirm-reset");
const cancelResetBtn = document.getElementById("cancel-reset");

// State
let options = [];
let myChart = null;
let rotationValues = [];

// Colors for the wheel - lofi palette
const pieColours = ["#e63946", "#669bbc", "#a7c957", "#da627d", "#ffb703"];

const suspensePhrases = [
  "Hold your breath...",
  "The suspense is real!",
  "What’s it gonna be?",
  "And the winner is...",
  "Brace yourself!",
];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadOptions();
  renderOptionsList();
  updateWheel();
});

// Load options from chrome.storage
function loadOptions() {
  chrome.storage.local.get(["wheelOptions"], (result) => {
    if (result.wheelOptions && result.wheelOptions.length > 0) {
      options = result.wheelOptions;
    } else {
      options = ["Option 1", "Option 2", "Option 3"];
      saveOptions();
    }
    renderOptionsList();
    updateWheel();
  });
}

// Save options to chrome.storage
function saveOptions() {
  chrome.storage.local.set({ wheelOptions: options });
}

// Generate rotation values based on options
function generateRotationValues() {
  rotationValues = [];
  const segmentAngle = 360 / options.length;
  const offset = 90;

  for (let i = 0; i < options.length; i++) {
    const startAngle = (i * segmentAngle - offset + 360) % 360;
    const endAngle = ((i + 1) * segmentAngle - offset + 360) % 360;

    rotationValues.push({
      minDegree: Math.round(startAngle),
      maxDegree: endAngle > startAngle ? Math.round(endAngle) : 360,
      value: options[i],
    });

    if (endAngle < startAngle) {
      rotationValues.push({
        minDegree: 0,
        maxDegree: Math.round(endAngle),
        value: options[i],
      });
    }
  }
}

// Add new option
addBtn.addEventListener("click", addOption);
optionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addOption();
});

function addOption() {
  const value = optionInput.value.trim();
  if (value === "") return;

  options.push(value);
  optionInput.value = "";
  saveOptions();
  renderOptionsList();
  updateWheel();
}

// Render options list
function renderOptionsList() {
  optionsList.innerHTML = "";

  if (options.length === 0) {
    optionsList.innerHTML =
      '<div class="empty-state">No options yet.<br>Add some to get started!</div>';
    spinBtn.disabled = true;
    return;
  }

  spinBtn.disabled = false;

  options.forEach((option, index) => {
    const item = document.createElement("div");
    item.className = "option-item";
    item.innerHTML = `
      <span>${option}</span>
      <div class="option-actions">
        <button class="edit-btn" data-index="${index}" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="delete-btn" data-index="${index}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    optionsList.appendChild(item);
  });

  // Add event listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      editOption(e.currentTarget.dataset.index)
    );
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      deleteOption(e.currentTarget.dataset.index)
    );
  });
}

// Edit option
function editOption(index) {
  const item = optionsList.children[index];
  const currentValue = options[index];

  item.classList.add("editing");
  item.innerHTML = `
  <input type="text" value="${currentValue}" maxlength="20" />
  <div class="option-actions">
    <button class="save-btn" title="Save">
      <svg viewBox="0 0 24 24" fill="none"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
    <button class="cancel-btn" title="Cancel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
`;

  const input = item.querySelector("input");
  input.focus();
  input.select();

  const saveBtn = item.querySelector(".save-btn");
  const cancelBtn = item.querySelector(".cancel-btn");

  const save = () => {
    const newValue = input.value.trim();
    if (newValue !== "") {
      options[index] = newValue;
      saveOptions();
      renderOptionsList();
      updateWheel();
    } else {
      renderOptionsList();
    }
  };

  const cancel = () => {
    renderOptionsList();
  };

  saveBtn.addEventListener("click", save);
  cancelBtn.addEventListener("click", cancel);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  });
}

// Delete option
function deleteOption(index) {
  options.splice(index, 1);
  saveOptions();
  renderOptionsList();
  updateWheel();
}

// Reset all options
resetBtn.addEventListener("click", () => {
  // show custom confirmation modal instead of native confirm()
  if (!resetModal) return;
  resetModal.classList.remove("hidden");
  confirmResetBtn.focus();
});

if (confirmResetBtn) {
  confirmResetBtn.addEventListener("click", () => {
    options = [];
    saveOptions();
    renderOptionsList();
    updateWheel();
    finalValue.innerHTML = "<p>Add options and spin!</p>";
    resetModal.classList.add("hidden");
  });
}

if (cancelResetBtn) {
  cancelResetBtn.addEventListener("click", () => {
    if (resetModal) resetModal.classList.add("hidden");
  });
}

if (resetModal) {
  resetModal.addEventListener("click", (e) => {
    if (e.target === resetModal) resetModal.classList.add("hidden");
  });
}

// Update wheel chart
function updateWheel() {
  if (myChart) {
    myChart.destroy();
  }

  if (options.length === 0) {
    return;
  }

  generateRotationValues();

  const data = new Array(options.length).fill(16);
  const backgroundColor = options.map(
    (_, i) => pieColours[i % pieColours.length]
  );

  myChart = new Chart(wheel, {
    type: "pie",
    data: {
      labels: options,
      datasets: [
        {
          backgroundColor: backgroundColor,
          data: data,
          borderWidth: 3,
          borderColor: "#faf8f3",
        },
      ],
    },
    options: {
      responsive: false,
      animation: { duration: 0 },
      rotation: 0,
      plugins: {
        tooltip: false,
        legend: {
          display: false,
        },
        datalabels: {
          color: "#ffffff",
          formatter: (_, context) => {
            const label = context.chart.data.labels[context.dataIndex];
            return label.length > 10 ? label.substring(0, 10) + "..." : label;
          },
          font: { size: 11, weight: "600" },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// Display value based on the randomAngle
const valueGenerator = (angleValue) => {
  const normalizedAngle = ((angleValue % 360) + 360) % 360;

  for (let i of rotationValues) {
    if (i.maxDegree >= i.minDegree) {
      if (normalizedAngle >= i.minDegree && normalizedAngle <= i.maxDegree) {
        finalValue.innerHTML = `<p>Winner: <strong>${i.value}</strong></p>`;
        showWinner(i.value);
        spinBtn.disabled = false;
        break;
      }
    } else {
      if (normalizedAngle >= i.minDegree || normalizedAngle <= i.maxDegree) {
        finalValue.innerHTML = `<p>Winner: <strong>${i.value}</strong></p>`;
        showWinner(i.value);
        spinBtn.disabled = false;
        break;
      }
    }
  }
};

// Show winner notification
function showWinner(winner) {
  winnerText.textContent = winner;
  winnerNotification.classList.remove("hidden");
}

// Close notification
closeNotification.addEventListener("click", () => {
  winnerNotification.classList.add("hidden");
});

winnerNotification.addEventListener("click", (e) => {
  if (e.target === winnerNotification) {
    winnerNotification.classList.add("hidden");
  }
});

// SPIN BUTTON
spinBtn.addEventListener("click", () => {
  if (options.length <= 1) {
    finalValue.innerHTML = "<p>Add at least 2 options to spin.</p>";
    return;
  }

  spinBtn.disabled = true;
  const phrase =
    suspensePhrases[Math.floor(Math.random() * suspensePhrases.length)];
  finalValue.innerHTML = `<p>${phrase}</p>`;

  let randomDegree = Math.floor(Math.random() * (355 - 0 + 1) + 0);
  let extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
  let targetRotation = extraSpins + ((360 - randomDegree) % 360);

  let currentRotation = 0;
  let rotationInterval = window.setInterval(() => {
    let remaining = targetRotation - currentRotation;
    let speed = Math.max(2, remaining / 15);

    currentRotation += speed;

    if (currentRotation >= targetRotation) {
      currentRotation = targetRotation;
    }

    myChart.options.rotation = currentRotation % 360;
    myChart.update();

    if (currentRotation >= targetRotation) {
      myChart.options.rotation = targetRotation % 360;
      myChart.update();
      valueGenerator(randomDegree);
      clearInterval(rotationInterval);
    }
  }, 10);
});