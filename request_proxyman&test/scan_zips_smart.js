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

const tempDir = '/Users/hoangquan/Downloads/temp_smart';

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    console.log(`\n=========================================`);
    console.log(`BẮT ĐẦU QUÉT: ${path.basename(zipFile)}`);
    console.log(`=========================================`);
    
    const zipTempDir = path.join(tempDir, path.basename(zipFile, '.proxymanlogv2'));
    execSync(`mkdir -p "${zipTempDir}"`);
    
    try {
        // Tăng maxBuffer lên 500MB để tránh tràn buffer khi unzip các file log siêu to khổng lồ
        execSync(`unzip -o "${zipFile}" -d "${zipTempDir}"`, { maxBuffer: 500 * 1024 * 1024 });
    } catch (unzipErr) {
        console.error(`Lỗi giải nén ${path.basename(zipFile)}:`, unzipErr.message);
    }
    
    if (!fs.existsSync(zipTempDir)) return;
    
    const files = fs.readdirSync(zipTempDir);
    let found = 0;
    
    files.forEach(file => {
        const filePath = path.join(zipTempDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Quét thô chuỗi json trước để tăng tốc độ xử lý
            if (content.includes('user') && content.includes('init')) {
                const logData = JSON.parse(content);
                const req = logData.request || {};
                const url = req.fullPath || req.url || req.uri || req.path || '';
                
                if (url.includes('/user/init') || url.includes('user/init')) {
                    found++;
                    console.log(`\n👉 TÌM THẤY TRONG ZIP: ${path.basename(zipFile)} (File: ${file})`);
                    console.log(`URL: [${req.method.name || req.method}] ${url}`);
                    console.log(`Host:`, req.host);
                    
                    console.log(`Request Headers:`);
                    const reqHeaders = {};
                    (req.header?.entries || req.headers || []).forEach(h => reqHeaders[h.key?.name || h.name] = h.value);
                    console.log(JSON.stringify(reqHeaders, null, 2));
                    
                    let reqBody = '';
                    if (req.bodyData) {
                        reqBody = Buffer.from(req.bodyData, 'base64').toString('utf-8');
                        try { reqBody = JSON.parse(reqBody); } catch(e) {}
                    }
                    console.log(`Request Body:`);
                    console.log(typeof reqBody === 'object' ? JSON.stringify(reqBody, null, 2) : reqBody);
                    
                    if (logData.response) {
                        console.log(`Response Status:`, logData.response.status?.code || logData.response.status);
                        let resBody = '';
                        if (logData.response.bodyData) {
                            resBody = Buffer.from(logData.response.bodyData, 'base64').toString('utf-8');
                            try { resBody = JSON.parse(resBody); } catch(e) {}
                        }
                        console.log(`Response Body:`);
                        console.log(typeof resBody === 'object' ? JSON.stringify(resBody, null, 2) : resBody);
                    }
                }
            }
        } catch(e) {}
    });
    
    console.log(`Kết quả quét ${path.basename(zipFile)}: Tìm thấy ${found} file.`);
    execSync(`rm -rf "${zipTempDir}"`);
});

execSync(`rm -rf "${tempDir}"`);
