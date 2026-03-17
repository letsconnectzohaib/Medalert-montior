import { getSettings, setSettings, pingGateway } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);

async function load() {
  const settings = await getSettings();
  $('gatewayBaseUrl').value = settings.gatewayBaseUrl;
}

async function onSave() {
  const url = $('gatewayBaseUrl').value.trim();
  await setSettings({ gatewayBaseUrl: url });
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

load();

