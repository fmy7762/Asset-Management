const GAS_URL = 'https://script.google.com/macros/s/AKfycbwzablHQz1CJm7igNa0CArjtrrhHRbO0RYOXnznzwBrFhG9mAm3t7TGBeg2EjPiT2c3/exec';

// --- GAS Communication Wrapper ---
async function callGAS(method, args = null) {
  if (GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
    return Promise.reject(new Error('GASのWebアプリURLが設定されていません。app.jsの1行目を変更してください。'));
  }
  
  const payload = {
    method: method,
    args: args
  };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // GAS requires text/plain for CORS without preflight
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return result.data;
  } catch (error) {
    console.error('GAS Communication Error:', error);
    throw error;
  }
}
// ---------------------------------

// ▼ キャッシュ機能 ▼
let appCache = {};
let currentCategory = '株';

function clearAppCache() {
  appCache = {};
}

const quotes = [
  { text: "「迷ったら…望みだろ…！<br>望みに進むのが<br>気持ちのいい人生ってもんだろっ…！」", author: "～伊藤開司～" },
  { text: "「金は命より重い」", author: "～利根川幸雄～" },
  { text: "「やらなくてどうするっ…！！<br>勝つ為に生きなくてどうするっ…！！」", author: "～伊藤開司～" },
  { text: "「ギャンブルのどこが悪い！<br>入試、就職、結婚、<br>みんなギャンブルみたいなもんだろ！<br>人生すべて博打だぞ！」", author: "～両津勘吉～" },
  { text: "「勝ちもせず生きようとすることが<br>そもそも論外なのだ」", author: "～利根川幸雄～" },
  { text: "「いっちゃ悪いが、奴ら正真正銘のクズ…<br>負けたからクズってことじゃなくて<br>可能性を追わないからクズ…」", author: "～伊藤開司～" },
  { text: "「駆け巡る脳内物質っ…！」", author: "～鷲巣 巌～" },
  { text: "「不合理こそ博打…<br>それが博打の本質、博打の快感…<br>不合理に身を委ねてこそギャンブル」", author: "～赤木しげる～" },
  { text: "「無意味な死か。<br>その”無意味な死”ってやつが。<br>まさにギャンブル。なんじゃないの。」", author: "～赤木しげる～" },
  { text: "「勝たなきゃダメだ…。<br>勝たなきゃ悲惨がむしろ当たり前。<br>勝たなきゃ誰かの養分…。」", author: "～伊藤開司～" },
  { text: "「博打に『どうして』があるかよっ…！<br>張る時は張るんだっ…！」", author: "～伊藤開司～" },
  { text: "「待つんだよぉ」", author: "～マンエンマン～" }
];

function setRandomQuote() {
  try {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const q = quotes[randomIndex];
    const htmlStr = q.text + "<span class='quote-author'>" + q.author + "</span>";
    document.getElementById('quote-box').innerHTML = htmlStr;
  } catch(e) {}
}

const ICON_GAI = "https://i.ibb.co/23K2Hrv3/hachiware-768x529.jpg";
const ICON_FUMIYA = "https://i.ibb.co/9HTwPnfm/kurimanjyu-768x539.jpg";

function getIconHTML(name, isLarge = false) {
  const cls = isLarge ? 'large-inline-icon' : 'inline-icon';
  if(name === '凱') return "<img src='" + ICON_GAI + "' class='" + cls + "' alt='凱'>";
  if(name === '史弥') return "<img src='" + ICON_FUMIYA + "' class='" + cls + "' alt='史弥'>";
  return "👤";
}

function formatAmt(val) {
  return (val < 0 ? "" : "+") + "¥" + Number(val).toLocaleString();
}

function getAmtClass(val) {
  return val < 0 ? "minus-text" : "plus-text";
}

function getRateStr(invest, returnAmt) {
  if (invest === 0) return returnAmt > 0 ? "100%+" : "0%";
  return Math.floor((returnAmt / invest) * 100) + "%";
}

window.onload = function() {
  try {
    resetDates();
    loadTotals();
    setRandomQuote();
  } catch(e) {
    document.getElementById('quote-box').innerText = "読込エラーが発生しました。リロードしてください。";
  }
};

function resetDates() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = year + '-' + month + '-' + day;
  
  document.getElementById('gai-date').value = dateStr;
  document.getElementById('fumiya-date').value = dateStr;
}

function switchMain(viewId, btnElement) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  window.scrollTo(0, 0);

  if (viewId === 'top') {
    loadTotals();
    setRandomQuote();
  }
  if (viewId === 'portfolio') loadPortfolio(); 
}

function goToHistory(category, btnElement) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById('view-history').classList.add('active');
  window.scrollTo(0, 0);

  document.getElementById('history-category').value = category;
  
  let icon = "📜";
  if(category === "株") icon = "📈";
  if(category === "パチンコ") icon = "🎰";
  if(category === "競馬") icon = "🐎";
  document.getElementById('history-page-title').innerText = icon + " " + category + " の履歴";

  loadHistory();
}

function switchTab(category, btnElement) {
  currentCategory = category;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');

  if (category === '株') {
    document.querySelectorAll('.page-kabu').forEach(el => el.classList.add('active'));
    document.querySelectorAll('.page-gamble').forEach(el => el.classList.remove('active'));
  } else {
    document.querySelectorAll('.page-kabu').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.page-gamble').forEach(el => el.classList.add('active'));
  }
}

function loadTotals() {
  if (appCache.totalsData) {
    renderTotalsDisplay(appCache.totalsData);
    return;
  }
  
  callGAS('getTotals')
    .then(function(totals) {
      appCache.totalsData = totals; 
      renderTotalsDisplay(totals);
    })
    .catch(function(error) {
      document.getElementById('top-total-all').innerText = "データ取得失敗";
    });
}

function renderTotalsDisplay(totals) {
  setTopTotal('top-total-kabu', totals['株']);
  setTopTotal('top-total-portfolio', totals['評価損益']);
  setTopTotal('top-total-pachi', totals['パチンコ']);
  setTopTotal('top-total-keiba', totals['競馬']);
  document.getElementById('top-total-all').innerText = "¥" + totals['総合'].toLocaleString();
}

function setTopTotal(id, val) {
  const el = document.getElementById(id);
  el.innerText = "¥" + val.toLocaleString();
  if (val < 0) el.classList.add('minus');
  else el.classList.remove('minus');
}

function submitForm() {
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('message');

  const gaiData = { name: '凱', category: currentCategory, date: document.getElementById('gai-date').value, notes: document.getElementById('gai-notes').value };
  const fumiyaData = { name: '史弥', category: currentCategory, date: document.getElementById('fumiya-date').value, notes: document.getElementById('fumiya-notes').value };

  if (currentCategory === '株') {
    gaiData.itemName = document.getElementById('gai-kabu-name').value;
    gaiData.profit = document.getElementById('gai-kabu-profit').value;
    fumiyaData.itemName = document.getElementById('fumiya-kabu-name').value;
    fumiyaData.profit = document.getElementById('fumiya-kabu-profit').value;
  } else {
    gaiData.investAmt = document.getElementById('gai-gamble-invest').value;
    gaiData.returnAmt = document.getElementById('gai-gamble-return').value;
    fumiyaData.investAmt = document.getElementById('fumiya-gamble-invest').value;
    fumiyaData.returnAmt = document.getElementById('fumiya-gamble-return').value;
  }

  btn.disabled = true; btn.innerText = "⏳ 登録中..."; msg.innerText = "";

  callGAS('addRecord', [gaiData, fumiyaData]).then(function(response) {
      msg.style.color = "#4caf50"; msg.innerText = response;
      document.getElementById('recordForm').reset();
      resetDates();
      btn.disabled = false; btn.innerText = "一括登録する";
      clearAppCache(); 
    })
    .catch(function(error) {
      msg.style.color = "#e57373"; msg.innerText = "エラー: " + error.message;
      btn.disabled = false; btn.innerText = "一括登録する";
    });
}

function submitPortfolio() {
  const btn = document.getElementById('portSubmitBtn');
  const msg = document.getElementById('port-message');

  let data = {
    name: document.getElementById('port-name').value,
    code: document.getElementById('port-code').value,
    itemName: document.getElementById('port-item').value,
    amount: document.getElementById('port-amount').value,
    price: document.getElementById('port-price').value
  };

  btn.disabled = true; btn.innerText = "⏳ 登録中..."; msg.innerText = "";

  callGAS('addPortfolioRecord', data).then(function(response) {
      msg.style.color = "#4caf50"; msg.innerText = response;
      document.getElementById('portfolioForm').reset();
      btn.disabled = false; btn.innerText = "ポートフォリオに追加";
      clearAppCache(); 
      loadPortfolio(); 
    })
    .catch(function(error) {
      msg.style.color = "#e57373"; msg.innerText = "エラー: " + error.message;
      btn.disabled = false; btn.innerText = "ポートフォリオに追加";
    });
}

function loadPortfolio() {
  if (appCache.portfolioHtml) {
    document.getElementById('portfolio-list').innerHTML = appCache.portfolioHtml;
    return;
  }
  
  document.getElementById('portfolio-list').innerHTML = "⏳ 株価データを取得中...（数秒かかります）";
  callGAS('getPortfolioData').then(renderPortfolio);
}

function renderPortfolio(data) {
  const container = document.getElementById('portfolio-list');
  if (data.length === 0) {
    let emptyHtml = "<p style='color:#aaa; text-align:center;'>保有中の株はありません。</p>";
    appCache.portfolioHtml = emptyHtml;
    container.innerHTML = emptyHtml;
    return;
  }

  let groupedByCode = {};
  data.forEach(item => {
    if (!groupedByCode[item.code]) {
      groupedByCode[item.code] = { itemName: item.itemName, currentPrice: item.currentPrice, gai: null, fumiya: null };
    }
    if (item.name === '凱') {
       if(!groupedByCode[item.code].gai) groupedByCode[item.code].gai = { amount: 0, invest: 0, profit: 0 };
       groupedByCode[item.code].gai.amount += item.amount;
       groupedByCode[item.code].gai.invest += (item.buyPrice * item.amount);
       groupedByCode[item.code].gai.profit += item.profit;
    } else {
       if(!groupedByCode[item.code].fumiya) groupedByCode[item.code].fumiya = { amount: 0, invest: 0, profit: 0 };
       groupedByCode[item.code].fumiya.amount += item.amount;
       groupedByCode[item.code].fumiya.invest += (item.buyPrice * item.amount);
       groupedByCode[item.code].fumiya.profit += item.profit;
    }
  });

  let html = "";
  
  let commonHtml = "";
  for (let code in groupedByCode) {
    let info = groupedByCode[code];
    if (info.gai && info.fumiya) {
      let totalProfit = info.gai.profit + info.fumiya.profit;
      let pClass = totalProfit < 0 ? "minus-text" : "plus-text";
      
      let totalAmount = info.gai.amount + info.fumiya.amount;
      let totalInvest = info.gai.invest + info.fumiya.invest;
      let averagePrice = totalAmount > 0 ? (totalInvest / totalAmount) : 0;
      
      commonHtml += `
        <div class="history-card" style="border-color:#ffb74d; margin-bottom:10px; background:#2a1c0a;">
          <div class="history-title" style="color:#ffb74d;">🏢 ${info.itemName} (${code})</div>
          <div style="font-size:12px; color:#aaa; margin-bottom:10px;">現在の株価: ¥${info.currentPrice > 0 ? info.currentPrice.toLocaleString() : "取得中"}</div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; color:#e0e0e0;">
            <span style="display:flex; align-items:center;">${getIconHTML('凱')} 凱: ${info.gai.amount}株 <span class="${getAmtClass(info.gai.profit)}" style="margin-left:5px;">${formatAmt(info.gai.profit)}</span></span>
            <span style="display:flex; align-items:center;">${getIconHTML('史弥')} 史弥: ${info.fumiya.amount}株 <span class="${getAmtClass(info.fumiya.profit)}" style="margin-left:5px;">${formatAmt(info.fumiya.profit)}</span></span>
          </div>
          
          <div style="background:#3e2723; padding:8px; border-radius:6px; margin-bottom:8px; font-size:12px; color:#ddd; text-align:center;">
            合算株数: <span style="font-weight:bold;">${totalAmount.toLocaleString()}株</span> ／ 平均取得単価: <span style="font-weight:bold;">¥${averagePrice.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
          </div>

          <div style="border-top:1px dashed #555; padding-top:8px; font-weight:bold; font-size:15px; text-align:center; color:#e0e0e0;">
            👥 2人合計の評価損益: <span class="${pClass}">${formatAmt(totalProfit)}</span>
          </div>
        </div>
      `;
    }
  }
  if (commonHtml) {
    html += `<h3 style="color:#ffb74d; border-bottom:2px solid #5d4037; padding-bottom:5px; margin-top:10px; font-size:16px;">🤝 2人の共通保有銘柄</h3>` + commonHtml;
  }

  function createPersonPortfolioHtml(personName, iconHtml, titleColor, borderColor, bgColor) {
    let personHtml = "";
    let totalProfit = 0;
    data.filter(d => d.name === personName).forEach(item => {
      totalProfit += item.profit;
      let pClass = item.profit < 0 ? "minus-text" : "plus-text";
      let encodedItem = encodeURIComponent(JSON.stringify(item));
      
      personHtml += `
        <div class="history-card" style="background:${bgColor};">
          <div class="history-header">
            <span style="color:${titleColor}; font-size:14px; font-weight:bold;">🏢 ${item.itemName} (${item.code})</span>
            <span style="color:#aaa;">${item.amount}株 (取得:¥${item.buyPrice})</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
            <div style="font-size:12px; color:#aaa;">現在値: ¥${item.currentPrice > 0 ? item.currentPrice.toLocaleString() : "取得中"}</div>
            <div class="history-profit ${pClass}" style="margin:0; font-size:15px;">${formatAmt(item.profit)}</div>
          </div>
          <div class="history-actions">
             <button class="action-btn edit-btn" style="background:#1565c0; color:#fff; border-color:#0d47a1;" data-item="${encodedItem}" onclick='sellPortfolio(this)'>💰 全部売却</button>
             <button class="action-btn edit-btn" style="background:#6a1b9a; color:#fff; border-color:#4a148c;" data-item="${encodedItem}" onclick='partialSellPortfolio(this)'>📊 一部売却</button>
             <button class="action-btn del-btn" onclick='deletePortfolio(${item.row})'>🗑️ 削除のみ</button>
          </div>
        </div>
      `;
    });
    
    let sectionHtml = `<h3 style="color:${titleColor}; border-bottom:2px solid ${borderColor}; padding-bottom:5px; margin-top:25px; font-size:16px; display:flex; align-items:center;">${iconHtml} ${personName}の保有銘柄</h3>`;
    if(!personHtml) {
       sectionHtml += "<p style='color:#888; font-size:13px; text-align:center;'>保有なし</p>";
    } else {
       sectionHtml += `<div style="margin-bottom:10px; font-weight:bold; font-size:15px; color:#e0e0e0; text-align:right;">トータル評価損益: <span class="${getAmtClass(totalProfit)}">${formatAmt(totalProfit)}</span></div>` + personHtml;
    }
    return sectionHtml;
  }

  html += createPersonPortfolioHtml('凱', getIconHTML('凱'), '#a5d6a7', '#2e4c2e', '#1e1e1e');
  html += createPersonPortfolioHtml('史弥', getIconHTML('史弥'), '#90caf9', '#2e374c', '#1e1e1e');

  appCache.portfolioHtml = html; 
  container.innerHTML = html;
}

function deletePortfolio(row) {
  if(!confirm("※収支履歴には追加せず、ただリストから消すだけですがよろしいですか？")) return;
  document.getElementById('portfolio-list').innerHTML = "⏳ 削除しています...";
  callGAS('deletePortfolioRecord', row).then(function(msg) {
    alert(msg); 
    clearAppCache(); 
    loadPortfolio();
  });
}

function sellPortfolio(btnElement) {
  const itemStr = decodeURIComponent(btnElement.getAttribute('data-item'));
  const item = JSON.parse(itemStr);
  
  let sellPriceStr = prompt(`【${item.itemName}】を売却して収支に反映します。\n\n1株あたりの「売却価格」を入力してください。\n（現在の参考価格: ¥${item.currentPrice} / 取得単価: ¥${item.buyPrice}）`, item.currentPrice);
  
  if (sellPriceStr === null || sellPriceStr === "") return;
  
  let sellPrice = Number(sellPriceStr);
  if (isNaN(sellPrice) || sellPrice <= 0) {
    alert("正しい数値を入力してください。");
    return;
  }
  
  let finalProfit = Math.round((sellPrice - item.buyPrice) * item.amount);
  
  if (!confirm(`【${item.itemName}】の最終的な確定損益は【 ¥${finalProfit.toLocaleString()} 】になります。\n\nこの金額を株の収支履歴に追加し、未清算ステータスに反映させますか？`)) {
    return;
  }
  
  document.getElementById('portfolio-list').innerHTML = "⏳ 売却処理中...";
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = year + '-' + month + '-' + day;
  
  let sellData = {
    row: item.row,
    name: item.name,
    itemName: item.itemName,
    profit: finalProfit,
    date: dateStr,
    notes: `持ち株から売却 (売却単価:¥${sellPrice})`
  };
  
  callGAS('sellPortfolioRecord', sellData).then(function(msg) {
    alert(msg);
    clearAppCache(); 
    loadPortfolio(); 
  });
}

function partialSellPortfolio(btnElement) {
  const itemStr = decodeURIComponent(btnElement.getAttribute('data-item'));
  const item = JSON.parse(itemStr);

  // 1. 売却株数入力
  let sellAmountStr = prompt(
    `【${item.itemName}】の一部売却\n\n` +
    `現在の保有株数: ${item.amount}株\n` +
    `平均取得単価: ¥${item.buyPrice}\n\n` +
    `売却する株数を入力してください（1〜${item.amount - 1}）：`
  );
  if (sellAmountStr === null || sellAmountStr === "") return;
  const sellAmount = Number(sellAmountStr);
  if (isNaN(sellAmount) || sellAmount <= 0 || sellAmount >= item.amount) {
    alert(`1〜${item.amount - 1}の範囲で入力してください。\n全株売却する場合は「全部売却」ボタンを使ってください。`);
    return;
  }

  // 2. 【追加】今回売却する株の「取得単価」を入力
  let sellBuyPriceStr = prompt(
    `【${item.itemName}】一部売却\n\n` +
    `現在の平均取得単価: ¥${item.buyPrice}\n\n` +
    `今回売却する ${sellAmount}株 の「取得単価」を入力してください：`,
    item.buyPrice // デフォルト値は現在の平均取得単価を入れておく
  );
  if (sellBuyPriceStr === null || sellBuyPriceStr === "") return;
  const sellBuyPrice = Number(sellBuyPriceStr);
  if (isNaN(sellBuyPrice) || sellBuyPrice <= 0) {
    alert("正しい数値を入力してください。");
    return;
  }

  // 3. 売却単価（実際に売れた価格）入力
  let sellPriceStr = prompt(
    `【${item.itemName}】一部売却\n\n` +
    `売却株数: ${sellAmount}株\n` +
    `取得単価(今回): ¥${sellBuyPrice}\n` +
    `現在の参考価格: ¥${item.currentPrice}\n\n` +
    `1株あたりの「売却価格」を入力してください：`,
    item.currentPrice
  );
  if (sellPriceStr === null || sellPriceStr === "") return;
  const sellPrice = Number(sellPriceStr);
  if (isNaN(sellPrice) || sellPrice <= 0) {
    alert("正しい数値を入力してください。");
    return;
  }

  // 4. 計算処理
  const finalProfit = Math.round((sellPrice - sellBuyPrice) * sellAmount);
  const remainAmount = item.amount - sellAmount;
  
  // 【変更】残り株の新しい平均取得単価を計算
  // (全体の総取得額 - 今回売却分の総取得額) ÷ 残り株数
  const totalBookValue = item.amount * item.buyPrice;
  const soldBookValue = sellAmount * sellBuyPrice;
  const remainBuyPrice = Math.round((totalBookValue - soldBookValue) / remainAmount);

  if (!confirm(
    `【${item.itemName}】一部売却の確認\n\n` +
    `売却株数: ${sellAmount}株\n` +
    `今回取得単価: ¥${sellBuyPrice.toLocaleString()} → 売却価格: ¥${sellPrice.toLocaleString()}\n` +
    `確定損益: ¥${finalProfit.toLocaleString()}\n\n` +
    `売却後の残り保有:\n` +
    `  株数: ${remainAmount}株\n` +
    `  新しい平均取得単価: ¥${remainBuyPrice.toLocaleString()}\n\n` +
    `この内容で処理しますか？`
  )) return;

  document.getElementById('portfolio-list').innerHTML = "⏳ 一部売却処理中...";

  const today = new Date();
  const dateStr = today.getFullYear() + '-'
    + String(today.getMonth() + 1).padStart(2, '0') + '-'
    + String(today.getDate()).padStart(2, '0');

  const sellData = {
    row: item.row,
    name: item.name,
    itemName: item.itemName,
    sellAmount: sellAmount,
    sellPrice: sellPrice,
    profit: finalProfit,
    remainAmount: remainAmount,
    remainBuyPrice: remainBuyPrice,
    date: dateStr,
    notes: `一部売却 (${sellAmount}株: 取得¥${sellBuyPrice} → 売却¥${sellPrice} = ¥${finalProfit.toLocaleString()})`
  };

  callGAS('partialSellPortfolioRecord', sellData).then(function(msg) {
    alert(msg);
    clearAppCache();
    loadPortfolio();
  }).catch(function(err) {
    alert("エラー: " + err.message);
    clearAppCache();
    loadPortfolio();
  });
}

function loadHistory() {
  const cat = document.getElementById('history-category').value;
  
  if (appCache['historyHtml_' + cat]) {
    document.getElementById('history-list').innerHTML = appCache['historyHtml_' + cat];
    return;
  }
  
  document.getElementById('history-list').innerHTML = "⏳ データを読み込んでいます...";
  
  if (cat === '株') {
    callGAS('getKabuData').then(function(data) { renderKabuHistory(data); });
  } else {
    callGAS('getHistory', cat).then(function(data) { renderGambleHistory(data, cat); });
  }
}

function renderKabuHistory(data) {
  const container = document.getElementById('history-list');
  const status = data.status;
  const history = data.history;
  const unsettledRecords = data.unsettledRecords || [];
  
  let gColor = getAmtClass(status.gai);
  let fColor = getAmtClass(status.fumiya);
  let total = status.gai + status.fumiya;
  let tColor = getAmtClass(total);

  // 全期間トータル = 確定済み履歴 + 未清算
  let totalGaiKabu = 0;
  let totalFumiyaKabu = 0;
  history.forEach(item => {
    if (item.name === '凱') totalGaiKabu += Number(item.col4) || 0;
    if (item.name === '史弥') totalFumiyaKabu += Number(item.col4) || 0;
  });
  totalGaiKabu += status.gai;
  totalFumiyaKabu += status.fumiya;
  let totalAllKabu = totalGaiKabu + totalFumiyaKabu;

  let diff = Math.abs(status.fumiya - status.gai) / 2;
  let settlementHtml = "";
  
  if (status.fumiya > status.gai) {
     settlementHtml = `<div style="display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold; color:#e0e0e0;">${getIconHTML('史弥', true)} 史弥 ➡️ ${getIconHTML('凱', true)} 凱 へ</div>
                      <span style="font-size:28px; font-weight:bold; color:#ff9800; display:block; margin-top:10px;">¥${diff.toLocaleString()} 渡す</span>`;
  } else if (status.gai > status.fumiya) {
     settlementHtml = `<div style="display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold; color:#e0e0e0;">${getIconHTML('凱', true)} 凱 ➡️ ${getIconHTML('史弥', true)} 史弥 へ</div>
                      <span style="font-size:28px; font-weight:bold; color:#ff9800; display:block; margin-top:10px;">¥${diff.toLocaleString()} 渡す</span>`;
  } else {
     settlementHtml = `<span style="font-size:18px; font-weight:bold; color:#4CAF50;">✨ 現在、差額はありません ✨</span>`;
  }

  // 各人の取引明細を生成
  let gaiDetails = '';
  let fumiyaDetails = '';
  unsettledRecords.forEach(item => {
    let pClass = item.profit < 0 ? "minus-text" : "plus-text";
    let line = `<div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0; color:#ccc;"><span>${item.itemName}</span><span class="${pClass}">${formatAmt(item.profit)}</span></div>`;
    if (item.name === '凱') gaiDetails += line;
    else if (item.name === '史弥') fumiyaDetails += line;
  });

  let perPerson = total / 2;
  let perPersonColor = getAmtClass(perPerson);

  let html = `
    <div class="card" style="padding: 20px; border:2px solid #ffb74d; margin-bottom: 25px; background:#2a1c0a;">
      <h3 style="margin-top:0; margin-bottom:20px; text-align:center; font-size:16px; color:#e0e0e0;">📊 株の未清算ステータス</h3>
      
      <div style="display:flex; justify-content:space-around; margin-bottom:15px;">
        <div style="text-align:center; background:#1b2e1b; padding:10px; border-radius:8px; border:1px solid #2e4c2e; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:18px; font-weight:bold;" class="${gColor}">${formatAmt(status.gai)}</div>
          ${gaiDetails ? '<div style="margin-top:8px; border-top:1px dashed #555; padding-top:5px;">' + gaiDetails + '</div>' : ''}
        </div>
        <div style="text-align:center; background:#1b222e; padding:10px; border-radius:8px; border:1px solid #2e374c; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:18px; font-weight:bold;" class="${fColor}">${formatAmt(status.fumiya)}</div>
          ${fumiyaDetails ? '<div style="margin-top:8px; border-top:1px dashed #555; padding-top:5px;">' + fumiyaDetails + '</div>' : ''}
        </div>
      </div>

      <div style="text-align:center; padding:10px; background:#333; border-radius:8px; margin-bottom:15px;">
        <span style="font-size:14px; font-weight:bold; color:#bbb;">👥 2人の未清算合計</span><br>
        <span style="font-size:22px; font-weight:bold;" class="${tColor}">${formatAmt(total)}</span>
        <span style="font-size:13px; color:#aaa; margin-left:8px;">（1人あたり <span class="${perPersonColor}" style="font-weight:bold;">${formatAmt(perPerson)}</span>）</span>
      </div>

      <div style="text-align:center; padding:15px; background:#3e2723; border:2px solid #5d4037; border-radius:12px; margin-bottom:15px;">
        <div style="font-size:14px; font-weight:bold; color:#ff9800; margin-bottom:15px;">💡 清算金額（割り勘）</div>
        ${settlementHtml}
      </div>
      
      <button onclick="doClearKabuAll()" class="submit-btn" style="background-color:#2e7d32; margin:0;">🔄 清算する（確定済みに移動）</button>
    </div>
  `;

  // 未清算の明細一覧
  if (unsettledRecords.length > 0) {
    html += `<h3 style="margin-top:20px; margin-bottom:10px; border-bottom:2px solid #ff9800; padding-bottom:5px; color:#ffb74d;">📋 未清算の明細（${unsettledRecords.length}件）</h3>`;
    html += `<div style="border-radius: 8px; border: 1px solid #5d4037; overflow: hidden; margin-bottom:25px;">`;
    unsettledRecords.forEach(item => {
      let pClass = item.profit < 0 ? "minus-text" : "plus-text";
      html += `
        <div class="history-card" style="border-color:#5d4037; background:#2a1c0a;">
          <div class="history-header">
            <span>📅 ${item.date}</span>
            <span style="display:flex; align-items:center;">${getIconHTML(item.name)} <b>${item.name}</b></span>
          </div>
          <div class="history-title">🏢 銘柄: ${item.itemName}</div>
          <div class="history-profit ${pClass}">収支: ${formatAmt(item.profit)}</div>
          <div class="history-notes">🗒️ 備考: ${item.notes || "なし"}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // 全期間トータル
  html += `
    <div class="card" style="padding: 20px; border:2px solid #2e7d32; margin-bottom: 25px; background:#0a1a0a;">
      <h3 style="margin-top:0; margin-bottom:20px; text-align:center; font-size:16px; color:#e0e0e0;">📈 株の全期間トータル成績</h3>
      
      <div style="display:flex; justify-content:space-around; margin-bottom:15px;">
        <div style="text-align:center; background:#1b2e1b; padding:10px; border-radius:8px; border:1px solid #2e4c2e; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:18px; font-weight:bold;" class="${getAmtClass(totalGaiKabu)}">${formatAmt(totalGaiKabu)}</div>
        </div>
        <div style="text-align:center; background:#1b222e; padding:10px; border-radius:8px; border:1px solid #2e374c; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:18px; font-weight:bold;" class="${getAmtClass(totalFumiyaKabu)}">${formatAmt(totalFumiyaKabu)}</div>
        </div>
      </div>

      <div style="text-align:center; padding:10px; background:#f5f5f5; border-radius:8px; margin-bottom:0;">
        <span style="font-size:14px; font-weight:bold; color:#555;">👥 2人の合計損益</span><br>
        <span style="font-size:22px; font-weight:bold;" class="${getAmtClass(totalAllKabu)}">${formatAmt(totalAllKabu)}</span>
      </div>
    </div>
    
    <h3 style="margin-top:20px; margin-bottom:10px; border-bottom:2px solid #333; padding-bottom:5px; color:#e0e0e0;">📖 過去の確定済み履歴（すべて）</h3>
  `;

  if (history.length === 0) {
    html += "<p style='color:#aaa;'>記録がありません。</p>";
  } else {
    html += `<div style="border-radius: 8px; border: 1px solid #333; overflow: hidden;">`;
    history.forEach(item => {
      let profit = item.col4;
      let pClass = profit < 0 ? "minus-text" : "plus-text";
      let encodedItem = encodeURIComponent(JSON.stringify(item));
      
      html += `
        <div class="history-card">
          <div class="history-header">
            <span>📅 ${item.date}</span>
            <span style="display:flex; align-items:center;">${getIconHTML(item.name)} <b>${item.name}</b></span>
          </div>
          <div class="history-title">🏢 銘柄: ${item.col3}</div>
          <div class="history-profit ${pClass}">確定収支: ${formatAmt(profit)}</div>
          <div class="history-notes">🗒️ 備考: ${item.col5 || "なし"}</div>
          <div class="history-actions">
            <button class="action-btn edit-btn" data-item="${encodedItem}" onclick='openModal(this)'>✏️ 編集</button>
            <button class="action-btn del-btn" onclick='deleteRecord(${item.row})'>🗑️ 削除</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  appCache['historyHtml_株'] = html; 
  container.innerHTML = html;
}

function doClearKabuAll() {
  if(!confirm("2人分の株収支をリセット(清算)しますか？\n※この操作は取り消せません。")) return;
  document.getElementById('history-list').innerHTML = "⏳ 清算処理中...";
  callGAS('clearKabuAll').then(function(msg) {
    alert(msg); 
    clearAppCache(); 
    loadHistory(); 
  });
}

function renderGambleHistory(data, currentCat) {
  const container = document.getElementById('history-list');
  
  if(data.length === 0) {
     let emptyHtml = "<p style='color:#aaa;'>記録がありません。</p>";
     appCache['historyHtml_' + currentCat] = emptyHtml;
     container.innerHTML = emptyHtml;
     return;
  }

  let gaiInvest = 0, gaiReturn = 0, gaiProfit = 0;
  let fumiyaInvest = 0, fumiyaReturn = 0, fumiyaProfit = 0;

  const dateOrder = [];
  const grouped = {};
  
  data.forEach(item => {
    let invest = Number(item.col3) || 0;
    let returnAmt = Number(item.col4) || 0;
    let profit = Number(item.col5) || 0;

    if (item.name === '凱') {
      gaiInvest += invest; gaiReturn += returnAmt; gaiProfit += profit;
    } else if (item.name === '史弥') {
      fumiyaInvest += invest; fumiyaReturn += returnAmt; fumiyaProfit += profit;
    }

    if (!grouped[item.date]) {
      grouped[item.date] = { gai: 0, fumiya: 0, gaiInvest: 0, gaiReturn: 0, fumiyaInvest: 0, fumiyaReturn: 0, records: [] };
      dateOrder.push(item.date);
    }
    grouped[item.date].records.push(item);
    
    if (item.name === '凱') {
        grouped[item.date].gai += profit;
        grouped[item.date].gaiInvest += invest;
        grouped[item.date].gaiReturn += returnAmt;
    }
    if (item.name === '史弥') {
        grouped[item.date].fumiya += profit;
        grouped[item.date].fumiyaInvest += invest;
        grouped[item.date].fumiyaReturn += returnAmt;
    }
  });

  let totalProfit = gaiProfit + fumiyaProfit;
  let totalInvestAll = gaiInvest + fumiyaInvest;
  let totalReturnAll = gaiReturn + fumiyaReturn;
  
  let getRateStrHtml = function(inv, ret) {
      if (currentCat !== '競馬') return "";
      return `<br><span style="color:#ff9800; font-weight:bold;">回収率: ${getRateStr(inv, ret)}</span>`;
  }
  let getRateBadgeHtml = function(inv, ret) {
      if (currentCat !== '競馬') return "";
      return ` <span style="font-size:12px; color:#ff9800; font-weight:bold;">(${getRateStr(inv, ret)})</span>`;
  }

  let html = `
    <div class="card" style="padding: 20px; border:2px solid #ffb74d; margin-bottom: 25px; background:#2a1c0a;">
      <h3 style="margin-top:0; margin-bottom:20px; text-align:center; font-size:16px; color:#e0e0e0;">📊 ${currentCat}の全期間トータル成績</h3>

      <div style="display:flex; justify-content:space-around; margin-bottom:15px;">
        <div style="text-align:center; background:#1b2e1b; padding:10px; border-radius:8px; border:1px solid #2e4c2e; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:11px; color:#aaa; margin-bottom:5px; line-height:1.4;">
            投資: ¥${gaiInvest.toLocaleString()}<br>回収: ¥${gaiReturn.toLocaleString()}${getRateStrHtml(gaiInvest, gaiReturn)}
          </div>
          <div style="font-size:18px; font-weight:bold;" class="${getAmtClass(gaiProfit)}">${formatAmt(gaiProfit)}</div>
        </div>
        <div style="text-align:center; background:#1b222e; padding:10px; border-radius:8px; border:1px solid #2e374c; width:45%;">
          <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:11px; color:#aaa; margin-bottom:5px; line-height:1.4;">
            投資: ¥${fumiyaInvest.toLocaleString()}<br>回収: ¥${fumiyaReturn.toLocaleString()}${getRateStrHtml(fumiyaInvest, fumiyaReturn)}
          </div>
          <div style="font-size:18px; font-weight:bold;" class="${getAmtClass(fumiyaProfit)}">${formatAmt(fumiyaProfit)}</div>
        </div>
      </div>

      <div style="text-align:center; padding:10px; background:#333; border-radius:8px; margin-bottom:0;">
        <span style="font-size:14px; font-weight:bold; color:#bbb;">👥 2人の合計損益</span><br>
        <span style="font-size:22px; font-weight:bold;" class="${getAmtClass(totalProfit)}">${formatAmt(totalProfit)}</span>
        ${currentCat === '競馬' ? `<div style="font-size:14px; color:#ff9800; font-weight:bold; margin-top:5px;">合計回収率: ${getRateStr(totalInvestAll, totalReturnAll)}</div>` : ''}
      </div>
    </div>
    
    <h3 style="margin-top:20px; margin-bottom:15px; border-bottom:2px solid #333; padding-bottom:5px; font-size:16px; color:#e0e0e0;">📖 日別の入力履歴</h3>
  `;

  dateOrder.forEach(date => {
    let group = grouped[date];
    let total = group.gai + group.fumiya;
    let dailyTotalInvest = group.gaiInvest + group.fumiyaInvest;
    let dailyTotalReturn = group.gaiReturn + group.fumiyaReturn;
    
    let diff = Math.abs(group.fumiya - group.gai) / 2;
    let settlementHtml = "";

    if (group.fumiya > group.gai) {
       settlementHtml = `<div style="display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; color:#e0e0e0;">${getIconHTML('史弥', true)} 史弥 ➡️ ${getIconHTML('凱', true)} 凱 へ</div>
                        <span style="font-size:20px; font-weight:bold; color:#ff9800; display:block; margin-top:5px;">¥${diff.toLocaleString()} 渡す</span>`;
    } else if (group.gai > group.fumiya) {
       settlementHtml = `<div style="display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; color:#e0e0e0;">${getIconHTML('凱', true)} 凱 ➡️ ${getIconHTML('史弥', true)} 史弥 へ</div>
                        <span style="font-size:20px; font-weight:bold; color:#ff9800; display:block; margin-top:5px;">¥${diff.toLocaleString()} 渡す</span>`;
    } else {
       settlementHtml = `<span style="font-size:16px; font-weight:bold; color:#4CAF50;">✨ 差額なし ✨</span>`;
    }

    html += `
      <div class="date-group" style="border-color:#555;">
        <div class="date-summary" style="background:#252525; border-bottom-color:#555;">
          <div class="date-summary-title" style="color:#90caf9;">📅 ${date} の成績</div>
          <div class="date-summary-details" style="margin-bottom:10px; color:#e0e0e0;">
            <span style="display:flex; align-items:center;">${getIconHTML('凱')} 凱: <span class="${getAmtClass(group.gai)}" style="margin-left:5px;">${formatAmt(group.gai)}</span>${getRateBadgeHtml(group.gaiInvest, group.gaiReturn)}</span>
            <span style="display:flex; align-items:center;">${getIconHTML('史弥')} 史弥: <span class="${getAmtClass(group.fumiya)}" style="margin-left:5px;">${formatAmt(group.fumiya)}</span>${getRateBadgeHtml(group.fumiyaInvest, group.fumiyaReturn)}</span>
          </div>
          <div style="padding:10px; background:#3e2723; border-radius:8px; border:1px solid #5d4037; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:bold; color:#ff9800; margin-bottom:5px;">💡 この日の清算（割り勘）</div>
            ${settlementHtml}
          </div>
          <div class="date-summary-total" style="border-top-color:#555; color:#e0e0e0;">
            👥 2人の合計損益: <span class="${getAmtClass(total)}">${formatAmt(total)}</span>
            ${currentCat === '競馬' ? `<span style="font-size:13px; color:#ff9800; font-weight:bold; margin-left:8px;">(${getRateStr(dailyTotalInvest, dailyTotalReturn)})</span>` : ''}
          </div>
        </div>
    `;
    
    group.records.forEach(item => {
       let details = `💸 投資: ¥${Number(item.col3).toLocaleString()} / 💰 回収: ¥${Number(item.col4).toLocaleString()}`;
       let profit = item.col5;
       let pClass = profit < 0 ? "minus-text" : "plus-text";
       let encodedItem = encodeURIComponent(JSON.stringify(item));

       html += `
         <div class="history-card" style="border-radius:0;">
           <div class="history-header">
             <span style="display:flex; align-items:center;">${getIconHTML(item.name)} <b>${item.name}</b></span>
           </div>
           <div class="history-title">${details}</div>
           <div class="history-profit ${pClass}">収支: ${formatAmt(profit)}</div>
           <div class="history-notes">🗒️ 備考: ${item.col6 || "なし"}</div>
           <div class="history-actions">
             <button class="action-btn edit-btn" data-item="${encodedItem}" onclick='openModal(this)'>✏️ 編集</button>
             <button class="action-btn del-btn" onclick='deleteRecord(${item.row})'>🗑️ 削除</button>
           </div>
         </div>
       `;
    });
    html += `</div>`; 
  });

  appCache['historyHtml_' + currentCat] = html; 
  container.innerHTML = html;
}

function deleteRecord(row) {
  if(!confirm("本当にこの記録を削除しますか？")) return;
  const cat = document.getElementById('history-category').value;
  document.getElementById('history-list').innerHTML = "⏳ 削除しています...";
  callGAS('deleteRecord', [cat, row]).then(function(msg) {
    alert(msg); 
    clearAppCache(); 
    loadHistory();
  });
}

function openModal(btnElement) {
  const itemStr = decodeURIComponent(btnElement.getAttribute('data-item'));
  const item = JSON.parse(itemStr);

  const cat = document.getElementById('history-category').value;
  document.getElementById('edit-category').value = cat;
  document.getElementById('edit-row').value = item.row;
  document.getElementById('edit-date').value = item.date;
  document.getElementById('edit-name').value = item.name;

  if (cat === '株') {
    document.getElementById('edit-kabu-fields').style.display = 'block';
    document.getElementById('edit-gamble-fields').style.display = 'none';
    document.getElementById('edit-kabu-name').value = item.col3;
    document.getElementById('edit-kabu-profit').value = item.col4;
    document.getElementById('edit-notes').value = item.col5;
  } else {
    document.getElementById('edit-kabu-fields').style.display = 'none';
    document.getElementById('edit-gamble-fields').style.display = 'block';
    document.getElementById('edit-gamble-invest').value = item.col3;
    document.getElementById('edit-gamble-return').value = item.col4;
    document.getElementById('edit-notes').value = item.col6;
  }
  document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

function saveEdit() {
  const cat = document.getElementById('edit-category').value;
  const row = document.getElementById('edit-row').value;

  let data = {
    category: cat,
    date: document.getElementById('edit-date').value,
    name: document.getElementById('edit-name').value,
    notes: document.getElementById('edit-notes').value
  };

  if(cat === '株') {
    data.itemName = document.getElementById('edit-kabu-name').value;
    data.profit = document.getElementById('edit-kabu-profit').value;
  } else {
    data.investAmt = document.getElementById('edit-gamble-invest').value;
    data.returnAmt = document.getElementById('edit-gamble-return').value;
  }

  closeModal();
  document.getElementById('history-list').innerHTML = "⏳ 更新しています...";
  callGAS('updateRecord', [cat, row, data]).then(function(msg) {
    alert(msg); 
    clearAppCache(); 
    loadHistory();
  });
}
