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

const tempDir = '/Users/hoangquan/Downloads/temp_api_only';

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    console.log(`\n=========================================`);
    console.log(`QUÉT ZIP: ${path.basename(zipFile)}`);
    console.log(`=========================================`);
    
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
            
            // CHỈ LỌC API CỦA DRAMAWAVE
            if (host.includes('mydramawave') || url.includes('mydramawave')) {
                if (url.includes('/user/') || url.includes('/init') || url.includes('/login') || url.includes('/register')) {
                    
                    let decompressedText = '';
                    if (res.bodyData) {
                        let rawBuffer = Buffer.from(res.bodyData, 'base64');
                        
                        // Lấy encoding từ headers
                        const resHeaders = {};
                        (res.header?.entries || res.headers || []).forEach(h => {
                            const k = (h.key?.nameInLowercase || h.nameInLowercase || h.key?.name || h.name || '').toLowerCase();
                            resHeaders[k] = h.value;
                        });
                        
                        const contentEncoding = resHeaders['content-encoding'] || '';
                        let decompressedBuffer = rawBuffer;
                        
                        try {
                            if (contentEncoding.includes('gzip')) {
                                decompressedBuffer = zlib.gunzipSync(rawBuffer);
                            } else if (contentEncoding.includes('br')) {
                                decompressedBuffer = zlib.brotliDecompressSync(rawBuffer);
                            } else if (contentEncoding.includes('deflate')) {
                                decompressedBuffer = zlib.inflateSync(rawBuffer);
                            }
                        } catch(e) {}
                        
                        decompressedText = decompressedBuffer.toString('utf-8');
                    }
                    
                    // CHỈ IN RA NẾU RESPONSE CHỨA OAUTH_TOKEN (ĐĂNG KÝ THÀNH CÔNG) HOẶC LÀ API INIT
                    if (url.includes('/init') || decompressedText.includes('oauth_token') || decompressedText.includes('oauth_signature')) {
                        console.log(`\n[PHÁT HIỆN HỢP LỆ] File: ${file}`);
                        console.log(`URL: [${req.method.name || req.method}] ${url}`);
                        console.log(`Host: ${req.host}`);
                        
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
                        
                        console.log(`Response Code:`, res.status?.code || res.status);
                        console.log(`Response Body (Chỉ in 500 ký tự đầu):`);
                        console.log(decompressedText.slice(0, 500));
                        console.log(`-----------------------------------------`);
                    }
                }
            }
        } catch(e) {}
    });
    
    execSync(`rm -rf "${zipTempDir}"`);
});

execSync(`rm -rf "${tempDir}"`);
