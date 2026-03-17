import { getSettings, setSettings, pingGateway } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);

function addTargetRow(value = '') {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  wrap.innerHTML = `
    <input class="targetUrl" type="text" placeholder="https://.../realtime_report.php" />
    <button class="btn btn-small btn-danger" type="button">Remove</button>
  `;
  wrap.querySelector('input').value = value;
  wrap.querySelector('button').addEventListener('click', () => wrap.remove());
  $('targets').appendChild(wrap);
}

function readTargetsFromDom() {
  const inputs = Array.from(document.querySelectorAll('input.targetUrl'));
  const urls = inputs
    .map((i) => i.value.trim())
    .filter(Boolean);
  // de-dupe (preserve order)
  const seen = new Set();
  return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

async function load() {
  const settings = await getSettings();
  $('gatewayBaseUrl').value = settings.gatewayBaseUrl;

  $('targets').innerHTML = '';
  const urls = Array.isArray(settings.target?.reportPageUrls) ? settings.target.reportPageUrls : [];
  if (urls.length) {
    for (const u of urls) addTargetRow(u);
  } else {
    addTargetRow('');
  }
}

async function onSave() {
  const url = $('gatewayBaseUrl').value.trim();
  const reportPageUrls = readTargetsFromDom();
  await setSettings({ gatewayBaseUrl: url, target: { reportPageUrls } });
  $('msg').textContent = 'Saved.';
  $('msg').className = 'msg ok';
}

async function onTest() {
  const url = $('gatewayBaseUrl').value.trim();
  const ok = await pingGateway(url);
  $('msg').textContent = ok ? 'Gateway is online.' : 'Gateway is offline/unreachable.';
  $('msg').className = `msg ${ok ? 'ok' : 'err'}`;
}

$('save').addEventListener('click', onSave);
$('test').addEventListener('click', onTest);
$('addTarget').addEventListener('click', () => addTargetRow(''));

load();

