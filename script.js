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
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAllViews();
  setupEventListeners();
  calculateBattingAverage();
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

// Data Management
function loadData() {
  const saved = localStorage.getItem('reviewNoteData');
  if (saved) {
    try {
      appData = JSON.parse(saved);
      // Ensure all arrays exist
      appData.odap = appData.odap || [];
      appData.market = appData.market || [];
      appData.mock = appData.mock || [];
    } catch (e) {
      console.error("데이터 로드 실패:", e);
    }
  }
}

function saveData(type) {
  // Sync view data to appData before saving
  syncViewToData(type);
  localStorage.setItem('reviewNoteData', JSON.stringify(appData));

  // Flash save button to indicate success
  const btn = document.querySelector(`#view-${type} .save-btn`);
  if (btn) {
    const originalText = btn.innerText;
    btn.innerText = "저장됨!";
    btn.style.backgroundColor = "#2E7D32";

    // 타율 업데이트를 위해
    if (type === 'odap') calculateBattingAverage();

    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.backgroundColor = "";
    }, 1500);
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

// 타율 계산 공삭 = (실현손익 중 양수인 컬럼의 개수)/ (전체 실현손익 컬럼의 개수) * 100
function calculateBattingAverage() {
  const odapData = appData.odap || [];
  let totalCount = 0;
  let winCount = 0;

  odapData.forEach(item => {
    // 값이 존재하고 0이 아닌 경우 배팅수로 집계 (빈칸은 미집계)
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

    // 만약 새 행이면 즉시 데이터 모델에 푸시해둬야 모달 등에서 접근 가능
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
    // Update master checkbox
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

// 수익률 계산 로직 (산식: (전영업일 종가 - 평균매입가) * 매수량)
// 여기서 야후파이낸스 종가(전일)를 가져와야 함.
async function calculateOdapYield(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const ticker = row.querySelector('.col-ticker').value.trim().toUpperCase();
  const qty = Number(row.querySelector('.col-qty').value) || 0;
  const price = Number(row.querySelector('.col-price').value) || 0;
  const yieldInput = row.querySelector('.col-yield');
  const closedBtn = row.querySelector('.col-closed');

  // 마감 상태면 계산 안함
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

      // 색상 처리
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

// 야후 파이낸스 가격 조회 (cors proxy 사용)
async function getYahooFinancePrice(ticker) {
  // CORS 회피를 위해 corsproxy.io 등 퍼블릭 프록시 사용. 
  // 실제 프로덕션에서는 자체 백엔드 권장.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error('Network response err');
    const data = await res.json();

    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      // 현재가 혹은 전일종가 (가장 최근 메타데이터의 regularMarketPrice 사용)
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

// 모의투자 매수/매도 로직
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

  // 리셋
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

function saveMemo() {
  if (!currentMemoContext) return;

  const { type, id } = currentMemoContext;
  const item = appData[type].find(d => d.id === id);
  const textArea = document.getElementById('memo-text');
  const previewContainer = document.getElementById('memo-image-preview');
  const previewImg = previewContainer.querySelector('img');

  if (item) {
    item.memoText = textArea.value;
    const row = document.querySelector(`tr[data-id="${id}"]`);

    // 이미지가 존재하고 미리보기 컨테이너가 숨겨지지 않은 경우
    if (previewImg && previewContainer.style.display !== 'none') {
      item.memoImg = previewImg.src;

      // Update the tooltip in the DOM immediately
      if (row) {
        const container = row.querySelector('.content-btn').closest('.cert-preview-container');
        if (container) {
          let tooltip = container.querySelector('.cert-tooltip');
          if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'cert-tooltip';
            container.appendChild(tooltip);
          }
          tooltip.innerHTML = `<img src="${item.memoImg}">`;
        }
      }
    } else {
      item.memoImg = '';
      // Remove tooltip if exists
      if (row) {
        const container = row.querySelector('.content-btn').closest('.cert-preview-container');
        if (container) {
          const tooltip = container.querySelector('.cert-tooltip');
          if (tooltip) tooltip.remove();
        }
      }
    }
  }

  closeModal('memo-modal');
}

// 모달 로직 (인증 관련)
function openCert(id) {
  currentCertContext = { type: 'odap', id };
  const item = appData.odap.find(d => d.id === id);

  const modal = document.getElementById('cert-modal');
  const preview = document.getElementById('cert-image-preview');

  // 리셋
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

function saveCert() {
  if (!currentCertContext) return;

  const { id } = currentCertContext;
  const item = appData.odap.find(d => d.id === id);
  const previewImg = document.querySelector('#cert-image-preview img');

  if (item) {
    if (previewImg) {
      item.certImg = previewImg.src;

      // Update the tooltip in the DOM immediately
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        const container = row.querySelector('.cert-btn').closest('.cert-preview-container');
        if (container) {
          let tooltip = container.querySelector('.cert-tooltip');

          if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'cert-tooltip';
            container.appendChild(tooltip);
          }
          tooltip.innerHTML = `<img src="${item.certImg}">`;
        }
      }

    } else {
      item.certImg = '';
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        const tooltip = row.querySelector('.cert-btn').closest('.cert-preview-container')?.querySelector('.cert-tooltip');
        if (tooltip) tooltip.remove();
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

// Image Upload Handlers (File to Base64)
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
  // 모달 닫기 (영역 밖 클릭)
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });

  // 이미지 업로드 세팅
  setupImageUpload('memo-image-upload', 'memo-image-preview');
  setupImageUpload('cert-image-upload', 'cert-image-preview');

  // 마스터 체크박스 로직
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
