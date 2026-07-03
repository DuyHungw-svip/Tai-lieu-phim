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

const tempDir = '/Users/hoangquan/Downloads/temp_decompressed';

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    
    console.log(`\nQuét file zip: ${path.basename(zipFile)}...`);
    
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
            
            if (res.bodyData) {
                let rawBuffer = Buffer.from(res.bodyData, 'base64');
                let decompressed = null;
                
                // Lấy encoding từ headers
                const resHeaders = {};
                (res.header?.entries || res.headers || []).forEach(h => {
                    const k = (h.key?.nameInLowercase || h.nameInLowercase || h.key?.name || h.name || '').toLowerCase();
                    resHeaders[k] = h.value;
                });
                
                const contentEncoding = resHeaders['content-encoding'] || '';
                
                try {
                    if (contentEncoding.includes('gzip')) {
                        decompressed = zlib.gunzipSync(rawBuffer);
                    } else if (contentEncoding.includes('br')) {
                        decompressed = zlib.brotliDecompressSync(rawBuffer);
                    } else if (contentEncoding.includes('deflate')) {
                        decompressed = zlib.inflateSync(rawBuffer);
                    } else {
                        decompressed = rawBuffer;
                    }
                } catch(decompressErr) {
                    // Fallback thử giải nén trực tiếp nếu header bị thiếu
                    try {
                        decompressed = zlib.gunzipSync(rawBuffer);
                    } catch(e) {
                        try {
                            decompressed = zlib.brotliDecompressSync(rawBuffer);
                        } catch(e2) {
                            decompressed = rawBuffer;
                        }
                    }
                }
                
                if (decompressed) {
                    const resText = decompressed.toString('utf-8');
                    if (resText.includes('oauth_token') && resText.includes('oauth_signature')) {
                        const url = req.fullPath || req.url || req.uri || '';
                        console.log(`\n⭐ ⭐ ⭐ [TÌM THẤY TẠO TOKEN THÀNH CÔNG] ⭐ ⭐ ⭐`);
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
                        console.log(`Response Body (Decompressed):`);
                        console.log(resText);
                    }
                }
            }
        } catch(e) {}
    });
    
    execSync(`rm -rf "${zipTempDir}"`);
});

execSync(`rm -rf "${tempDir}"`);
