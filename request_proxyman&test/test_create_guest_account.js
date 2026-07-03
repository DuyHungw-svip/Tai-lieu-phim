const https = require('https');

const crypto = require('crypto');
const newDeviceId = crypto.randomUUID().toUpperCase();

console.log("=========================================");
console.log("BẮT ĐẦU TEST TẠO TÀI KHOẢN KHÁCH MỚI TINH");
console.log("Device ID giả lập (UUID v4):", newDeviceId);
console.log("=========================================");

const dwBody = JSON.stringify({
    "device_id": newDeviceId,
    "appsflyer_id": "1782977089935-4481649",
    "brand": "Apple",
    "model": "iPhone",
    "os": "ios",
    "idfa": newDeviceId,
    "idfv": newDeviceId,
    "from": "appstore"
});

const options = {
    hostname: 'api.mydramawave.com',
    path: '/dm-api/user/init',
    method: 'POST',
    headers: {
        'host': 'api.mydramawave.com',
        'accept': 'application/json',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(dwBody),
        'timezone': '+7',
        'device-country': 'VN',
        'app-name': 'com.dramabuzz.app',
        'session-id': 'C3137F4A-3F6B-4B3F-BBFD-2DCD0AD3E3BB',
        'device': 'ios',
        'accept-language': 'vi-VN;q=1',
        'appsflyer-id': '1782977089935-4481649',
        'user-agent': 'DramaWave/82606270024 CFNetwork/1568.200.51 Darwin/24.1.0',
        'screen-height': '896',
        'country': 'VN',
        'device-id': newDeviceId,
        'device-language': 'vi-VN',
        'x-device-model': 'iPhone',
        'app-version': '1.8.91',
        'screen-width': '414',
        'language': 'vi-VN',
        'Origin': 'https://m.mydramawave.com',
        'Referer': 'https://m.mydramawave.com/',
        'Authorization': `oauth_signature=expired,oauth_token=expired,ts=${Date.now()}`
    }
};

const req = https.request(options, (res) => {
    console.log("Mã trạng thái phản hồi:", res.statusCode);
    console.log("Headers phản hồi:", res.headers);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("\nResponse Body nhận được:");
        console.log(data);
        
        try {
            const parsed = JSON.parse(data);
            if (parsed.code === 200 && parsed.data) {
                console.log("\n=========================================");
                console.log("🎉 🎉 ĐĂNG KÝ TÀI KHOẢN KHÁCH THÀNH CÔNG!");
                console.log("User ID:        ", parsed.data.user_id);
                console.log("oauth_token:    ", parsed.data.oauth_token);
                console.log("oauth_signature:", parsed.data.oauth_signature);
                console.log("=========================================");
            } else {
                console.log("\n❌ Server trả về mã lỗi:", parsed.message || parsed.code);
            }
        } catch (e) {
            console.log("\n❌ Không thể parse JSON phản hồi!");
        }
    });
});

req.on('error', (e) => {
    console.error("❌ Gặp lỗi kết nối:", e.message);
});

req.write(dwBody);
req.end();
