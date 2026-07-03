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

const tempDir = '/Users/hoangquan/Downloads/temp_token_search';

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    console.log(`\nQuét file: ${path.basename(zipFile)}...`);
    
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
            // Tìm xem response body có chứa oauth_token không
            if (content.includes('oauth_token') && content.includes('oauth_signature')) {
                const logData = JSON.parse(content);
                const req = logData.request || {};
                const res = logData.response || {};
                const url = req.fullPath || req.url || req.uri || '';
                
                // Giải mã response body
                let resBody = '';
                if (res.bodyData) {
                    resBody = Buffer.from(res.bodyData, 'base64').toString('utf-8');
                }
                
                // Nếu response body thật sự chứa oauth_token rõ
                if (resBody.includes('oauth_token') || resBody.includes('oauth_signature')) {
                    console.log(`\n⭐ [TÌM THẤY REQUEST TẠO TOKEN]`);
                    console.log(`Zip: ${path.basename(zipFile)} | File: ${file}`);
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
                    
                    console.log(`Response Status:`, res.status?.code || res.status);
                    console.log(`Response Body:`);
                    console.log(resBody);
                }
            }
        } catch(e) {}
    });
    
    execSync(`rm -rf "${zipTempDir}"`);
});

execSync(`rm -rf "${tempDir}"`);
