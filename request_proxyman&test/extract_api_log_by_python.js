const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFile = '/Users/hoangquan/Downloads/api.mydramawave.com_07-02-2026-15-09-13.proxymanlogv2';
const tempDir = '/Users/hoangquan/Downloads/temp_api_python';

if (!fs.existsSync(logFile)) {
    console.error("Không tìm thấy file log!");
    process.exit(1);
}

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);

console.log("Đang giải nén...");
try {
    execSync(`python3 -c "import zipfile; zipfile.ZipFile('${logFile}').extractall('${tempDir}')"`);
    console.log("Giải nén thành công!");
} catch(e) {
    console.error("Lỗi:", e.message);
    process.exit(1);
}

const list = fs.readdirSync(tempDir);
console.log(`Số file: ${list.length}`);
list.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(tempDir, file), 'utf-8');
        const logData = JSON.parse(content);
        const req = logData.request || {};
        const url = req.fullPath || req.url || '';
        if (url.includes('user/init')) {
            console.log(`TÌM THẤY: ${file} | URL: ${url}`);
            console.log("Headers:", JSON.stringify(req.header?.entries || req.headers));
        }
    } catch(e) {}
});

execSync(`rm -rf "${tempDir}"`);
