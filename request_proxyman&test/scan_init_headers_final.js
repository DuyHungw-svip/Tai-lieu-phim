const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const execSync = require('child_process').execSync;

const logFiles = [
    '/Users/hoangquan/Downloads/lognew1.proxymanlogv2',
    '/Users/hoangquan/Downloads/moitailaiapp.proxymanlogv2',
    '/Users/hoangquan/Downloads/moinhat1.proxymanlogv2',
    '/Users/hoangquan/Downloads/getxu.proxymanlogv2',
    '/Users/hoangquan/Downloads/api.mydramawave.com_07-02-2026-15-09-13.proxymanlogv2',
    '/Users/hoangquan/Downloads/getthuocphim_quangcao.proxymanlogv2'
];

const tempDir = '/Users/hoangquan/Downloads/temp_scan_headers_final';

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    const zipTempDir = path.join(tempDir, path.basename(zipFile, '.proxymanlogv2'));
    execSync(`mkdir -p "${zipTempDir}"`);
    
    try {
        execSync(`unzip -o "${zipFile}" -d "${zipTempDir}"`, { maxBuffer: 500 * 1024 * 1024 });
    } catch(e) {}
    
    if (!fs.existsSync(zipTempDir)) return;
    
    const files = fs.readdirSync(zipTempDir);
    files.forEach(file => {
        const filePath = path.join(zipTempDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const logData = JSON.parse(content);
            const req = logData.request || {};
            const res = logData.response || {};
            const url = req.fullPath || req.url || req.uri || '';
            const host = (req.host || '').toLowerCase();
            const method = (req.method.name || req.method || '').toUpperCase();
            
            // DÙNG ĐÚNG BỘ LỌC CỦA SCAN_ALL_POSTS
            if (method === 'POST' && (host.includes('mydramawave') || url.includes('mydramawave'))) {
                // Chỉ quan tâm URL chứa /user/init
                if (url.includes('/user/init')) {
                    console.log(`\n=========================================`);
                    console.log(`⭐ [ĐÃ TÌM THẤY] ZIP: ${path.basename(zipFile)} | File: ${file}`);
                    console.log(`URL: ${url}`);
                    console.log(`=========================================`);
                    
                    console.log(`Request Headers (FULL):`);
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
                    
                    console.log(`\nResponse Code:`, res.status?.code || res.status);
                }
            }
        } catch(e) {}
    });
    
    execSync(`rm -rf "${zipTempDir}"`);
});

execSync(`rm -rf "${tempDir}"`);
