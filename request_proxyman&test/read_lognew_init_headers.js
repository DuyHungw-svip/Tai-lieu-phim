const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFile = '/Users/hoangquan/Downloads/lognew1.proxymanlogv2';
const tempDir = '/Users/hoangquan/Downloads/temp_read_lognew_init';

if (!fs.existsSync(logFile)) {
    console.error("Không tìm thấy file log!");
    process.exit(1);
}

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);

try {
    // Giải nén bằng Python an toàn tuyệt đối
    execSync(`python3 -c "import zipfile; zipfile.ZipFile('${logFile}').extractall('${tempDir}')"`);
} catch(e) {
    console.error("Lỗi giải nén:", e.message);
    process.exit(1);
}

const targetFile = 'request_4_5842';
const filePath = path.join(tempDir, targetFile);

if (fs.existsSync(filePath)) {
    console.log(`🎉 🎉 TÌM THẤY FILE: ${targetFile}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const logData = JSON.parse(content);
    const req = logData.request || {};
    const res = logData.response || {};
    
    console.log("=== REQUEST URL & METHOD ===");
    console.log(`${req.method.name || req.method} ${req.fullPath || req.url}`);
    
    console.log("\n=== REQUEST HEADERS ===");
    const reqHeaders = {};
    (req.header?.entries || req.headers || []).forEach(h => reqHeaders[h.key?.name || h.name] = h.value);
    console.log(JSON.stringify(reqHeaders, null, 2));
    
    console.log("\n=== REQUEST BODY ===");
    if (req.bodyData) {
        const bodyText = Buffer.from(req.bodyData, 'base64').toString('utf-8');
        try {
            console.log(JSON.stringify(JSON.parse(bodyText), null, 2));
        } catch(e) {
            console.log(bodyText);
        }
    } else {
        console.log("No body");
    }
} else {
    console.error(`Không tìm thấy file ${targetFile} trong thư mục giải nén!`);
}

execSync(`rm -rf "${tempDir}"`);
