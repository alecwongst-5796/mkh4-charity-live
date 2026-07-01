function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const sampleData = {
  campaignName: "Community Relief Fund",
  amountRaised: 500,
  goalAmount: 25000,
  donorCount: 5,
  donorRecords: [
    { id: "sample-1", date: todayString(), name: "Aisha Rahman", amount: 250 },
    { id: "sample-2", date: todayString(), name: "Michael Tan", amount: 100 },
    { id: "sample-3", date: todayString(), name: "Priya Nair", amount: 75 },
    { id: "sample-4", date: todayString(), name: "Daniel Lee", amount: 50 },
    { id: "sample-5", date: todayString(), name: "Anonymous donor", amount: 25 }
  ],
  currencyCode: "MYR",
  updateNote: "Updated just now"
};

const fields = {
  campaignName: document.querySelector("#campaignName"),
  amountRaised: document.querySelector("#amountRaised"),
  goalAmount: document.querySelector("#goalAmount"),
  donorCount: document.querySelector("#donorCount"),
  currencyCode: document.querySelector("#currencyCode"),
  updateNote: document.querySelector("#updateNote")
};

const donorRows = document.querySelector("#donorRows");
const addDonorButton = document.querySelector("#addDonorButton");
const exportButton = document.querySelector("#exportButton");
const isAdminPage = Object.values(fields).every(Boolean) && donorRows;
const localStorageKey = "facebookDonationDisplay";
const firebaseConfig = window.DONATION_FIREBASE_CONFIG || {};
const firestorePath = window.DONATION_FIRESTORE_PATH || { collection: "fundraisers", document: "main" };
const firebaseReady = Boolean(
  window.firebase &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes("PASTE_") &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes("PASTE_")
);
let cloudDocRef = null;
let applyingCloudData = false;

const preview = {
  name: document.querySelector("#previewName"),
  amount: document.querySelector("#previewAmount"),
  goal: document.querySelector("#previewGoal"),
  percent: document.querySelector("#previewPercent"),
  donors: document.querySelector("#previewDonors"),
  donorList: document.querySelector("#previewDonorList"),
  note: document.querySelector("#previewNote"),
  progress: document.querySelector("#progressBar")
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value, currencyCode) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function createDonorRecord(overrides = {}) {
  return {
    id: `donor-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: todayString(),
    name: "",
    amount: 0,
    ...overrides
  };
}

function activeDonors(donorRecords) {
  return donorRecords.filter((donor) => (donor.name || "").trim() || donor.amount > 0);
}

function calculateDonorTotals(donorRecords) {
  const donors = activeDonors(donorRecords);
  const amountRaised = donors.reduce((total, donor) => total + donor.amount, 0);

  return {
    amountRaised,
    donorCount: donors.length
  };
}

function readDonorRecords() {
  if (!isAdminPage) {
    return [];
  }

  return Array.from(donorRows.querySelectorAll(".donor-input-row")).map((row) => ({
    id: row.dataset.id,
    date: row.querySelector(".donor-date").value || todayString(),
    name: row.querySelector(".donor-name").value.trim(),
    amount: Math.max(0, toNumber(row.querySelector(".donor-amount").value))
  }));
}

function readFormData() {
  const donorRecords = readDonorRecords();
  const totals = calculateDonorTotals(donorRecords);

  return {
    campaignName: fields.campaignName.value.trim() || sampleData.campaignName,
    amountRaised: totals.amountRaised,
    goalAmount: Math.max(1, toNumber(fields.goalAmount.value, 1)),
    donorCount: totals.donorCount,
    donorRecords,
    currencyCode: fields.currencyCode.value,
    updateNote: fields.updateNote.value.trim() || "Updated just now",
    savedAt: new Date().toISOString()
  };
}

function setSyncStatus(message) {
  const status = document.querySelector("#syncStatus");

  if (status) {
    status.textContent = message;
  }
}

function saveLocalData(data) {
  localStorage.setItem(localStorageKey, JSON.stringify(data));
}

function readLocalData() {
  const saved = localStorage.getItem(localStorageKey);
  return saved ? JSON.parse(saved) : sampleData;
}

function initFirebase() {
  if (!firebaseReady) {
    setSyncStatus("Cloud not connected. Add Firebase keys in firebase-config.js.");
    return null;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  cloudDocRef = firebase.firestore()
    .collection(firestorePath.collection)
    .doc(firestorePath.document);

  setSyncStatus("Cloud connected.");
  return cloudDocRef;
}

function renderAdminDonorRows(donorRecords) {
  if (!isAdminPage) {
    return;
  }

  donorRows.replaceChildren();

  donorRecords.forEach((donor) => {
    const row = document.createElement("div");
    const date = document.createElement("input");
    const name = document.createElement("input");
    const amount = document.createElement("input");
    const remove = document.createElement("button");

    row.className = "donor-input-row";
    row.dataset.id = donor.id;

    date.className = "donor-date";
    date.type = "date";
    date.value = donor.date || todayString();
    date.setAttribute("aria-label", "Donor date");

    name.className = "donor-name";
    name.value = donor.name;
    name.maxLength = 50;
    name.placeholder = "Donor name";
    name.setAttribute("aria-label", "Donor name");

    amount.className = "donor-amount";
    amount.type = "number";
    amount.min = "0";
    amount.step = "1";
    amount.value = donor.amount;
    amount.setAttribute("aria-label", "Donation amount");

    remove.className = "icon-button";
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", "Remove donor");
    remove.addEventListener("click", () => {
      row.remove();
      renderDisplay(readFormData());
    });

    [date, name, amount].forEach((input) => {
      input.addEventListener("input", () => renderDisplay(readFormData()));
    });

    row.append(date, name, amount, remove);
    donorRows.append(row);
  });
}

function renderDonorList(donorRecords, currencyCode) {
  preview.donorList.replaceChildren();

  activeDonors(donorRecords).slice(0, 5).forEach((donor, index) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    const date = document.createElement("small");
    const amount = document.createElement("strong");

    row.className = "donor-list-row";
    name.textContent = donor.name || `Donor ${index + 1}`;
    date.textContent = donor.date || todayString();
    amount.textContent = formatCurrency(donor.amount, currencyCode);

    name.append(date);
    row.append(name, amount);
    preview.donorList.append(row);
  });
}

function renderDisplay(data) {
  const totals = calculateDonorTotals(data.donorRecords);
  const amountRaised = totals.amountRaised;
  const donorCount = totals.donorCount;
  const percent = Math.round((amountRaised / data.goalAmount) * 100);
  const cappedPercent = Math.min(percent, 100);

  if (isAdminPage) {
    fields.amountRaised.value = amountRaised;
    fields.donorCount.value = donorCount;
  }

  preview.name.textContent = data.campaignName;
  preview.amount.textContent = formatCurrency(amountRaised, data.currencyCode);
  preview.goal.textContent = formatCurrency(data.goalAmount, data.currencyCode);
  preview.percent.textContent = `${percent}%`;
  preview.donors.textContent = new Intl.NumberFormat().format(donorCount);
  preview.note.textContent = data.updateNote;
  preview.progress.style.width = `${cappedPercent}%`;
  renderDonorList(data.donorRecords, data.currencyCode);
}

async function saveDisplay() {
  const data = readFormData();
  saveLocalData(data);

  if (cloudDocRef) {
    try {
      await cloudDocRef.set(data, { merge: true });
      setSyncStatus("Saved to Firebase cloud.");
    } catch (error) {
      setSyncStatus("Cloud save failed. Saved in this browser only.");
      console.error(error);
    }
  }

  renderDisplay(data);
}

function migrateLegacyDonors(data) {
  if (data.donorRecords) {
    return data.donorRecords.map((donor, index) => createDonorRecord({
      id: donor.id || `saved-${index + 1}`,
      date: donor.date || todayString(),
      name: donor.name || "",
      amount: Math.max(0, toNumber(donor.amount))
    }));
  }

  const legacyDonors = data.latestDonors || [
    { name: data.donorName || sampleData.donorRecords[0].name, amount: sampleData.donorRecords[0].amount },
    ...sampleData.donorRecords.slice(1)
  ];

  return legacyDonors.map((donor, index) => createDonorRecord({
    id: donor.id || `legacy-${index + 1}`,
    date: donor.date || todayString(),
    name: donor.name || "",
    amount: Math.max(0, toNumber(donor.amount))
  }));
}

function normalizeSavedData(data) {
  const donorRecords = migrateLegacyDonors(data);
  const totals = calculateDonorTotals(donorRecords);

  return { ...sampleData, ...data, ...totals, donorRecords };
}

function loadSavedDisplay() {
  const data = normalizeSavedData(readLocalData());

  if (isAdminPage) {
    Object.entries(data).forEach(([key, value]) => {
      if (fields[key]) {
        fields[key].value = value;
      }
    });

    renderAdminDonorRows(data.donorRecords);
  }

  renderDisplay(data);
}

function resetDisplay() {
  localStorage.removeItem(localStorageKey);
  const data = normalizeSavedData(sampleData);

  Object.entries(data).forEach(([key, value]) => {
    if (fields[key]) {
      fields[key].value = value;
    }
  });

  renderAdminDonorRows(data.donorRecords);
  renderDisplay(data);
}

async function resetCloudDisplay() {
  resetDisplay();

  if (cloudDocRef) {
    try {
      await cloudDocRef.set(normalizeSavedData(sampleData), { merge: true });
      setSyncStatus("Reset saved to Firebase cloud.");
    } catch (error) {
      setSyncStatus("Cloud reset failed. Reset in this browser only.");
      console.error(error);
    }
  }
}

function addDonor() {
  const data = readFormData();
  const donorRecords = [createDonorRecord(), ...data.donorRecords];
  renderAdminDonorRows(donorRecords);
  renderDisplay({ ...data, donorRecords });
}

function excelEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDailySummary(donorRecords) {
  const summary = new Map();

  activeDonors(donorRecords).forEach((donor) => {
    const date = donor.date || todayString();
    const current = summary.get(date) || { date, donorCount: 0, amountRaised: 0 };
    current.donorCount += 1;
    current.amountRaised += donor.amount;
    summary.set(date, current);
  });

  return Array.from(summary.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function exportExcel() {
  const data = readFormData();
  const donors = activeDonors(data.donorRecords);
  const summary = buildDailySummary(data.donorRecords);
  const percent = Math.round((data.amountRaised / data.goalAmount) * 100);

  saveLocalData(data);
  if (cloudDocRef) {
    try {
      await cloudDocRef.set(data, { merge: true });
      setSyncStatus("Excel exported and Firebase cloud saved.");
    } catch (error) {
      setSyncStatus("Excel exported. Cloud save failed.");
      console.error(error);
    }
  }

  const donorRowsHtml = donors.map((donor, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${excelEscape(donor.date)}</td>
      <td>${excelEscape(donor.name || `Donor ${index + 1}`)}</td>
      <td>${excelEscape(data.currencyCode)}</td>
      <td>${donor.amount}</td>
    </tr>
  `).join("");

  const summaryRowsHtml = summary.map((day) => `
    <tr>
      <td>${excelEscape(day.date)}</td>
      <td>${day.donorCount}</td>
      <td>${day.amountRaised}</td>
    </tr>
  `).join("");

  const workbook = `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <h1>${excelEscape(data.campaignName)} Donation Report</h1>
        <h2>Campaign Summary</h2>
        <table border="1">
          <tbody>
            <tr><th>Campaign Name</th><td>${excelEscape(data.campaignName)}</td></tr>
            <tr><th>Currency</th><td>${excelEscape(data.currencyCode)}</td></tr>
            <tr><th>Total Raised</th><td>${data.amountRaised}</td></tr>
            <tr><th>Total Donors</th><td>${data.donorCount}</td></tr>
            <tr><th>Goal</th><td>${data.goalAmount}</td></tr>
            <tr><th>Funded Percent</th><td>${percent}%</td></tr>
            <tr><th>Update Note</th><td>${excelEscape(data.updateNote)}</td></tr>
            <tr><th>Exported At</th><td>${excelEscape(new Date().toLocaleString())}</td></tr>
          </tbody>
        </table>
        <h2>Daily Summary</h2>
        <table border="1">
          <thead>
            <tr><th>Date</th><th>Total Donors</th><th>Total Raised</th></tr>
          </thead>
          <tbody>${summaryRowsHtml}</tbody>
        </table>
        <h2>All Donor Details</h2>
        <table border="1">
          <thead>
            <tr><th>No.</th><th>Date</th><th>Donor Name</th><th>Currency</th><th>Amount</th></tr>
          </thead>
          <tbody>${donorRowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "donation-report.xls";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function startCloudListener() {
  const ref = initFirebase();

  if (!ref) {
    loadSavedDisplay();
    return;
  }

  ref.onSnapshot((snapshot) => {
    if (!snapshot.exists) {
      loadSavedDisplay();
      return;
    }

    applyingCloudData = true;
    const data = normalizeSavedData(snapshot.data());
    saveLocalData(data);

    if (isAdminPage) {
      Object.entries(data).forEach(([key, value]) => {
        if (fields[key]) {
          fields[key].value = value;
        }
      });
      renderAdminDonorRows(data.donorRecords);
    }

    renderDisplay(data);
    setSyncStatus("Live data loaded from Firebase.");
    applyingCloudData = false;
  }, (error) => {
    console.error(error);
    setSyncStatus("Cloud live update failed. Using browser data.");
    loadSavedDisplay();
  });
}

if (isAdminPage) {
  Object.values(fields).forEach((field) => {
    field.addEventListener("input", () => renderDisplay(readFormData()));
  });

  addDonorButton.addEventListener("click", addDonor);
  exportButton.addEventListener("click", exportExcel);
  document.querySelector("#saveButton").addEventListener("click", saveDisplay);
  document.querySelector("#resetButton").addEventListener("click", resetCloudDisplay);
}

window.addEventListener("storage", (event) => {
  if (!applyingCloudData && event.key === localStorageKey) {
    loadSavedDisplay();
  }
});

startCloudListener();
