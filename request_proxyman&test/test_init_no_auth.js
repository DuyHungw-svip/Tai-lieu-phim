const https = require('https');
const crypto = require('crypto');

const newDeviceId = crypto.randomUUID().toUpperCase();

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

// TEST 1: KHÔNG TRUYỀN AUTHORIZATION HEADER
const options1 = {
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
        'language': 'vi-VN'
    }
};

function runTest(options, name) {
    return new Promise((resolve) => {
        console.log(`\n=== CHẠY TEST: ${name} ===`);
        const req = https.request(options, (res) => {
            console.log("Status Code:", res.statusCode);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log("Response:", data);
                resolve(res.statusCode);
            });
        });
        req.on('error', (e) => {
            console.log("Error:", e.message);
            resolve(0);
        });
        req.write(dwBody);
        req.end();
    });
}

async function main() {
    await runTest(options1, "Không truyền Authorization Header");
    
    // TEST 2: TRUYỀN AUTHORIZATION RỖNG
    const options2 = { ...options1, headers: { ...options1.headers, 'Authorization': '' } };
    await runTest(options2, "Authorization Header rỗng");

    // TEST 3: CHỈ TRUYỀN SIGNATURE VÀ TS (KHÔNG CÓ TOKEN)
    // Giả lập signature đại khái
    const ts = Date.now();
    const options3 = { ...options1, headers: { ...options1.headers, 'Authorization': `oauth_signature=expired,ts=${ts}` } };
    await runTest(options3, "Chỉ truyền signature và ts");
}

main();
