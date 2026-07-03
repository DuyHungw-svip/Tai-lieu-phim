const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const PORT = 3000;
const API_HOST = 'api.mydramawave.com';
const CDN_HOST = 'video-v6.mydramawave.com';
const DOWNLOAD_DIR = '/Users/duyhung/Downloads/Gợi Ý Phim hay';

const server = http.createServer((req, res) => {
    // Thêm các CORS headers mặc định cho mọi phản hồi từ local server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Xử lý request OPTIONS preflight từ trình duyệt
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // --------------------------------------------------
    // 1. PROXY CHO API DRAMAWAVE (/api/...)
    // --------------------------------------------------
    if (pathname.startsWith('/api/')) {
        const targetPath = pathname.replace('/api/', '/');
        const targetUrl = `https://${API_HOST}${targetPath}${parsedUrl.search}`;
        
        console.log(`[API PROXY] ${req.method} -> ${targetUrl}`);

        // Sao chép headers từ client lên server thật (bỏ qua host, origin và referer)
        const headers = {};
        for (const key in req.headers) {
            const lowercaseKey = key.toLowerCase();
            if (lowercaseKey !== 'host' && lowercaseKey !== 'origin' && lowercaseKey !== 'referer') {
                if (lowercaseKey === 'authorization') {
                    headers['Authorization'] = req.headers[key];
                } else {
                    headers[key] = req.headers[key];
                }
            }
        }
        headers['host'] = API_HOST;

        // Đọc body của request nếu có
        let bodyData = [];
        req.on('data', chunk => {
            bodyData.push(chunk);
        }).on('end', () => {
            let bufferBody = Buffer.concat(bodyData);

            // NẾU LÀ GỌI H5 ANONYMOUS LOGIN -> TIẾN HÀNH MÃ HÓA AES PHÍA SERVER
            if (targetPath === '/h5-api/anonymous/login' && req.method === 'POST') {
                try {
                    const rawDeviceId = bufferBody.toString('utf-8').trim();
                    console.log(`[PROXY DETECTED] Bắt gói h5 anonymous login. Thiết bị: ${rawDeviceId}`);
                    
                    // Thực hiện mã hóa AES-128-ECB qua CryptoJS
                    const CryptoJS = require('crypto-js');
                    const aesKey = '2r36789f45q01ae5';
                    const plainPayload = JSON.stringify({ device_id: rawDeviceId });
                    const encryptedBody = CryptoJS.AES.encrypt(plainPayload, CryptoJS.enc.Utf8.parse(aesKey), {
                        mode: CryptoJS.mode.ECB,
                        padding: CryptoJS.pad.Pkcs7
                    }).toString();

                    bufferBody = Buffer.from(encryptedBody);
                    headers['content-length'] = bufferBody.length;
                    const originalUA = req.headers['user-agent'] || req.headers['User-Agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                    delete headers['user-agent'];
                    delete headers['User-Agent'];
                    headers['user-agent'] = originalUA;
                    console.log(`[PROXY ENCRYPTED] Payload mã hóa thành công: ${encryptedBody}`);
                } catch (encryptErr) {
                    console.error(`[PROXY ENCRYPT ERROR] Không mã hóa được payload: ${encryptErr.message}`);
                }
            }

            const proxyReq = https.request(targetUrl, {
                method: req.method,
                headers: headers
            }, (proxyRes) => {
                // Nếu là h5 anonymous login thành công -> Giải mã response trước khi trả về client
                if (targetPath === '/h5-api/anonymous/login' && proxyRes.statusCode === 200) {
                    let resData = [];
                    proxyRes.on('data', chunk => resData.push(chunk));
                    proxyRes.on('end', () => {
                        try {
                            const rawBuffer = Buffer.concat(resData);
                            let decompressedBuffer = rawBuffer;
                            
                            // Tự động giải nén gzip, brotli, deflate nếu server nén phản hồi
                            const contentEncoding = proxyRes.headers['content-encoding'];
                            if (contentEncoding === 'gzip') {
                                const zlib = require('zlib');
                                decompressedBuffer = zlib.gunzipSync(rawBuffer);
                            } else if (contentEncoding === 'br') {
                                const zlib = require('zlib');
                                decompressedBuffer = zlib.brotliDecompressSync(rawBuffer);
                            } else if (contentEncoding === 'deflate') {
                                const zlib = require('zlib');
                                decompressedBuffer = zlib.inflateSync(rawBuffer);
                            }

                            const rawResponse = decompressedBuffer.toString('utf-8');
                            console.log(`[PROXY RESPONSE] Nhận phản hồi thô (Giải nén): ${rawResponse}`);
                            
                            let cleaned = rawResponse.trim();
                            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                                cleaned = cleaned.substring(1, cleaned.length - 1);
                            }

                            // Kiểm tra xem phản hồi có phải là chuỗi mã hóa base64 không
                            const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(cleaned) && cleaned.length > 10;
                            
                            if (!isBase64) {
                                console.warn(`[PROXY WARNING] Phản hồi không phải dạng mã hóa: ${cleaned}`);
                                if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
                                    // Trả về JSON gốc
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(cleaned);
                                    return;
                                } else if (cleaned.startsWith('<') || cleaned.includes('<html>') || cleaned.includes('<!DOCTYPE')) {
                                    // HTML block page
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ 
                                        code: 500, 
                                        message: "Kết nối tới DramaWave bị chặn bởi nhà mạng hoặc hệ thống bảo mật CDN (nhận được trang HTML cảnh báo)." 
                                    }));
                                    return;
                                } else {
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ 
                                        code: 500, 
                                        message: `Phản hồi không hợp lệ từ DramaWave (Raw: ${cleaned.substring(0, 100)})` 
                                    }));
                                    return;
                                }
                            }

                            const CryptoJS = require('crypto-js');
                            const aesKey = '2r36789f45q01ae5';
                            const decryptedBytes = CryptoJS.AES.decrypt(cleaned, CryptoJS.enc.Utf8.parse(aesKey), {
                                mode: CryptoJS.mode.ECB,
                                padding: CryptoJS.pad.Pkcs7
                            });
                            const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
                            
                            console.log(`[PROXY DECRYPTED] Giải mã thành công: ${decryptedStr}`);
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(decryptedStr);
                        } catch (decryptErr) {
                            console.error(`[PROXY DECRYPT ERROR] Giải mã response thất bại: ${decryptErr.message}`);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ code: 500, message: "Giải mã thông tin khách hàng thất bại: " + decryptErr.message }));
                        }
                    });
                } else if (targetPath.includes('info_v2')) {
                    let respBody = [];
                    proxyRes.on('data', chunk => respBody.push(chunk));
                    proxyRes.on('end', () => {
                        const rawBuffer = Buffer.concat(respBody);
                        let output = rawBuffer;
                        
                        // Giải nén nếu server nén response
                        const contentEncoding = proxyRes.headers['content-encoding'];
                        const zlib = require('zlib');
                        if (contentEncoding === 'gzip') {
                            output = zlib.gunzipSync(rawBuffer);
                        } else if (contentEncoding === 'br') {
                            output = zlib.brotliDecompressSync(rawBuffer);
                        } else if (contentEncoding === 'deflate') {
                            output = zlib.inflateSync(rawBuffer);
                        }
                        
                        const bodyStr = output.toString('utf-8');
                        try {
                            const parsed = JSON.parse(bodyStr);
                            const epCount = (parsed?.data?.info?.episode_list || []).length;
                            console.log(`[info_v2 DEBUG] series=${parsedUrl.searchParams.get('series_id')} episode_count=${epCount}`);
                        } catch (_) {}
                        
                        // Xóa header nén để browser không giải nén lại
                        const respHeaders = { ...proxyRes.headers };
                        delete respHeaders['content-encoding'];
                        delete respHeaders['content-length'];
                        
                        res.writeHead(proxyRes.statusCode, respHeaders);
                        res.end(output);
                    });
                } else {
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(res);
                }
            });

            proxyReq.on('error', (err) => {
                console.error(`[API ERROR] ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 500, message: `Lỗi proxy: ${err.message}` }));
            });

            if (bufferBody.length > 0) {
                proxyReq.write(bufferBody);
            }
            proxyReq.end();
        });
        return;
    }

    // --------------------------------------------------
    // 2. PROXY CHO CDN PHIM (/cdn/...)
    // --------------------------------------------------
    if (pathname.startsWith('/cdn/')) {
        const targetPath = pathname.replace('/cdn/', '/');
        const targetUrl = `https://${CDN_HOST}${targetPath}${parsedUrl.search}`;
        
        console.log(`[CDN PROXY] GET -> ${targetUrl}`);

        const proxyReq = https.request(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'host': CDN_HOST
            }
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[CDN ERROR] ${err.message}`);
            res.writeHead(500);
            res.end();
        });

        proxyReq.end();
        return;
    }

    // --------------------------------------------------
    // API UPLOAD WATERMARK (.png/.jpg)
    // --------------------------------------------------
    if (pathname === '/upload-watermark' && req.method === 'POST') {
        let bodyData = [];
        req.on('data', chunk => {
            bodyData.push(chunk);
        }).on('end', () => {
            try {
                const params = JSON.parse(Buffer.concat(bodyData).toString('utf-8'));
                const { imageBase64 } = params;
                if (!imageBase64) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ code: 400, message: "Thiếu dữ liệu hình ảnh (imageBase64)" }));
                    return;
                }
                
                // Tách header base64 (ví dụ: data:image/png;base64,) và chuyển đổi thành buffer
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Ghi đè file watermark.png cố định trong thư mục gốc
                fs.writeFileSync(path.join(__dirname, 'watermark.png'), buffer);
                
                console.log(`[WATERMARK] ✅ Đã lưu file watermark.png thành công!`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 200, message: "Đã upload và cấu hình watermark thành công!" }));
            } catch (e) {
                console.error(`[WATERMARK ERROR] Lưu watermark thất bại: ${e.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 500, message: "Lỗi lưu file: " + e.message }));
            }
        });
        return;
    }

    // --------------------------------------------------
    // 3. TẢI VÀ GHÉP TRỘN PHIM LỒNG TIẾNG (/download-video)
    // --------------------------------------------------
    if (pathname === '/download-video' && req.method === 'POST') {
        let bodyData = [];
        req.on('data', chunk => {
            bodyData.push(chunk);
        }).on('end', async () => {
            try {
                const params = JSON.parse(Buffer.concat(bodyData).toString('utf-8'));
                const { m3u8Url, dramaName, episodeName, subtitleUrl, useWatermark, watermarkOpacity } = params;
                if (!m3u8Url) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ code: 400, message: "Thiếu m3u8Url" }));
                    return;
                }

                console.log(`\n==================================================`);
                console.log(`[DOWNLOAD TASK] Bắt đầu tiến trình tải phim...`);
                console.log(`👉 Tên Phim: ${dramaName}`);
                console.log(`👉 Tập: ${episodeName}`);
                console.log(`👉 Nguồn: HLS (Tự động tải & Muxing hình ảnh + âm thanh Việt)`);
                if (subtitleUrl) console.log(`👉 Phụ đề: Việt (${subtitleUrl})`);
                if (useWatermark) console.log(`👉 Đóng dấu (Watermark): Bật (Độ mờ: ${watermarkOpacity * 100}%)`);
                console.log('==================================================');

                const outputFileName = await downloadAndMuxHls(m3u8Url, dramaName, episodeName, subtitleUrl, useWatermark, watermarkOpacity);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    code: 200,
                    message: "Tải và ghép phim thành công!",
                    filename: outputFileName,
                    savedDir: DOWNLOAD_DIR,
                    downloadUrl: `/download-file?filename=${encodeURIComponent(outputFileName)}`
                }));
            } catch (e) {
                console.error(`[DOWNLOAD ERROR] Tải phim thất bại: ${e.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 500, message: e.message }));
            }
        });
        return;
    }

    // --------------------------------------------------
    // 4. TẢI FILE ĐÃ GHÉP VỀ TRÌNH DUYỆT (/download-file)
    // --------------------------------------------------
    if (pathname === '/download-file' && (req.method === 'GET' || req.method === 'HEAD')) {
        const requestedFileName = parsedUrl.searchParams.get('filename');
        if (!requestedFileName || path.basename(requestedFileName) !== requestedFileName || !requestedFileName.endsWith('.mp4')) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Tên file không hợp lệ');
            return;
        }

        const filePath = path.join(DOWNLOAD_DIR, requestedFileName);
        if (!filePath.startsWith(DOWNLOAD_DIR) || !fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Không tìm thấy file');
            return;
        }

        const stat = fs.statSync(filePath);
        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(requestedFileName)}"; filename*=UTF-8''${encodeURIComponent(requestedFileName)}`
        });
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        fs.createReadStream(filePath).pipe(res);
        return;
    }




    // --------------------------------------------------
    // 5. PHỤC VỤ CÁC FILE GIAO DIỆN (Static Files)
    // --------------------------------------------------
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // Đảm bảo không cho phép duyệt file ngoài thư mục dự án
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.exists(filePath, (exists) => {
        if (!exists) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        if (filePath.endsWith('.js')) contentType = 'text/javascript';
        if (filePath.endsWith('.mp4')) contentType = 'video/mp4';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 LOCAL PROXY SERVER ĐANG CHẠY THÀNH CÔNG!`);
    console.log(`👉 Truy cập Web App tại: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});

// =========================================================================
// HÀM PHỤ TRỢ TẢI PHIM & GHÉP TRỘN HÌNH ẢNH + ÂM THANH QUA FFMPEG
// =========================================================================

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadSegment(url, writeStream) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Tải segment thất bại: ${res.statusCode} đối với URL: ${url}`));
                return;
            }
            res.on('data', chunk => writeStream.write(chunk));
            res.on('end', () => resolve());
        }).on('error', reject);
    });
}

async function downloadPlaylistSegments(playlistUrl, outputPath) {
    const playlistText = await fetchText(playlistUrl);
    const lines = playlistText.split('\n');
    
    const lastSlash = playlistUrl.lastIndexOf('/');
    const playlistBaseUrl = playlistUrl.substring(0, lastSlash + 1);

    const segmentUrls = [];
    let initUrl = "";

    for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('#EXT-X-MAP:URI=')) {
            const match = cleanLine.match(/URI="([^"]+)"/);
            if (match) {
                initUrl = playlistBaseUrl + match[1];
            }
        } else if (cleanLine.endsWith('.mp4') || cleanLine.endsWith('.aac') || cleanLine.endsWith('.ts')) {
            segmentUrls.push(playlistBaseUrl + cleanLine);
        }
    }

    const writeStream = fs.createWriteStream(outputPath);

    if (initUrl) {
        await downloadSegment(initUrl, writeStream);
    }

    for (let i = 0; i < segmentUrls.length; i++) {
        await downloadSegment(segmentUrls[i], writeStream);
    }

    writeStream.end();
    return new Promise((resolve) => writeStream.on('close', resolve));
}

async function downloadAndMuxHls(m3u8Url, dramaName, episodeName, subtitleUrl, useWatermark, watermarkOpacity = 0.8) {
    const masterText = await fetchText(m3u8Url);
    const lines = masterText.split('\n');
    
    let streams = [];
    let audioTracks = [];
    
    const lastSlash = m3u8Url.lastIndexOf('/');
    const baseUrl = m3u8Url.substring(0, lastSlash + 1);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
            const nameMatch = line.match(/NAME="([^"]+)"/);
            const uriMatch = line.match(/URI="([^"]+)"/);
            if (nameMatch && uriMatch) {
                audioTracks.push({
                    name: nameMatch[1],
                    url: baseUrl + uriMatch[1]
                });
            }
        } else if (line.startsWith('#EXT-X-STREAM-INF')) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
            const width = resMatch ? parseInt(resMatch[1]) : 0;
            const height = resMatch ? parseInt(resMatch[2]) : 0;
            const nextLine = lines[i+1] ? lines[i+1].trim() : '';
            if (nextLine && !nextLine.startsWith('#')) {
                streams.push({
                    width,
                    height,
                    url: baseUrl + nextLine
                });
            }
        }
    }

    if (streams.length === 0) {
        throw new Error("Không tìm thấy luồng video nào trong Master Playlist!");
    }

    // Chọn luồng video độ phân giải cao nhất (1080p)
    streams.sort((a, b) => b.width - a.width);
    const bestStream = streams[0];
    console.log(`[DOWNLOAD TASK] 🎬 Độ phân giải tốt nhất phát hiện: ${bestStream.width}x${bestStream.height}`);

    // Chọn luồng audio lồng tiếng Việt (vi-VN), nếu không có thì lấy luồng đầu tiên
    let bestAudio = audioTracks.find(t => t.name.toLowerCase().includes('vi'));
    if (!bestAudio && audioTracks.length > 0) {
        bestAudio = audioTracks[0];
    }
    
    if (bestAudio) {
        console.log(`[DOWNLOAD TASK] 🔊 Luồng âm thanh đã chọn: ${bestAudio.name}`);
    }

    const tempVideoPath = path.join(__dirname, `temp_video_${Date.now()}.mp4`);
    const tempAudioPath = path.join(__dirname, `temp_audio_${Date.now()}.aac`);
    
    // Tải video segments
    console.log(`[DOWNLOAD TASK] Đang tải các phân đoạn hình ảnh...`);
    await downloadPlaylistSegments(bestStream.url, tempVideoPath);

    // Tải audio segments
    if (bestAudio) {
        console.log(`[DOWNLOAD TASK] Đang tải các phân đoạn âm thanh...`);
        await downloadPlaylistSegments(bestAudio.url, tempAudioPath);
    }

    // Ghép phim
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    const safeDramaName = dramaName.replace(/[\\/:*?"<>|]/g, "_");
    const safeEpisodeName = episodeName.replace(/[\\/:*?"<>|]/g, "_");
    const finalFileName = `${safeDramaName} - ${safeEpisodeName}.mp4`;
    const finalOutputPath = path.join(DOWNLOAD_DIR, finalFileName);

    console.log(`[DOWNLOAD TASK] Đang tiến hành ghép trộn (Muxing) hình ảnh và âm thanh bằng FFmpeg...`);
    
    // Tải phụ đề tiếng Việt song song nếu có
    let tempSubFileName = "";
    let tempSubPath = "";
    if (subtitleUrl) {
        try {
            console.log(`[DOWNLOAD TASK] Đang tải phụ đề tiếng Việt từ: ${subtitleUrl}`);
            const subText = await fetchText(subtitleUrl);
            
            // Tạo file phụ đề tạm thời với tên đơn giản không khoảng trắng để FFmpeg burn không bị lỗi
            tempSubFileName = `temp_sub_${Date.now()}.srt`;
            tempSubPath = path.join(__dirname, tempSubFileName);
            fs.writeFileSync(tempSubPath, subText, 'utf-8');
            console.log(`[DOWNLOAD TASK] ✅ Đã nạp phụ đề tạm để chuẩn bị ghép cứng: ${tempSubFileName}`);
        } catch (subErr) {
            console.error(`[DOWNLOAD WARNING] Không thể tải phụ đề: ${subErr.message}`);
        }
    }
    
    // Kiểm tra sự tồn tại của watermark.png
    const watermarkPath = path.join(__dirname, 'watermark.png');
    const hasWatermark = useWatermark && fs.existsSync(watermarkPath);
    if (hasWatermark) {
        console.log(`[DOWNLOAD TASK] 👉 Phát hiện cấu hình chèn Watermark: ${watermarkPath}`);
    }

    return new Promise((resolve, reject) => {
        let ffmpegCmd = '';
        const inputs = [];
        
        // Input 0: Video gốc
        inputs.push(`-i "${tempVideoPath}"`);
        
        // Input 1: Audio lồng tiếng (nếu có)
        if (bestAudio) {
            inputs.push(`-i "${tempAudioPath}"`);
        }
        
        // Input 2 (hoặc 1 nếu không có audio): Watermark (nếu có)
        if (hasWatermark) {
            inputs.push(`-i "${watermarkPath}"`);
        }
        
        const inputArgs = inputs.join(' ');
        
        // Xây dựng bộ lọc video phức tạp
        let filterComplex = '';
        let hasFilter = false;
        
        if (hasWatermark && tempSubFileName) {
            // Có cả watermark và sub
            const watermarkInputIndex = bestAudio ? 2 : 1;
            // scale watermark xuống 150px rộng, giữ tỉ lệ chiều cao, áp dụng độ mờ (opacity), sau đó overlay vào góc trên bên phải (x = w_video - w_wm - 20px, y = 20px)
            filterComplex = `-filter_complex "[${watermarkInputIndex}:v]scale=150:-1,format=rgba,colorchannelmixer=aa=${watermarkOpacity}[wm];[0:v][wm]overlay=main_w-overlay_w-20:20[v];[v]subtitles=filename='${tempSubFileName}'"`;
            hasFilter = true;
        } else if (hasWatermark) {
            // Chỉ có watermark
            const watermarkInputIndex = bestAudio ? 2 : 1;
            filterComplex = `-filter_complex "[${watermarkInputIndex}:v]scale=150:-1,format=rgba,colorchannelmixer=aa=${watermarkOpacity}[wm];[0:v][wm]overlay=main_w-overlay_w-20:20"`;
            hasFilter = true;
        } else if (tempSubFileName) {
            // Chỉ có subtitles
            filterComplex = `-vf "subtitles=filename='${tempSubFileName}'"`;
            hasFilter = true;
        }
        
        if (hasFilter) {
            // Cần encode video bằng libx264 để ghi đè filter hình ảnh
            if (bestAudio) {
                ffmpegCmd = `ffmpeg -y ${inputArgs} ${filterComplex} -c:v libx264 -preset veryfast -crf 20 -c:a aac "${finalOutputPath}"`;
            } else {
                ffmpegCmd = `ffmpeg -y ${inputArgs} ${filterComplex} -c:v libx264 -preset veryfast -crf 20 "${finalOutputPath}"`;
            }
        } else {
            // Không có filter -> copy luồng trực tiếp siêu tốc
            if (bestAudio) {
                ffmpegCmd = `ffmpeg -y ${inputArgs} -c:v copy -c:a aac "${finalOutputPath}"`;
            } else {
                ffmpegCmd = `ffmpeg -y ${inputArgs} -c:v copy "${finalOutputPath}"`;
            }
        }

        exec(ffmpegCmd, { cwd: __dirname }, (err, stdout, stderr) => {
            // Xóa các file tạm thời
            try {
                if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
                if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
            } catch (e) {}

            if (err) {
                console.error(`[FFMPEG ERROR] Ghép nối thất bại: ${stderr}`);
                reject(new Error(`Lỗi FFmpeg: ${err.message}`));
                return;
            }

            console.log(`[DOWNLOAD TASK] 🎉 HOÀN THÀNH! File đã được lưu tại:`);
            console.log(`👉 ${finalOutputPath}`);
            resolve(finalFileName);
        });
    });
}

function makeHttpsRequest(url, method, headers, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const reqHeaders = { ...headers };
        let bodyData = '';
        if (body) {
            bodyData = typeof body === 'string' ? body : JSON.stringify(body);
            reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
        }
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: method,
            headers: reqHeaders
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });
        req.on('error', reject);
        if (bodyData) {
            req.write(bodyData);
        }
        req.end();
    });
}
