// ============================================================
//  設定エリア — ここだけ書き換えてください
// ============================================================
const JSONBIN_API_KEY = '$2a$10$WDGQTE/btFlRftllospkteq7ZV7vhhVc00FWwTSY0SnuHjPUPHKsK'; // JSONBinのAPIキー($2a$...)

const BIN_IDS = {
  kabu_unsettled : '69b55d3aaa77b81da9e3d759',
  kabu_history   : '69b55d3bc3097a1dd524aee1',
  pachinko       : '69b55d3caa77b81da9e3d767',
  keiba          : '69b55d3db7ec241ddc6a026a',
  portfolio      : '69b55d3eaa77b81da9e3d76f',
};
// ============================================================

// ---------- JSONBin 通信ラッパー ----------
const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_API_KEY,
  'X-Bin-Versioning': 'false'  // バージョン管理OFF（常に最新を上書き）
};

async function binGet(binKey) {
  const res = await fetch(`${JSONBIN_BASE}/${BIN_IDS[binKey]}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_API_KEY }
  });
  if (!res.ok) throw new Error(`GET失敗[${binKey}]: ${res.status}`);
  const json = await res.json();
  return json.record;
}

async function binPut(binKey, data) {
  const res = await fetch(`${JSONBIN_BASE}/${BIN_IDS[binKey]}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT失敗[${binKey}]: ${res.status}`);
  return (await res.json()).record;
}

// ---------- ID生成 ----------
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- キャッシュ ----------
let appCache = {};
let currentCategory = '株';

function clearAppCache() { appCache = {}; }

// ---------- 名言 ----------
const quotes = [
  { text: "「迷ったら…望みだろ…！<br>望みに進むのが<br>気持ちのいい人生ってもんだろっ…！」", author: "～伊藤開司～" },
  { text: "「金は命より重い」", author: "～利根川幸雄～" },
  { text: "「やらなくてどうするっ…！！<br>勝つ為に生きなくてどうするっ…！！」", author: "～伊藤開司～" },
  { text: "「ギャンブルのどこが悪い！<br>入試、就職、結婚、<br>みんなギャンブルみたいなもんだろ！<br>人生すべて博打だぞ！」", author: "～両津勘吉～" },
  { text: "「勝ちもせず生きようとすることが<br>そもそも論外なのだ」", author: "～利根川幸雄～" },
  { text: "「いっちゃ悪いが、奴ら正真正銘のクズ…<br>負けたからクズってことじゃなくて<br>可能性を追わないからクズ…」", author: "～伊藤開司～" },
  { text: "「駆け巡る脳内物質っ…！」", author: "～鷲巣 巌～" },
  { text: "「不合理こそ博打…<br>それが博打の本質、博打の快感…<br>不合理に身を委ねてこそギャンブル」", author: "～赤木しげる～" },
  { text: "「無意味な死か。<br>その"無意味な死"ってやつが。<br>まさにギャンブル。なんじゃないの。」", author: "～赤木しげる～" },
  { text: "「勝たなきゃダメだ…。<br>勝たなきゃ悲惨がむしろ当たり前。<br>勝たなきゃ誰かの養分…。」", author: "～伊藤開司～" },
  { text: "「博打に『どうして』があるかよっ…！<br>張る時は張るんだっ…！」", author: "～伊藤開司～" },
  { text: "「待つんだよぉ」", author: "～マンエンマン～" }
];

function setRandomQuote() {
  try {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote-box').innerHTML = q.text + "<span class='quote-author'>" + q.author + "</span>";
  } catch(e) {}
}

// ---------- アイコン ----------
const ICON_GAI    = "https://i.ibb.co/23K2Hrv3/hachiware-768x529.jpg";
const ICON_FUMIYA = "https://i.ibb.co/9HTwPnfm/kurimanjyu-768x539.jpg";

function getIconHTML(name, isLarge = false) {
  const cls = isLarge ? 'large-inline-icon' : 'inline-icon';
  if (name === '凱')  return `<img src='${ICON_GAI}'    class='${cls}' alt='凱'>`;
  if (name === '史弥') return `<img src='${ICON_FUMIYA}' class='${cls}' alt='史弥'>`;
  return "👤";
}

// ---------- 表示ユーティリティ ----------
function formatAmt(val) {
  return (val < 0 ? "" : "+") + "¥" + Number(val).toLocaleString();
}
function getAmtClass(val) { return val < 0 ? "minus-text" : "plus-text"; }
function getRateStr(invest, ret) {
  if (invest === 0) return ret > 0 ? "100%+" : "0%";
  return Math.floor((ret / invest) * 100) + "%";
}

// ---------- 初期化 ----------
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
  const dateStr = today.getFullYear() + '-'
    + String(today.getMonth() + 1).padStart(2, '0') + '-'
    + String(today.getDate()).padStart(2, '0');
  document.getElementById('gai-date').value    = dateStr;
  document.getElementById('fumiya-date').value = dateStr;
}

// ---------- 画面切り替え ----------
function switchMain(viewId, btnElement) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  window.scrollTo(0, 0);
  if (viewId === 'top')       { loadTotals(); setRandomQuote(); }
  if (viewId === 'portfolio')   loadPortfolio();
}

function goToHistory(category, btnElement) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById('view-history').classList.add('active');
  window.scrollTo(0, 0);
  document.getElementById('history-category').value = category;
  const icons = { '株': '📈', 'パチンコ': '🎰', '競馬': '🐎' };
  document.getElementById('history-page-title').innerText = (icons[category] || '📜') + ' ' + category + ' の履歴';
  loadHistory();
}

function switchTab(category, btnElement) {
  currentCategory = category;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  if (category === '株') {
    document.querySelectorAll('.page-kabu').forEach(el => el.classList.add('active'));
    document.querySelectorAll('.page-gamble').forEach(el => el.classList.remove('active'));
  } else {
    document.querySelectorAll('.page-kabu').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.page-gamble').forEach(el => el.classList.add('active'));
  }
}

// ============================================================
//  株価取得（Yahoo Finance非公式API → CORSプロキシ経由）
// ============================================================
async function fetchStockPrice(code) {
  const symbol = code + '.T';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  try {
    const res  = await fetch(proxy);
    const json = await res.json();
    const data = JSON.parse(json.contents);
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0) return Math.round(price);
  } catch(e) {}
  return 0; // 取得失敗時
}

// ============================================================
//  ホーム：合計取得
// ============================================================
async function loadTotals() {
  if (appCache.totalsData) { renderTotalsDisplay(appCache.totalsData); return; }
  try {
    const [unsettled, history, pachi, keiba, portfolio] = await Promise.all([
      binGet('kabu_unsettled'),
      binGet('kabu_history'),
      binGet('pachinko'),
      binGet('keiba'),
      binGet('portfolio')
    ]);

    // 株（確定済み）合計
    let kabuTotal = 0;
    (history.records || []).forEach(r => { kabuTotal += Number(r.profit) || 0; });
    // 株（未清算）も加算
    (unsettled.records || []).forEach(r => { kabuTotal += Number(r.profit) || 0; });

    // パチンコ合計
    let pachiTotal = 0;
    (pachi.records || []).forEach(r => { pachiTotal += (Number(r.returnAmt) - Number(r.investAmt)) || 0; });

    // 競馬合計
    let keibaTotal = 0;
    (keiba.records || []).forEach(r => { keibaTotal += (Number(r.returnAmt) - Number(r.investAmt)) || 0; });

    // 持ち株評価損益（株価取得が必要なため別途計算）
    let portfolioTotal = 0;
    const codes = [...new Set((portfolio.records || []).map(r => r.code))];
    const prices = {};
    await Promise.all(codes.map(async c => { prices[c] = await fetchStockPrice(c); }));
    (portfolio.records || []).forEach(r => {
      const cur = prices[r.code] || 0;
      portfolioTotal += (cur - Number(r.buyPrice)) * Number(r.amount);
    });

    const totals = {
      '株': kabuTotal,
      '評価損益': Math.round(portfolioTotal),
      'パチンコ': pachiTotal,
      '競馬': keibaTotal,
      '総合': kabuTotal + Math.round(portfolioTotal) + pachiTotal + keibaTotal
    };
    appCache.totalsData = totals;
    renderTotalsDisplay(totals);
  } catch(e) {
    document.getElementById('top-total-all').innerText = "データ取得失敗";
  }
}

function renderTotalsDisplay(totals) {
  setTopTotal('top-total-kabu',      totals['株']);
  setTopTotal('top-total-portfolio', totals['評価損益']);
  setTopTotal('top-total-pachi',     totals['パチンコ']);
  setTopTotal('top-total-keiba',     totals['競馬']);
  document.getElementById('top-total-all').innerText = "¥" + totals['総合'].toLocaleString();
}

function setTopTotal(id, val) {
  const el = document.getElementById(id);
  el.innerText = "¥" + Number(val).toLocaleString();
  val < 0 ? el.classList.add('minus') : el.classList.remove('minus');
}

// ============================================================
//  入力：一括登録
// ============================================================
async function submitForm() {
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('message');

  const buildRecord = (prefix) => {
    const base = {
      id    : genId(),
      date  : document.getElementById(prefix + '-date').value,
      name  : prefix === 'gai' ? '凱' : '史弥',
      notes : document.getElementById(prefix + '-notes').value
    };
    if (currentCategory === '株') {
      base.itemName = document.getElementById(prefix + '-kabu-name').value;
      base.profit   = Number(document.getElementById(prefix + '-kabu-profit').value) || 0;
    } else {
      base.investAmt = Number(document.getElementById(prefix + '-gamble-invest').value) || 0;
      base.returnAmt = Number(document.getElementById(prefix + '-gamble-return').value) || 0;
    }
    return base;
  };

  const gaiRec    = buildRecord('gai');
  const fumiyaRec = buildRecord('fumiya');

  // 空入力チェック（両方0はスキップ）
  const isEmpty = (r) => currentCategory === '株'
    ? (r.profit === 0 && !r.itemName)
    : (r.investAmt === 0 && r.returnAmt === 0);

  btn.disabled = true; btn.innerText = "⏳ 登録中..."; msg.innerText = "";

  try {
    const binKey = currentCategory === '株' ? 'kabu_unsettled'
                 : currentCategory === 'パチンコ' ? 'pachinko' : 'keiba';

    const current = await binGet(binKey);
    const records = current.records || [];

    if (!isEmpty(gaiRec))    records.push(gaiRec);
    if (!isEmpty(fumiyaRec)) records.push(fumiyaRec);

    await binPut(binKey, { records });

    msg.style.color = "#4caf50";
    msg.innerText = "✅ 登録しました！";
    document.getElementById('recordForm').reset();
    resetDates();
    clearAppCache();
  } catch(e) {
    msg.style.color = "#e57373";
    msg.innerText = "エラー: " + e.message;
  } finally {
    btn.disabled = false; btn.innerText = "一括登録する";
  }
}

// ============================================================
//  持ち株：追加
// ============================================================
async function submitPortfolio() {
  const btn = document.getElementById('portSubmitBtn');
  const msg = document.getElementById('port-message');

  const rec = {
    id      : genId(),
    name    : document.getElementById('port-name').value,
    code    : document.getElementById('port-code').value,
    itemName: document.getElementById('port-item').value,
    amount  : Number(document.getElementById('port-amount').value),
    buyPrice: Number(document.getElementById('port-price').value)
  };

  btn.disabled = true; btn.innerText = "⏳ 登録中..."; msg.innerText = "";
  try {
    const current = await binGet('portfolio');
    const records = current.records || [];
    records.push(rec);
    await binPut('portfolio', { records });
    msg.style.color = "#4caf50"; msg.innerText = "✅ 追加しました！";
    document.getElementById('portfolioForm').reset();
    clearAppCache();
    loadPortfolio();
  } catch(e) {
    msg.style.color = "#e57373"; msg.innerText = "エラー: " + e.message;
  } finally {
    btn.disabled = false; btn.innerText = "ポートフォリオに追加";
  }
}

// ============================================================
//  持ち株：表示
// ============================================================
async function loadPortfolio() {
  if (appCache.portfolioHtml) {
    document.getElementById('portfolio-list').innerHTML = appCache.portfolioHtml;
    return;
  }
  document.getElementById('portfolio-list').innerHTML = "⏳ 株価データを取得中...（数秒かかります）";
  try {
    const data    = await binGet('portfolio');
    const records = data.records || [];

    // 銘柄コードごとに株価を一括取得
    const codes  = [...new Set(records.map(r => r.code))];
    const prices = {};
    await Promise.all(codes.map(async c => { prices[c] = await fetchStockPrice(c); }));

    // profitとcurrentPriceを付与
    const enriched = records.map(r => ({
      ...r,
      currentPrice: prices[r.code] || 0,
      profit: Math.round((prices[r.code] || 0) - Number(r.buyPrice)) * Number(r.amount)
    }));

    renderPortfolio(enriched);
  } catch(e) {
    document.getElementById('portfolio-list').innerHTML = "データ取得に失敗しました: " + e.message;
  }
}

function renderPortfolio(data) {
  const container = document.getElementById('portfolio-list');
  if (data.length === 0) {
    const h = "<p style='color:#aaa; text-align:center;'>保有中の株はありません。</p>";
    appCache.portfolioHtml = h; container.innerHTML = h; return;
  }

  // 共通保有銘柄
  let groupedByCode = {};
  data.forEach(item => {
    if (!groupedByCode[item.code]) groupedByCode[item.code] = { itemName: item.itemName, currentPrice: item.currentPrice, gai: null, fumiya: null };
    const key = item.name === '凱' ? 'gai' : 'fumiya';
    if (!groupedByCode[item.code][key]) groupedByCode[item.code][key] = { amount: 0, invest: 0, profit: 0 };
    groupedByCode[item.code][key].amount  += item.amount;
    groupedByCode[item.code][key].invest  += item.buyPrice * item.amount;
    groupedByCode[item.code][key].profit  += item.profit;
  });

  let html = "";
  let commonHtml = "";
  for (let code in groupedByCode) {
    const info = groupedByCode[code];
    if (info.gai && info.fumiya) {
      const totalProfit  = info.gai.profit + info.fumiya.profit;
      const totalAmount  = info.gai.amount + info.fumiya.amount;
      const averagePrice = totalAmount > 0 ? (info.gai.invest + info.fumiya.invest) / totalAmount : 0;
      commonHtml += `
        <div class="history-card" style="border-color:#ffb74d; margin-bottom:10px; background:#2a1c0a;">
          <div class="history-title" style="color:#ffb74d;">🏢 ${info.itemName} (${code})</div>
          <div style="font-size:12px; color:#aaa; margin-bottom:10px;">現在の株価: ¥${info.currentPrice > 0 ? info.currentPrice.toLocaleString() : "取得中"}</div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; color:#e0e0e0;">
            <span style="display:flex; align-items:center;">${getIconHTML('凱')} 凱: ${info.gai.amount}株 <span class="${getAmtClass(info.gai.profit)}" style="margin-left:5px;">${formatAmt(info.gai.profit)}</span></span>
            <span style="display:flex; align-items:center;">${getIconHTML('史弥')} 史弥: ${info.fumiya.amount}株 <span class="${getAmtClass(info.fumiya.profit)}" style="margin-left:5px;">${formatAmt(info.fumiya.profit)}</span></span>
          </div>
          <div style="background:#3e2723; padding:8px; border-radius:6px; margin-bottom:8px; font-size:12px; color:#ddd; text-align:center;">
            合算株数: <b>${totalAmount.toLocaleString()}株</b> ／ 平均取得単価: <b>¥${averagePrice.toLocaleString(undefined, {maximumFractionDigits:1})}</b>
          </div>
          <div style="border-top:1px dashed #555; padding-top:8px; font-weight:bold; font-size:15px; text-align:center;">
            👥 2人合計の評価損益: <span class="${getAmtClass(totalProfit)}">${formatAmt(totalProfit)}</span>
          </div>
        </div>`;
    }
  }
  if (commonHtml) html += `<h3 style="color:#ffb74d; border-bottom:2px solid #5d4037; padding-bottom:5px; font-size:16px;">🤝 2人の共通保有銘柄</h3>` + commonHtml;

  function personSection(personName, titleColor, borderColor, bgColor) {
    let inner = ""; let totalProfit = 0;
    data.filter(d => d.name === personName).forEach(item => {
      totalProfit += item.profit;
      const encoded = encodeURIComponent(JSON.stringify(item));
      inner += `
        <div class="history-card" style="background:${bgColor};">
          <div class="history-header">
            <span style="color:${titleColor}; font-size:14px; font-weight:bold;">🏢 ${item.itemName} (${item.code})</span>
            <span style="color:#aaa;">${item.amount}株 (取得:¥${item.buyPrice})</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
            <div style="font-size:12px; color:#aaa;">現在値: ¥${item.currentPrice > 0 ? item.currentPrice.toLocaleString() : "取得中"}</div>
            <div class="history-profit ${getAmtClass(item.profit)}" style="margin:0; font-size:15px;">${formatAmt(item.profit)}</div>
          </div>
          <div class="history-actions">
            <button class="action-btn edit-btn" style="background:#1565c0; color:#fff; border-color:#0d47a1;" data-item="${encoded}" onclick='sellPortfolio(this)'>💰 売却して確定</button>
            <button class="action-btn del-btn" onclick='deletePortfolio("${item.id}")'>🗑️ 削除のみ</button>
          </div>
        </div>`;
    });
    let sec = `<h3 style="color:${titleColor}; border-bottom:2px solid ${borderColor}; padding-bottom:5px; margin-top:25px; font-size:16px; display:flex; align-items:center;">${getIconHTML(personName)} ${personName}の保有銘柄</h3>`;
    if (!inner) sec += "<p style='color:#888; font-size:13px; text-align:center;'>保有なし</p>";
    else sec += `<div style="margin-bottom:10px; font-weight:bold; font-size:15px; color:#e0e0e0; text-align:right;">トータル評価損益: <span class="${getAmtClass(totalProfit)}">${formatAmt(totalProfit)}</span></div>` + inner;
    return sec;
  }

  html += personSection('凱',  '#a5d6a7', '#2e4c2e', '#1e1e1e');
  html += personSection('史弥', '#90caf9', '#2e374c', '#1e1e1e');

  appCache.portfolioHtml = html;
  container.innerHTML = html;
}

// ---------- 持ち株：削除 ----------
async function deletePortfolio(id) {
  if (!confirm("※収支履歴には追加せず、ただリストから消すだけですがよろしいですか？")) return;
  document.getElementById('portfolio-list').innerHTML = "⏳ 削除しています...";
  try {
    const current = await binGet('portfolio');
    current.records = (current.records || []).filter(r => r.id !== id);
    await binPut('portfolio', current);
    clearAppCache(); loadPortfolio();
  } catch(e) { alert("エラー: " + e.message); }
}

// ---------- 持ち株：売却して確定 ----------
async function sellPortfolio(btnElement) {
  const item = JSON.parse(decodeURIComponent(btnElement.getAttribute('data-item')));
  const sellPriceStr = prompt(
    `【${item.itemName}】を売却して収支に反映します。\n\n1株あたりの「売却価格」を入力してください。\n（現在の参考価格: ¥${item.currentPrice} / 取得単価: ¥${item.buyPrice}）`,
    item.currentPrice
  );
  if (sellPriceStr === null || sellPriceStr === "") return;
  const sellPrice = Number(sellPriceStr);
  if (isNaN(sellPrice) || sellPrice <= 0) { alert("正しい数値を入力してください。"); return; }

  const finalProfit = Math.round((sellPrice - item.buyPrice) * item.amount);
  if (!confirm(`【${item.itemName}】の確定損益は【 ¥${finalProfit.toLocaleString()} 】になります。\n\n株の収支履歴（未清算）に追加し、持ち株リストから削除しますか？`)) return;

  document.getElementById('portfolio-list').innerHTML = "⏳ 売却処理中...";
  try {
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    // 未清算に追加
    const unsettled = await binGet('kabu_unsettled');
    (unsettled.records = unsettled.records || []).push({
      id: genId(), date: dateStr, name: item.name,
      itemName: item.itemName,
      profit: finalProfit,
      notes: `持ち株から売却 (売却単価:¥${sellPrice})`
    });
    await binPut('kabu_unsettled', unsettled);

    // 持ち株から削除
    const portfolio = await binGet('portfolio');
    portfolio.records = (portfolio.records || []).filter(r => r.id !== item.id);
    await binPut('portfolio', portfolio);

    alert("売却処理が完了しました！");
    clearAppCache(); loadPortfolio();
  } catch(e) { alert("エラー: " + e.message); }
}

// ============================================================
//  履歴：読み込み
// ============================================================
async function loadHistory() {
  const cat = document.getElementById('history-category').value;
  if (appCache['historyHtml_' + cat]) {
    document.getElementById('history-list').innerHTML = appCache['historyHtml_' + cat];
    return;
  }
  document.getElementById('history-list').innerHTML = "⏳ データを読み込んでいます...";
  try {
    if (cat === '株') {
      const [unsettled, history] = await Promise.all([binGet('kabu_unsettled'), binGet('kabu_history')]);
      renderKabuHistory({ unsettled: unsettled.records || [], history: history.records || [] });
    } else {
      const binKey = cat === 'パチンコ' ? 'pachinko' : 'keiba';
      const data = await binGet(binKey);
      renderGambleHistory(data.records || [], cat);
    }
  } catch(e) {
    document.getElementById('history-list').innerHTML = "データ取得に失敗しました: " + e.message;
  }
}

// ============================================================
//  株履歴：描画
// ============================================================
function renderKabuHistory({ unsettled, history }) {
  const container = document.getElementById('history-list');

  // 未清算ステータス集計
  let gaiUnsettled = 0, fumiyaUnsettled = 0;
  unsettled.forEach(r => {
    if (r.name === '凱')  gaiUnsettled   += Number(r.profit) || 0;
    if (r.name === '史弥') fumiyaUnsettled += Number(r.profit) || 0;
  });
  const totalUnsettled = gaiUnsettled + fumiyaUnsettled;

  // 全期間トータル（確定済み + 未清算）
  let totalGaiKabu = gaiUnsettled, totalFumiyaKabu = fumiyaUnsettled;
  history.forEach(r => {
    if (r.name === '凱')  totalGaiKabu   += Number(r.profit) || 0;
    if (r.name === '史弥') totalFumiyaKabu += Number(r.profit) || 0;
  });
  const totalAllKabu = totalGaiKabu + totalFumiyaKabu;

  const diff = Math.abs(fumiyaUnsettled - gaiUnsettled) / 2;
  let settlementHtml;
  if (fumiyaUnsettled > gaiUnsettled)
    settlementHtml = `<div style="display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#e0e0e0;">${getIconHTML('史弥',true)} 史弥 ➡️ ${getIconHTML('凱',true)} 凱 へ</div><span style="font-size:28px;font-weight:bold;color:#ff9800;display:block;margin-top:10px;">¥${diff.toLocaleString()} 渡す</span>`;
  else if (gaiUnsettled > fumiyaUnsettled)
    settlementHtml = `<div style="display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#e0e0e0;">${getIconHTML('凱',true)} 凱 ➡️ ${getIconHTML('史弥',true)} 史弥 へ</div><span style="font-size:28px;font-weight:bold;color:#ff9800;display:block;margin-top:10px;">¥${diff.toLocaleString()} 渡す</span>`;
  else
    settlementHtml = `<span style="font-size:18px;font-weight:bold;color:#4CAF50;">✨ 現在、差額はありません ✨</span>`;

  // 未清算明細
  let gaiDetails = '', fumiyaDetails = '';
  unsettled.forEach(r => {
    const pClass = Number(r.profit) < 0 ? "minus-text" : "plus-text";
    const line = `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:#ccc;"><span>${r.itemName}</span><span class="${pClass}">${formatAmt(Number(r.profit))}</span></div>`;
    if (r.name === '凱')  gaiDetails   += line;
    if (r.name === '史弥') fumiyaDetails += line;
  });

  const perPerson = totalUnsettled / 2;

  let html = `
    <div class="card" style="padding:20px;border:2px solid #ffb74d;margin-bottom:25px;background:#2a1c0a;">
      <h3 style="margin-top:0;margin-bottom:20px;text-align:center;font-size:16px;color:#e0e0e0;">📊 株の未清算ステータス</h3>
      <div style="display:flex;justify-content:space-around;margin-bottom:15px;">
        <div style="text-align:center;background:#1b2e1b;padding:10px;border-radius:8px;border:1px solid #2e4c2e;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(gaiUnsettled)}">${formatAmt(gaiUnsettled)}</div>
          ${gaiDetails ? '<div style="margin-top:8px;border-top:1px dashed #555;padding-top:5px;">' + gaiDetails + '</div>' : ''}
        </div>
        <div style="text-align:center;background:#1b222e;padding:10px;border-radius:8px;border:1px solid #2e374c;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(fumiyaUnsettled)}">${formatAmt(fumiyaUnsettled)}</div>
          ${fumiyaDetails ? '<div style="margin-top:8px;border-top:1px dashed #555;padding-top:5px;">' + fumiyaDetails + '</div>' : ''}
        </div>
      </div>
      <div style="text-align:center;padding:10px;background:#333;border-radius:8px;margin-bottom:15px;">
        <span style="font-size:14px;font-weight:bold;color:#bbb;">👥 2人の未清算合計</span><br>
        <span style="font-size:22px;font-weight:bold;" class="${getAmtClass(totalUnsettled)}">${formatAmt(totalUnsettled)}</span>
        <span style="font-size:13px;color:#aaa;margin-left:8px;">（1人あたり <span class="${getAmtClass(perPerson)}" style="font-weight:bold;">${formatAmt(perPerson)}</span>）</span>
      </div>
      <div style="text-align:center;padding:15px;background:#3e2723;border:2px solid #5d4037;border-radius:12px;margin-bottom:15px;">
        <div style="font-size:14px;font-weight:bold;color:#ff9800;margin-bottom:15px;">💡 清算金額（割り勘）</div>
        ${settlementHtml}
      </div>
      <button onclick="doClearKabuAll()" class="submit-btn" style="background-color:#2e7d32;margin:0;">🔄 清算する（確定済みに移動）</button>
    </div>
  `;

  // 未清算明細一覧
  if (unsettled.length > 0) {
    html += `<h3 style="margin-top:20px;margin-bottom:10px;border-bottom:2px solid #ff9800;padding-bottom:5px;color:#ffb74d;">📋 未清算の明細（${unsettled.length}件）</h3>`;
    html += `<div style="border-radius:8px;border:1px solid #5d4037;overflow:hidden;margin-bottom:25px;">`;
    unsettled.forEach(r => {
      const pClass = Number(r.profit) < 0 ? "minus-text" : "plus-text";
      html += `
        <div class="history-card" style="border-color:#5d4037;background:#2a1c0a;">
          <div class="history-header"><span>📅 ${r.date}</span><span style="display:flex;align-items:center;">${getIconHTML(r.name)} <b>${r.name}</b></span></div>
          <div class="history-title">🏢 銘柄: ${r.itemName}</div>
          <div class="history-profit ${pClass}">収支: ${formatAmt(Number(r.profit))}</div>
          <div class="history-notes">🗒️ 備考: ${r.notes || "なし"}</div>
        </div>`;
    });
    html += `</div>`;
  }

  // 全期間トータル
  html += `
    <div class="card" style="padding:20px;border:2px solid #2e7d32;margin-bottom:25px;background:#0a1a0a;">
      <h3 style="margin-top:0;margin-bottom:20px;text-align:center;font-size:16px;color:#e0e0e0;">📈 株の全期間トータル成績</h3>
      <div style="display:flex;justify-content:space-around;margin-bottom:15px;">
        <div style="text-align:center;background:#1b2e1b;padding:10px;border-radius:8px;border:1px solid #2e4c2e;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(totalGaiKabu)}">${formatAmt(totalGaiKabu)}</div>
        </div>
        <div style="text-align:center;background:#1b222e;padding:10px;border-radius:8px;border:1px solid #2e374c;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(totalFumiyaKabu)}">${formatAmt(totalFumiyaKabu)}</div>
        </div>
      </div>
      <div style="text-align:center;padding:10px;background:#333;border-radius:8px;">
        <span style="font-size:14px;font-weight:bold;color:#bbb;">👥 2人の合計損益</span><br>
        <span style="font-size:22px;font-weight:bold;" class="${getAmtClass(totalAllKabu)}">${formatAmt(totalAllKabu)}</span>
      </div>
    </div>
    <h3 style="margin-top:20px;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:5px;color:#e0e0e0;">📖 過去の確定済み履歴（すべて）</h3>
  `;

  if (history.length === 0) {
    html += "<p style='color:#aaa;'>記録がありません。</p>";
  } else {
    html += `<div style="border-radius:8px;border:1px solid #333;overflow:hidden;">`;
    history.forEach(r => {
      const pClass = Number(r.profit) < 0 ? "minus-text" : "plus-text";
      const encoded = encodeURIComponent(JSON.stringify(r));
      html += `
        <div class="history-card">
          <div class="history-header"><span>📅 ${r.date}</span><span style="display:flex;align-items:center;">${getIconHTML(r.name)} <b>${r.name}</b></span></div>
          <div class="history-title">🏢 銘柄: ${r.itemName}</div>
          <div class="history-profit ${pClass}">確定収支: ${formatAmt(Number(r.profit))}</div>
          <div class="history-notes">🗒️ 備考: ${r.notes || "なし"}</div>
          <div class="history-actions">
            <button class="action-btn edit-btn" data-item="${encoded}" onclick='openModal(this)'>✏️ 編集</button>
            <button class="action-btn del-btn" onclick='deleteRecord("${r.id}", "kabu_history")'>🗑️ 削除</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  appCache['historyHtml_株'] = html;
  container.innerHTML = html;
}

// ---------- 株：清算 ----------
async function doClearKabuAll() {
  if (!confirm("2人分の株収支をリセット(清算)しますか？\n※未清算データが確定済みに移動します。")) return;
  document.getElementById('history-list').innerHTML = "⏳ 清算処理中...";
  try {
    const [unsettled, history] = await Promise.all([binGet('kabu_unsettled'), binGet('kabu_history')]);
    const merged = (history.records || []).concat(unsettled.records || []);
    await Promise.all([
      binPut('kabu_history',   { records: merged }),
      binPut('kabu_unsettled', { records: [] })
    ]);
    alert("清算が完了しました！");
    clearAppCache(); loadHistory();
  } catch(e) { alert("エラー: " + e.message); }
}

// ============================================================
//  ギャンブル履歴：描画
// ============================================================
function renderGambleHistory(records, currentCat) {
  const container = document.getElementById('history-list');
  if (records.length === 0) {
    const h = "<p style='color:#aaa;'>記録がありません。</p>";
    appCache['historyHtml_' + currentCat] = h; container.innerHTML = h; return;
  }

  let gaiInvest = 0, gaiReturn = 0, gaiProfit = 0;
  let fumiyaInvest = 0, fumiyaReturn = 0, fumiyaProfit = 0;
  const dateOrder = [], grouped = {};

  records.forEach(item => {
    const invest = Number(item.investAmt) || 0;
    const ret    = Number(item.returnAmt) || 0;
    const profit = ret - invest;

    if (item.name === '凱')  { gaiInvest += invest; gaiReturn += ret; gaiProfit += profit; }
    else                     { fumiyaInvest += invest; fumiyaReturn += ret; fumiyaProfit += profit; }

    if (!grouped[item.date]) {
      grouped[item.date] = { gai: 0, fumiya: 0, gaiInvest: 0, gaiReturn: 0, fumiyaInvest: 0, fumiyaReturn: 0, records: [] };
      dateOrder.push(item.date);
    }
    grouped[item.date].records.push({ ...item, profit });
    if (item.name === '凱')  { grouped[item.date].gai += profit; grouped[item.date].gaiInvest += invest; grouped[item.date].gaiReturn += ret; }
    else                     { grouped[item.date].fumiya += profit; grouped[item.date].fumiyaInvest += invest; grouped[item.date].fumiyaReturn += ret; }
  });

  const totalProfit    = gaiProfit + fumiyaProfit;
  const totalInvestAll = gaiInvest + fumiyaInvest;
  const totalReturnAll = gaiReturn + fumiyaReturn;

  const getRateHtml  = (inv, ret) => currentCat !== '競馬' ? "" : `<br><span style="color:#ff9800;font-weight:bold;">回収率: ${getRateStr(inv, ret)}</span>`;
  const getRateBadge = (inv, ret) => currentCat !== '競馬' ? "" : ` <span style="font-size:12px;color:#ff9800;font-weight:bold;">(${getRateStr(inv, ret)})</span>`;

  let html = `
    <div class="card" style="padding:20px;border:2px solid #ffb74d;margin-bottom:25px;background:#2a1c0a;">
      <h3 style="margin-top:0;margin-bottom:20px;text-align:center;font-size:16px;color:#e0e0e0;">📊 ${currentCat}の全期間トータル成績</h3>
      <div style="display:flex;justify-content:space-around;margin-bottom:15px;">
        <div style="text-align:center;background:#1b2e1b;padding:10px;border-radius:8px;border:1px solid #2e4c2e;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('凱')} 凱</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:5px;line-height:1.4;">投資: ¥${gaiInvest.toLocaleString()}<br>回収: ¥${gaiReturn.toLocaleString()}${getRateHtml(gaiInvest, gaiReturn)}</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(gaiProfit)}">${formatAmt(gaiProfit)}</div>
        </div>
        <div style="text-align:center;background:#1b222e;padding:10px;border-radius:8px;border:1px solid #2e374c;width:45%;">
          <div style="font-weight:bold;margin-bottom:5px;display:flex;align-items:center;justify-content:center;color:#e0e0e0;">${getIconHTML('史弥')} 史弥</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:5px;line-height:1.4;">投資: ¥${fumiyaInvest.toLocaleString()}<br>回収: ¥${fumiyaReturn.toLocaleString()}${getRateHtml(fumiyaInvest, fumiyaReturn)}</div>
          <div style="font-size:18px;font-weight:bold;" class="${getAmtClass(fumiyaProfit)}">${formatAmt(fumiyaProfit)}</div>
        </div>
      </div>
      <div style="text-align:center;padding:10px;background:#333;border-radius:8px;">
        <span style="font-size:14px;font-weight:bold;color:#bbb;">👥 2人の合計損益</span><br>
        <span style="font-size:22px;font-weight:bold;" class="${getAmtClass(totalProfit)}">${formatAmt(totalProfit)}</span>
        ${currentCat === '競馬' ? `<div style="font-size:14px;color:#ff9800;font-weight:bold;margin-top:5px;">合計回収率: ${getRateStr(totalInvestAll, totalReturnAll)}</div>` : ''}
      </div>
    </div>
    <h3 style="margin-top:20px;margin-bottom:15px;border-bottom:2px solid #333;padding-bottom:5px;font-size:16px;color:#e0e0e0;">📖 日別の入力履歴</h3>
  `;

  const binKey = currentCat === 'パチンコ' ? 'pachinko' : 'keiba';

  dateOrder.forEach(date => {
    const group = grouped[date];
    const total = group.gai + group.fumiya;
    const diff  = Math.abs(group.fumiya - group.gai) / 2;
    let settlementHtml;
    if (group.fumiya > group.gai)
      settlementHtml = `<div style="display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:#e0e0e0;">${getIconHTML('史弥',true)} 史弥 ➡️ ${getIconHTML('凱',true)} 凱 へ</div><span style="font-size:20px;font-weight:bold;color:#ff9800;display:block;margin-top:5px;">¥${diff.toLocaleString()} 渡す</span>`;
    else if (group.gai > group.fumiya)
      settlementHtml = `<div style="display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:#e0e0e0;">${getIconHTML('凱',true)} 凱 ➡️ ${getIconHTML('史弥',true)} 史弥 へ</div><span style="font-size:20px;font-weight:bold;color:#ff9800;display:block;margin-top:5px;">¥${diff.toLocaleString()} 渡す</span>`;
    else
      settlementHtml = `<span style="font-size:16px;font-weight:bold;color:#4CAF50;">✨ 差額なし ✨</span>`;

    html += `
      <div class="date-group" style="border-color:#555;">
        <div class="date-summary" style="background:#252525;border-bottom-color:#555;">
          <div class="date-summary-title" style="color:#90caf9;">📅 ${date} の成績</div>
          <div class="date-summary-details" style="margin-bottom:10px;color:#e0e0e0;">
            <span style="display:flex;align-items:center;">${getIconHTML('凱')} 凱: <span class="${getAmtClass(group.gai)}" style="margin-left:5px;">${formatAmt(group.gai)}</span>${getRateBadge(group.gaiInvest, group.gaiReturn)}</span>
            <span style="display:flex;align-items:center;">${getIconHTML('史弥')} 史弥: <span class="${getAmtClass(group.fumiya)}" style="margin-left:5px;">${formatAmt(group.fumiya)}</span>${getRateBadge(group.fumiyaInvest, group.fumiyaReturn)}</span>
          </div>
          <div style="padding:10px;background:#3e2723;border-radius:8px;border:1px solid #5d4037;margin-bottom:10px;">
            <div style="font-size:12px;font-weight:bold;color:#ff9800;margin-bottom:5px;">💡 この日の清算（割り勘）</div>
            ${settlementHtml}
          </div>
          <div class="date-summary-total" style="border-top-color:#555;color:#e0e0e0;">
            👥 2人の合計損益: <span class="${getAmtClass(total)}">${formatAmt(total)}</span>
            ${currentCat === '競馬' ? `<span style="font-size:13px;color:#ff9800;font-weight:bold;margin-left:8px;">(${getRateStr(group.gaiInvest+group.fumiyaInvest, group.gaiReturn+group.fumiyaReturn)})</span>` : ''}
          </div>
        </div>`;

    group.records.forEach(item => {
      const encoded = encodeURIComponent(JSON.stringify(item));
      html += `
        <div class="history-card" style="border-radius:0;">
          <div class="history-header"><span style="display:flex;align-items:center;">${getIconHTML(item.name)} <b>${item.name}</b></span></div>
          <div class="history-title">💸 投資: ¥${Number(item.investAmt).toLocaleString()} / 💰 回収: ¥${Number(item.returnAmt).toLocaleString()}</div>
          <div class="history-profit ${getAmtClass(item.profit)}">収支: ${formatAmt(item.profit)}</div>
          <div class="history-notes">🗒️ 備考: ${item.notes || "なし"}</div>
          <div class="history-actions">
            <button class="action-btn edit-btn" data-item="${encoded}" onclick='openModal(this)'>✏️ 編集</button>
            <button class="action-btn del-btn" onclick='deleteRecord("${item.id}", "${binKey}")'>🗑️ 削除</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  appCache['historyHtml_' + currentCat] = html;
  container.innerHTML = html;
}

// ============================================================
//  共通：削除
// ============================================================
async function deleteRecord(id, binKey) {
  if (!confirm("本当にこの記録を削除しますか？")) return;
  document.getElementById('history-list').innerHTML = "⏳ 削除しています...";
  try {
    const current = await binGet(binKey);
    current.records = (current.records || []).filter(r => r.id !== id);
    await binPut(binKey, current);
    clearAppCache(); loadHistory();
  } catch(e) { alert("エラー: " + e.message); }
}

// ============================================================
//  モーダル：編集
// ============================================================
function openModal(btnElement) {
  const item = JSON.parse(decodeURIComponent(btnElement.getAttribute('data-item')));
  const cat  = document.getElementById('history-category').value;

  document.getElementById('edit-category').value = cat;
  document.getElementById('edit-row').value       = item.id; // idで管理
  document.getElementById('edit-date').value      = item.date;
  document.getElementById('edit-name').value      = item.name;

  if (cat === '株') {
    document.getElementById('edit-kabu-fields').style.display  = 'block';
    document.getElementById('edit-gamble-fields').style.display = 'none';
    document.getElementById('edit-kabu-name').value   = item.itemName;
    document.getElementById('edit-kabu-profit').value = item.profit;
    document.getElementById('edit-notes').value       = item.notes;
  } else {
    document.getElementById('edit-kabu-fields').style.display  = 'none';
    document.getElementById('edit-gamble-fields').style.display = 'block';
    document.getElementById('edit-gamble-invest').value = item.investAmt;
    document.getElementById('edit-gamble-return').value = item.returnAmt;
    document.getElementById('edit-notes').value         = item.notes;
  }
  document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function saveEdit() {
  const cat = document.getElementById('edit-category').value;
  const id  = document.getElementById('edit-row').value;

  const binKey = cat === '株' ? 'kabu_history'
               : cat === 'パチンコ' ? 'pachinko' : 'keiba';

  closeModal();
  document.getElementById('history-list').innerHTML = "⏳ 更新しています...";
  try {
    const current = await binGet(binKey);
    current.records = (current.records || []).map(r => {
      if (r.id !== id) return r;
      const updated = {
        ...r,
        date : document.getElementById('edit-date').value,
        name : document.getElementById('edit-name').value,
        notes: document.getElementById('edit-notes').value
      };
      if (cat === '株') {
        updated.itemName = document.getElementById('edit-kabu-name').value;
        updated.profit   = Number(document.getElementById('edit-kabu-profit').value);
      } else {
        updated.investAmt = Number(document.getElementById('edit-gamble-invest').value);
        updated.returnAmt = Number(document.getElementById('edit-gamble-return').value);
      }
      return updated;
    });
    await binPut(binKey, current);
    clearAppCache(); loadHistory();
  } catch(e) { alert("エラー: " + e.message); }
}
