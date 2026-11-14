const apkPath = document.querySelector('#apkPath');
const outputDir = document.querySelector('#outputDir');
const status = document.querySelector('#status');
const log = document.querySelector('#log');
const decompileButton = document.querySelector('#decompile');

function addLog(text) {
  log.textContent += text;
  log.scrollTop = log.scrollHeight;
}

function setTool(name, found) {
  document.querySelector(`#${name}Status`).textContent = found ? 'Available' : 'Not found in PATH';
  document.querySelector(`#${name}Dot`).classList.toggle('available', Boolean(found));
}

async function checkTools() {
  try {
    const tools = await window.apkApp.detectTools();
    setTool('jadx', tools.jadx);
    setTool('apktool', tools.apktool);
    setTool('java', tools.java);
  } catch (error) {
    addLog(`Could not check installed tools: ${error.message}\n`);
  }
}

document.querySelector('#browseApk').addEventListener('click', async () => {
  const selected = await window.apkApp.chooseApk();
  if (selected) apkPath.value = selected;
});

document.querySelector('#browseOutput').addEventListener('click', async () => {
  const selected = await window.apkApp.chooseOutput();
  if (selected) outputDir.value = selected;
});

document.querySelector('#clearLog').addEventListener('click', () => { log.textContent = ''; });

window.apkApp.onLog(addLog);

decompileButton.addEventListener('click', async () => {
  if (!apkPath.value || !outputDir.value) {
    status.textContent = 'Choose an APK and output folder first';
    return;
  }
  decompileButton.disabled = true;
  status.textContent = 'Decompiling…';
  addLog('\nStarting local decompilation…\n');
  try {
    const result = await window.apkApp.decompile(apkPath.value, outputDir.value);
    status.textContent = 'Finished';
    addLog(`\nDone. Results saved to ${result.outputDir}\n`);
  } catch (error) {
    status.textContent = 'Failed';
    addLog(`\nError: ${error.message}\n`);
  } finally {
    decompileButton.disabled = false;
  }
});

checkTools();
