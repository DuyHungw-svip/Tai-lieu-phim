const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFile = '/Users/hoangquan/Downloads/moitailaiapp.proxymanlogv2';
const tempDir = '/Users/hoangquan/Downloads/temp_python_extract';

if (!fs.existsSync(logFile)) {
    console.error("Không tìm thấy file log!");
    process.exit(1);
}

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);

console.log("Đang giải nén bằng Python zipfile...");
try {
    // Lệnh Python một dòng giải nén an toàn 100%
    execSync(`python3 -c "import zipfile; zipfile.ZipFile('${logFile}').extractall('${tempDir}')"`);
    console.log("Giải nén thành công!");
} catch(e) {
    console.error("Lỗi giải nén bằng Python:", e.message);
    process.exit(1);
}

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

const allFiles = walk(tempDir);
console.log(`Tổng số file giải nén được thực tế bằng Python: ${allFiles.length}`);

let found = 0;
allFiles.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Parse JSON
        const logData = JSON.parse(content);
        const req = logData.request || {};
        const res = logData.response || {};
        const url = req.fullPath || req.url || req.uri || '';
        
        if (url.toLowerCase().includes('user/init')) {
            found++;
            console.log(`\n=========================================`);
            console.log(`[ĐÃ TÌM THẤY BẰNG PYTHON] File: ${path.relative(tempDir, filePath)}`);
            console.log(`URL: ${url}`);
            console.log(`Method: ${req.method.name || req.method}`);
            console.log(`Response Status:`, JSON.stringify(res.status));
            
            console.log(`\nRequest Headers:`);
            const reqHeaders = {};
            (req.header?.entries || req.headers || []).forEach(h => reqHeaders[h.key?.name || h.name] = h.value);
            console.log(JSON.stringify(reqHeaders, null, 2));
            
            console.log(`\nRequest Body:`);
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
            
            console.log(`\nResponse Body:`);
            if (res.bodyData) {
                let rawBuffer = Buffer.from(res.bodyData, 'base64');
                let dec = rawBuffer;
                try {
                    dec = require('zlib').gunzipSync(rawBuffer);
                } catch(e) {
                    try {
                        dec = require('zlib').brotliDecompressSync(rawBuffer);
                    } catch(e2) {}
                }
                console.log(dec.toString('utf-8').slice(0, 1000));
            } else {
                console.log("No response body");
            }
        }
    } catch(e) {}
});

execSync(`rm -rf "${tempDir}"`);
