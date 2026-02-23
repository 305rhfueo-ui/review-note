// Firebase Configuration (사용자가 직접 입력해야 함)
const firebaseConfig = {
  apiKey: "AIzaSyAslYpS5-yxDVr6vDAMdpMNU0qwP7MPxmM",
  authDomain: "review-note-4e119.firebaseapp.com",
  projectId: "review-note-4e119",
  storageBucket: "review-note-4e119.firebasestorage.app",
  messagingSenderId: "72838505068",
  appId: "1:72838505068:web:dd057d2562dac960032e49"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

// Set today's date format for new rows globally
Date.prototype.toDateInputValue = function () {
  var local = new Date(this);
  local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
};

// Data Structures
let appData = {
  odap: [],
  market: [],
  mock: []
};

// State
let currentMemoContext = null; // { type: 'odap', id: 'row123', field: 'content' }
let currentCertContext = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    alert("현재 Firebase가 연결되지 않았습니다. script.js 최상단의 firebaseConfig 값을 실제 프로젝트 값으로 변경해주세요.");
  }

  await loadData();
  setupEventListeners();
});

// Profit Formatting
function formatProfit(input) {
  let val = input.value.replace('%', '').trim();
  if (val !== '' && !isNaN(val)) {
    input.value = val + '%';
  } else {
    input.value = val;
  }
}

function unformatProfit(input) {
  let val = input.value.replace('%', '').trim();
  input.value = val;
}

// View Navigation
function navigateTo(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');

  if (viewId === 'view-home') {
    calculateBattingAverage();
  }
}

// Data Management (Firebase DB)
async function loadData() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    renderAllViews();
    calculateBattingAverage();
    return;
  }

  try {
    const docRef = db.collection('reviewNote').doc('mainData');
    const doc = await docRef.get();
    if (doc.exists) {
      const saved = doc.data();
      appData.odap = saved.odap || [];
      appData.market = saved.market || [];
      appData.mock = saved.mock || [];
    }
  } catch (e) {
    console.error("데이터 로드 실패:", e);
    alert("데이터를 가져오는 중 오류가 발생했습니다.");
  }

  renderAllViews();
  calculateBattingAverage();
}

async function saveData(type) {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    alert("Firebase 설정이 필요하여 저장할 수 없습니다.");
    return;
  }

  // Sync view data to appData before saving
  syncViewToData(type);

  const btn = document.querySelector(`#view-${type} .save-btn`);
  if (btn) {
    const originalText = btn.innerText;
    btn.innerText = "저장 중...";
    btn.disabled = true;

    try {
      // Firebase는 undefined 저장을 허용하지 않으므로 삭제 처리
      const cleanData = JSON.parse(JSON.stringify(appData));
      await db.collection('reviewNote').doc('mainData').set(cleanData);

      btn.innerText = "저장됨!";
      btn.style.backgroundColor = "#2E7D32";
      if (type === 'odap') calculateBattingAverage();
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = "";
        btn.disabled = false;
      }, 1500);
    } catch (e) {
      console.error("저장 실패", e);
      alert("저장에 실패했습니다: " + e.message);
      btn.innerText = originalText;
      btn.disabled = false;
    }
  }
}

function syncViewToData(type) {
  const tbody = document.querySelector(`#table-${type} tbody`);
  const rows = tbody.querySelectorAll('tr');
  const newData = [];

  rows.forEach(row => {
    const id = row.getAttribute('data-id');
    const item = appData[type].find(d => d.id === id) || { id: id };

    if (type === 'odap') {
      item.date = row.querySelector('.col-date').value;
      item.ticker = row.querySelector('.col-ticker').value;
      item.quantity = Number(row.querySelector('.col-qty').value) || 0;
      item.price = Number(row.querySelector('.col-price').value) || 0;
      item.yield = Number(row.querySelector('.col-yield').value) || 0;

      let profitStr = row.querySelector('.col-profit').value.replace('%', '').trim();
      item.finalProfit = profitStr !== '' ? Number(profitStr) : '';
      item.isClosed = row.querySelector('.col-closed').dataset.closed === 'true';
    } else if (type === 'market') {
      item.date = row.querySelector('.col-date').value;
    } else if (type === 'mock') {
      item.date = row.querySelector('.col-date').value;
      item.ticker = row.querySelector('.col-ticker').value;
      item.buyPrice = Number(row.querySelector('.col-buy-price').value) || 0;
      item.buyDate = row.querySelector('.col-buy-date').value || '';
      item.sellPrice = Number(row.querySelector('.col-sell-price').value) || 0;
      item.sellDate = row.querySelector('.col-sell-date').value || '';
    }
    newData.push(item);
  });

  appData[type] = newData;
}

// 타율 계산
function calculateBattingAverage() {
  const odapData = appData.odap || [];
  let totalCount = 0;
  let winCount = 0;

  odapData.forEach(item => {
    if (item.finalProfit !== undefined && item.finalProfit !== null && item.finalProfit !== "") {
      const profit = Number(item.finalProfit);
      if (!isNaN(profit) && isFinite(profit) && String(item.finalProfit).trim() !== "") {
        totalCount++;
        if (profit > 0) {
          winCount++;
        }
      }
    }
  });

  const container = document.getElementById('batting-average-container');
  const disp = document.getElementById('batting-average');

  if (totalCount > 0) {
    const avg = (winCount / totalCount) * 100;
    disp.innerText = avg.toFixed(2) + '%';
    container.classList.remove('hidden');
  } else {
    disp.innerText = '0.00%';
    container.classList.add('hidden'); // 데이터 없으면 숨김
  }
}

function renderAllViews() {
  renderTable('odap');
  renderTable('market');
  renderTable('mock');
}

// Rendering Rows
function renderTable(type) {
  const tbody = document.querySelector(`#table-${type} tbody`);
  tbody.innerHTML = '';

  if (appData[type] && appData[type].length > 0) {
    appData[type].forEach(item => {
      tbody.appendChild(createRow(type, item));
    });
  }
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

function createRow(type, data = null) {
  const tr = document.createElement('tr');
  const id = (data && data.id) || generateId();
  tr.setAttribute('data-id', id);

  // Base data or defaults
  const dateVal = (data && data.date) || new Date().toDateInputValue();
  const memoText = (data && data.memoText) || '';
  const memoImg = (data && data.memoImg) || '';

  let html = `<td><input type="checkbox" class="row-checkbox"></td>`;
  html += `<td><input type="date" class="col-date" value="${dateVal}"></td>`;

  if (type === 'odap') {
    const closed = (data && data.isClosed) || false;
    const closedClass = closed ? 'blur-cell' : '';
    const finalProfitVal = (data && data.finalProfit !== undefined && data.finalProfit !== '') ? data.finalProfit + '%' : '';
    const certTooltip = (data && data.certImg) ? `<div class="cert-tooltip"><img src="${data.certImg}"></div>` : '';
    const memoTooltip = memoImg ? `<div class="cert-tooltip"><img src="${memoImg}"></div>` : '';

    html += `
      <td><input type="text" class="col-ticker" value="${(data && data.ticker) || ''}" placeholder="티커"></td>
      <td><input type="number" class="col-qty" value="${(data && data.quantity) || ''}" placeholder="매수량" onchange="calculateOdapYield('${id}')"></td>
      <td><input type="number" class="col-price" value="${(data && data.price) || ''}" placeholder="단가" onchange="calculateOdapYield('${id}')"></td>
      <td><input type="number" class="col-yield ${closedClass}" value="${(data && data.yield) || ''}" readonly placeholder="자동계산"></td>
      <td>
        <div class="cert-preview-container">
          <button class="content-btn" onclick="openMemo('${type}', '${id}')">메모 보기/작성</button>
          ${memoTooltip}
        </div>
      </td>
      <td><input type="text" class="col-profit" value="${finalProfitVal}" placeholder="손익" onblur="formatProfit(this)" onfocus="unformatProfit(this)"></td>
      <td><button class="action-cell-btn col-closed" data-closed="${closed}" onclick="toggleClose('${id}')">${closed ? '마감해제' : '마감'}</button></td>
      <td>
        <div class="cert-preview-container">
          <button class="cert-btn" onclick="openCert('${id}')">인증</button>
          ${certTooltip}
        </div>
      </td>
    `;

    if (!data) {
      appData.odap.push({ id: id, date: dateVal, isClosed: false });
    }
  }
  else if (type === 'market') {
    const memoTooltip = memoImg ? `<div class="cert-tooltip"><img src="${memoImg}"></div>` : '';
    html += `
      <td>
        <div class="cert-preview-container">
          <button class="content-btn" onclick="openMemo('${type}', '${id}')">메모 보기/작성</button>
          ${memoTooltip}
        </div>
      </td>
    `;
    if (!data) appData.market.push({ id: id, date: dateVal });
  }
  else if (type === 'mock') {
    const memoTooltip = memoImg ? `<div class="cert-tooltip"><img src="${memoImg}"></div>` : '';
    html += `
      <td><input type="text" class="col-ticker" value="${(data && data.ticker) || ''}" placeholder="티커"></td>
      <td>
        <button class="action-cell-btn" onclick="fetchPrice('${id}', 'buy')">매수</button>
        <input type="number" class="col-buy-price mock-input" value="${(data && data.buyPrice) || ''}" placeholder="가격">
        <input type="date" class="col-buy-date mock-input" value="${(data && data.buyDate) || ''}">
      </td>
      <td>
        <button class="action-cell-btn" onclick="fetchPrice('${id}', 'sell')">매도</button>
        <input type="number" class="col-sell-price mock-input" value="${(data && data.sellPrice) || ''}" placeholder="가격">
        <input type="date" class="col-sell-date mock-input" value="${(data && data.sellDate) || ''}">
      </td>
      <td>
        <div class="cert-preview-container">
          <button class="content-btn" onclick="openMemo('${type}', '${id}')">메모 보기/작성</button>
          ${memoTooltip}
        </div>
      </td>
    `;
    if (!data) appData.mock.push({ id: id, date: dateVal });
  }

  tr.innerHTML = html;
  return tr;
}

function addRow(type) {
  const tbody = document.querySelector(`#table-${type} tbody`);
  tbody.appendChild(createRow(type));
}

function deleteRows(type) {
  const tbody = document.querySelector(`#table-${type} tbody`);
  const checkboxes = tbody.querySelectorAll('.row-checkbox:checked');

  if (checkboxes.length === 0) return;

  if (confirm(`선택한 ${checkboxes.length}개의 행을 삭제하시겠습니까?`)) {
    checkboxes.forEach(cb => {
      const row = cb.closest('tr');
      const id = row.getAttribute('data-id');
      row.remove();
      // Remove from data model
      appData[type] = appData[type].filter(item => item.id !== id);
    });
    document.getElementById(`selectAll-${type}`).checked = false;
  }
}

// 오답노트 관련 로직
function toggleClose(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const btn = row.querySelector('.col-closed');
  const yieldInput = row.querySelector('.col-yield');

  const isClosed = btn.dataset.closed === 'true';
  const newClosedState = !isClosed;

  btn.dataset.closed = newClosedState;
  btn.innerText = newClosedState ? '마감해제' : '마감';

  if (newClosedState) {
    yieldInput.classList.add('blur-cell');
  } else {
    yieldInput.classList.remove('blur-cell');
  }
}

// 수익률 계산 로직
async function calculateOdapYield(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const ticker = row.querySelector('.col-ticker').value.trim().toUpperCase();
  const qty = Number(row.querySelector('.col-qty').value) || 0;
  const price = Number(row.querySelector('.col-price').value) || 0;
  const yieldInput = row.querySelector('.col-yield');
  const closedBtn = row.querySelector('.col-closed');

  if (closedBtn.dataset.closed === 'true') return;

  if (!ticker || qty === 0 || price === 0) {
    yieldInput.value = '';
    return;
  }

  try {
    yieldInput.placeholder = "조회중...";
    const yfPrice = await getYahooFinancePrice(ticker);

    if (yfPrice) {
      const currentYield = (yfPrice - price) * qty;
      yieldInput.value = currentYield.toFixed(2);

      if (currentYield > 0) {
        yieldInput.style.color = 'var(--primary-color)';
      } else if (currentYield < 0) {
        yieldInput.style.color = 'var(--danger-color)';
      } else {
        yieldInput.style.color = '';
      }
    } else {
      yieldInput.placeholder = "조회실패";
    }
  } catch (e) {
    console.error("야후 파이낸스 에러", e);
    yieldInput.placeholder = "에러";
  }
}

async function getYahooFinancePrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error('Network response err');
    const data = await res.json();

    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      if (result.meta && result.meta.regularMarketPrice) {
        return result.meta.regularMarketPrice;
      }
    }
    return null;
  } catch (e) {
    console.log("getPriceError:", e);
    return null;
  }
}

async function fetchPrice(id, action) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const ticker = row.querySelector('.col-ticker').value.trim().toUpperCase();
  const priceInput = row.querySelector(`.col-${action}-price`);
  const dateInput = row.querySelector(`.col-${action}-date`);

  if (!ticker) {
    alert("티커를 먼저 입력해주세요.");
    return;
  }

  priceInput.placeholder = "조회중...";

  const yfPrice = await getYahooFinancePrice(ticker);

  if (yfPrice) {
    priceInput.value = yfPrice.toFixed(2);
    dateInput.value = new Date().toDateInputValue();
  } else {
    priceInput.placeholder = "조회실패";
    alert("해당 티커의 가격을 가져오지 못했습니다.");
  }
}

// 모달 로직 (메모 관련)
function openMemo(type, id) {
  currentMemoContext = { type, id };
  const item = appData[type].find(d => d.id === id);

  const modal = document.getElementById('memo-modal');
  const textArea = document.getElementById('memo-text');
  const preview = document.getElementById('memo-image-preview');

  document.getElementById('memo-image-upload').value = '';

  if (item) {
    textArea.value = item.memoText || '';
    if (item.memoImg) {
      preview.innerHTML = `<img src="${item.memoImg}">`;
      preview.style.display = 'block';
    } else {
      preview.innerHTML = '';
      preview.style.display = 'none';

    }
  }

  modal.classList.add('active');
}

async function saveMemo() {
  if (!currentMemoContext) return;

  const { type, id } = currentMemoContext;
  const item = appData[type].find(d => d.id === id);
  const textArea = document.getElementById('memo-text');
  const previewContainer = document.getElementById('memo-image-preview');
  const previewImg = previewContainer.querySelector('img');

  if (item) {
    item.memoText = textArea.value;
    const row = document.querySelector(`tr[data-id="${id}"]`);

    if (previewImg && previewContainer.style.display !== 'none') {
      item.memoImg = previewImg.src;
    } else {
      item.memoImg = '';
    }

    // 호버 툴팁 DOM 갱신
    if (row) {
      const container = row.querySelector('.content-btn').closest('.cert-preview-container');
      if (container) {
        const existingTooltip = container.querySelector('.cert-tooltip');
        if (existingTooltip) existingTooltip.remove();

        if (item.memoImg) {
          const tooltip = document.createElement('div');
          tooltip.className = 'cert-tooltip';
          tooltip.innerHTML = `<img src="${item.memoImg}">`;
          container.appendChild(tooltip);
        }
      }
    }
  }

  // DB 전체 저장은 사용자가 "저장" 버튼 누를 때 함
  closeModal('memo-modal');
}

// 모달 로직 (인증 관련)
function openCert(id) {
  currentCertContext = { type: 'odap', id };
  const item = appData.odap.find(d => d.id === id);

  const modal = document.getElementById('cert-modal');
  const preview = document.getElementById('cert-image-preview');

  document.getElementById('cert-image-upload').value = '';

  if (item && item.certImg) {
    preview.innerHTML = `<img src="${item.certImg}">`;
    preview.style.display = 'block';
  } else {
    preview.innerHTML = '';
    preview.style.display = 'none';
  }

  modal.classList.add('active');
}

async function saveCert() {
  if (!currentCertContext) return;

  const { id } = currentCertContext;
  const item = appData.odap.find(d => d.id === id);
  const previewContainer = document.getElementById('cert-image-preview');
  const previewImg = previewContainer.querySelector('img');

  if (item) {
    const row = document.querySelector(`tr[data-id="${id}"]`);

    if (previewImg && previewContainer.style.display !== 'none') {
      item.certImg = previewImg.src;
    } else {
      item.certImg = '';
    }

    // DOM 갱신
    if (row) {
      const container = row.querySelector('.cert-btn').closest('.cert-preview-container');
      if (container) {
        const existingTooltip = container.querySelector('.cert-tooltip');
        if (existingTooltip) existingTooltip.remove();

        if (item.certImg) {
          const tooltip = document.createElement('div');
          tooltip.className = 'cert-tooltip';
          tooltip.innerHTML = `<img src="${item.certImg}">`;
          container.appendChild(tooltip);
        }
      }
    }
  }

  closeModal('cert-modal');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (modalId === 'memo-modal') currentMemoContext = null;
  if (modalId === 'cert-modal') currentCertContext = null;
}

// Image Upload Handlers (File to Base64 preview)
function setupImageUpload(inputId, previewId) {
  const fileInput = document.getElementById(inputId);
  const previewContainer = document.getElementById(previewId);

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        previewContainer.innerHTML = `<img src="${evt.target.result}">`;
        previewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

// Event Listeners
function setupEventListeners() {
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });

  setupImageUpload('memo-image-upload', 'memo-image-preview');
  setupImageUpload('cert-image-upload', 'cert-image-preview');

  ['odap', 'market', 'mock'].forEach(type => {
    const masterCb = document.getElementById(`selectAll-${type}`);
    if (masterCb) {
      masterCb.addEventListener('change', function (e) {
        const tbody = document.querySelector(`#table-${type} tbody`);
        const checkboxes = tbody.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });
    }
  });
}
