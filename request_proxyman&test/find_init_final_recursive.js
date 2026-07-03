const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFiles = [
    '/Users/hoangquan/Downloads/lognew1.proxymanlogv2',
    '/Users/hoangquan/Downloads/moitailaiapp.proxymanlogv2',
    '/Users/hoangquan/Downloads/moinhat1.proxymanlogv2',
    '/Users/hoangquan/Downloads/getxu.proxymanlogv2',
    '/Users/hoangquan/Downloads/api.mydramawave.com_07-02-2026-15-09-13.proxymanlogv2',
    '/Users/hoangquan/Downloads/getthuocphim_quangcao.proxymanlogv2'
];

const tempDir = '/Users/hoangquan/Downloads/temp_recursive_final';

// Hàm walk đệ quy thực sự
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

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    const zipTempDir = path.join(tempDir, path.basename(zipFile, '.proxymanlogv2'));
    execSync(`mkdir -p "${zipTempDir}"`);
    
    try {
        // Tăng buffer và giải nén
        execSync(`unzip -o "${zipFile}" -d "${zipTempDir}"`, { maxBuffer: 500 * 1024 * 1024 });
    } catch(e) {}
});

// Quét đệ quy toàn bộ thư mục tạm
console.log("Bắt đầu quét đệ quy...");
const allFiles = walk(tempDir);
console.log(`Tìm thấy tổng cộng ${allFiles.length} file JSON sau khi giải nén.`);

let found = 0;
allFiles.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('user') && content.includes('init')) {
            const logData = JSON.parse(content);
            const req = logData.request || {};
            const res = logData.response || {};
            const url = req.fullPath || req.url || req.uri || '';
            const method = (req.method.name || req.method || '').toUpperCase();
            
            if (url.includes('/user/init') && method === 'POST' && res.status?.code === 200) {
                found++;
                console.log(`\n=========================================`);
                console.log(`⭐ [ĐÃ TÌM THẤY] File: ${path.relative(tempDir, filePath)}`);
                console.log(`URL: ${url}`);
                console.log(`=========================================`);
                
                console.log(`Request Headers:`);
                const reqHeaders = {};
                (req.header?.entries || req.headers || []).forEach(h => reqHeaders[h.key?.name || h.name] = h.value);
                console.log(JSON.stringify(reqHeaders, null, 2));
                
                console.log(`Request Body:`);
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
                
                console.log(`Response Code:`, res.status?.code);
            }
        }
    } catch(e) {}
});

console.log(`\nQuét xong! Tìm thấy ${found} request init hợp lệ.`);
execSync(`rm -rf "${tempDir}"`);
