const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFile = '/Users/hoangquan/Downloads/lognew1.proxymanlogv2';
const tempDir = '/Users/hoangquan/Downloads/temp_headers_only';

if (!fs.existsSync(logFile)) {
    console.error("Không tìm thấy file log!");
    process.exit(1);
}

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);
execSync(`python3 -c "import zipfile; zipfile.ZipFile('${logFile}').extractall('${tempDir}')"`);

const file = 'request_4_5842';
const filePath = path.join(tempDir, file);

if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const logData = JSON.parse(content);
    const req = logData.request || {};
    
    const reqHeaders = {};
    (req.header?.entries || req.headers || []).forEach(h => reqHeaders[h.key?.name || h.name] = h.value);
    
    fs.writeFileSync('/Users/hoangquan/Downloads/lognew_request_headers.json', JSON.stringify(reqHeaders, null, 2), 'utf-8');
    console.log("Đã lưu headers vào lognew_request_headers.json!");
} else {
    console.error("Không tìm thấy file!");
}

execSync(`rm -rf "${tempDir}"`);
