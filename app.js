
const qs = (s, el=document) => el.querySelector(s);
const timeKey = (u) => `ga_pos_${u}`;

function extractDriveId(input) {
  if (!input) return null;
  try {
    const idParam = (new URL(input)).searchParams.get('id');
    if (idParam) return idParam;
  } catch {}
  const m1 = String(input).match(/\/file\/d\/([^/]+)/);
  if (m1) return m1[1];
  const m2 = String(input).match(/id=([^&]+)/);
  if (m2) return m2[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;
  return null;
}
function toDirectDriveUrl(urlOrId) {
  if (typeof urlOrId !== 'string') return urlOrId;
  if (!urlOrId.includes('drive.google.com') && !/^[A-Za-z0-9_-]{10,}$/.test(urlOrId)) return urlOrId;
  const id = extractDriveId(urlOrId) || urlOrId;
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function main() {
  const listEl = qs('#list');
  const searchEl = qs('#search');
  const reloadBtn = qs('#reload');
  const audio = qs('#player');
  const nowLabel = qs('#now');
  const rateSel = qs('#rate');
  const loopEl = qs('#loop');

  let audios = [];
  let filtered = [];
  let selected = null;

  async function loadJSON() {
    const res = await fetch('audio.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`audio.json を取得できません (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('audio.json は配列である必要があります');
    audios = data.map((it, i) => ({
      title: it.title || `Track ${i+1}`,
      url: toDirectDriveUrl(it.url || it.id || '')
    }));
    filtered = audios.slice();
    renderList();
    if (filtered.length) select(filtered[0]);
  }

  function renderList() {
    listEl.innerHTML = '';
    filtered.forEach((it) => {
      const btn = document.createElement('button');
      btn.className = 'item' + (selected && selected.url===it.url ? ' active' : '');
      btn.innerHTML = `<div style="font-weight:600">${it.title}</div><div class="small" style="word-break:break-all">${it.url}</div>`
      btn.onclick = () => select(it);
      listEl.appendChild(btn);
    });
    if (!filtered.length) {
      const d = document.createElement('div');
      d.className = 'small';
      d.textContent = '一致する音源がありません。';
      listEl.appendChild(d);
    }
  }

  function select(it) {
    selected = it;
    nowLabel.textContent = it.title;
    audio.src = it.url;
    audio.playbackRate = Number(rateSel.value);
    audio.loop = loopEl.checked;
    const t = localStorage.getItem(timeKey(it.url));
    if (t) {
      const sec = Number(t);
      if (!Number.isNaN(sec)) audio.currentTime = sec;
    }
    renderList();
  }

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    filtered = !q ? audios : audios.filter(a => a.title.toLowerCase().includes(q));
    renderList();
  });
  reloadBtn.addEventListener('click', () => location.reload());
  rateSel.addEventListener('change', () => { audio.playbackRate = Number(rateSel.value); });
  loopEl.addEventListener('change', () => { audio.loop = loopEl.checked; });
  audio.addEventListener('timeupdate', () => {
    if (!selected) return;
    localStorage.setItem(timeKey(selected.url), String(audio.currentTime));
  });
  audio.addEventListener('error', () => {
    alert('このURLは再生できません。Driveの共有設定（「リンクを知っている全員が閲覧可」）を確認してください。');
  });

  await loadJSON();
}
document.addEventListener('DOMContentLoaded', main);
