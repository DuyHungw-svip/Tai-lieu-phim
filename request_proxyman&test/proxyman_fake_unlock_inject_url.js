/**
 * Proxyman Script: Fake unlock & inject real m3u8 URLs
 * 
 * Cách dùng:
 * 1. URL: *api.mydramawave.com*
 * 2. Script này intercept 2 endpoints:
 *    - /dm-api/drama/unlock_episode -> fake success
 *    - /dm-api/drama/info_v2 -> inject real m3u8 URLs from captured logs
 */

// Map real m3u8 URLs từ log đã capture (series 2WNQrvybk4)
// Nguồn: moinhat1.proxymanlogv2 + xemquangcaomophim.proxymanlogv2
var REAL_M3U8_URLS = {
    "uPiSfKs4Up": "https://video-v6.mydramawave.com/vt/b257cd9b-6f24-40d4-9f40-30fe2922ca53/h264-b2e59f97-d64c-4416-9da7-631a8c795e3b.m3u8",
    "0tZS3fSOi": "https://video-v6.mydramawave.com/vt/7e99e44f-9799-493d-9e84-32e4be276ceb/h264-e0286081-8fbb-488d-a841-fa3aa855aca5.m3u8",
    "x3QMCVls7": "https://video-v6.mydramawave.com/vt/d0f25229-c5d8-40b4-ac6a-83f12f2c0070/h264-6c236743-9c8f-4e06-b954-0a2b16d60941.m3u8",
    "DGqkZYekD": "https://video-v6.mydramawave.com/vt/7a148357-ad24-4c07-ab41-d8b902ba71ae/h264-315aad26-9cf8-4ad7-ac1d-08aab1cfbfc0.m3u8",
    "PQFXTr2wL": "https://video-v6.mydramawave.com/vt/3389a635-11e0-40fa-90fe-994c4af65e5d/h264-81b4ce6e-aa94-447b-b9dc-8c1e047a4a63.m3u8",
    "qH8dH1FnD": "https://video-v6.mydramawave.com/vt/68b41371-20e7-4c41-afb3-9db9d5199108/h264-7697601e-91a8-4aff-9921-600db03ab81b.m3u8",
    "f6MJeOSYQ": "https://video-v6.mydramawave.com/vt/2b6241bc-c81d-42dd-b365-6494cf46d739/h264-df756f6c-d8d3-4a7d-a00d-4767157a23d0.m3u8",
    "zWKDKXSp7": "https://video-v6.mydramawave.com/vt/79e0ab43-bdf7-4f13-9190-7fdad0437e1f/h264-0dd88f95-8061-4c15-b8b0-c84bb8083056.m3u8",
    "AA1BC5Eob": "https://video-v6.mydramawave.com/vt/46fa2a21-3fe0-422d-a917-aacfe6cba510/h264-c7e4fb39-bc44-4141-920c-bb39217133a7.m3u8",
    "FQr65PixP": "https://video-v6.mydramawave.com/vt/7ad99511-5d0f-4000-a851-5c2efa76b2dd/h264-d3f222ff-3509-485b-9b24-1dcdf381e85d.m3u8",
    "MRCF4tayR": "https://video-v6.mydramawave.com/vt/20c1b7ec-3ed7-4e88-b4d6-b9cae5424796/h264-72047d0c-59fa-4f1f-826e-65239e3deae9.m3u8",
    "8tYlBcjWL": "https://video-v6.mydramawave.com/vt/b87cad1f-7572-42f4-ae1b-416a9e4e1da3/h264-71100ef1-a0ae-4216-adc6-b4f8452d66b6.m3u8",
    "8AXR7sPzZ": "https://video-v6.mydramawave.com/vt/d8de3cba-5f41-453c-8039-90c7b2a1f812/h264-012e0112-30c7-4a10-a3a6-1e303ecf9801.m3u8",
    "GAdHEg9DT": "https://video-v6.mydramawave.com/vt/17519ad0-2914-40d9-b9b2-881c662b6022/h264-43a20f7e-42bf-4738-b41c-fbf6c85b9f6c.m3u8",
    "cFnWbWMJe": "https://video-v6.mydramawave.com/vt/278a8038-aead-4038-8502-821d1569db18/h264-34b0b4b6-2e8f-4ed4-8a8e-72b2db3b5c8b.m3u8",
    "j3IIzJIGW": "https://video-v6.mydramawave.com/vt/066c400c-1e61-4a3b-a0fd-fb8aeacb7755/h264-cf5f89de-a365-4a58-b9ce-9e0f1d91e95a.m3u8",
    "Bcs9rPdIt": "https://video-v6.mydramawave.com/vt/366c6196-c2a5-4ef3-937e-3083fdb4e8dc/h264-6c2f7923-46cc-4357-a3b2-2e1a7edc03b8.m3u8",
    "nqwqX5V9T": "https://video-v6.mydramawave.com/vt/1a0c8286-5adc-4109-95f8-1349e42a04da/h264-6abd9403-67e9-4e04-a2fd-3f9af3858058.m3u8",
    "pgNi7Lgr0": "https://video-v6.mydramawave.com/vt/b4e7e3a6-7f3b-47a8-83c5-f21e0a0071e9/h264-97c60786-da8a-4088-90c2-9c12556a4b7e.m3u8",
    "BkjR2frr7": "https://video-v6.mydramawave.com/vt/6173199e-3c44-4b6d-b2f0-b9e78792d568/h264-206a08f4-67f8-4cbc-b544-0f2f7a7831d6.m3u8",
    "yYxFEA8uQ": "https://video-v6.mydramawave.com/vt/e8e6c1ae-3f68-4c2f-acdd-8f5dac01143d/h264-1f4135a6-26d4-4523-a10b-133b24acc8ce.m3u8",
    "Z96LmFBlB": "https://video-v6.mydramawave.com/vt/a60846c0-a72c-47f9-85e0-d55e351fca2b/h264-95a2fe5b-4439-4cfd-bd4b-e4f6c76384ef.m3u8",
    "IuvVOs64m": "https://video-v6.mydramawave.com/vt/5de748f0-e65f-4d2a-8c50-8f9fed4e6ac8/h264-e4c1a78d-6554-40fb-83bc-5f281d80c1d1.m3u8",
    "zx5tRtdFs": "https://video-v6.mydramawave.com/vt/60f052a2-ea6d-48d6-8a35-032b1e2186be/h264-b7b93b90-6d43-4cc3-8de8-bfcddca80b9f.m3u8",
    "URz4WTRsw": "https://video-v6.mydramawave.com/vt/7c3f0a5e-ec6e-4f43-956a-b6e66e6e2560/h264-0d371be9-7b35-4e66-92cf-5910b8040fc9.m3u8",
    "ldnRq9uNA": "https://video-v6.mydramawave.com/vt/d472a12b-b5cd-46b6-8cae-e3fef6b408af/h264-d7c9cbe0-1377-4284-9461-0704e8cb9a08.m3u8",
    "R99G19iJx": "https://video-v6.mydramawave.com/vt/f566e130-99a7-4a12-b2d4-375ff996cd77/h264-8b55a2e1-edee-4846-af95-2c29f1e69aca.m3u8",
    "4jjWmhSwE": "https://video-v6.mydramawave.com/vt/9451be19-83d4-4cf1-9228-c49e1dee5a78/h264-9fda989f-85f1-46d9-9d1f-f28211a0be2b.m3u8",
    "J7iYyWMDI": "https://video-v6.mydramawave.com/vt/99a96f9b-4e1f-4a60-ba2a-29fbe3c5fc84/h264-75a703fa-a6b4-4be9-9923-67eff8c31343.m3u8",
    "aWMOfPnbJ": "https://video-v6.mydramawave.com/vt/7de1e6ed-3533-4eef-b354-f1e7deb7ad7e/h264-2a36dd16-a352-4dac-b737-5e2195132ccc.m3u8",
    "FrJPi9tSm": "https://video-v6.mydramawave.com/vt/38e98db1-3a17-4e2e-9ebd-7155b3470fbb/h264-8fed82f6-041b-4d8f-9373-abd3b96ff49e.m3u8"
};

function onRequest(request) {
    if (!request || !request.uri) return request;
    // Với unlock_episode: chặn request, không gửi lên server (xử lý ở onResponse)
    if (request.uri.includes('/dm-api/drama/unlock_episode') && request.method === 'POST') {
        request.isBlocked = true; // Chặn không gửi lên server
    }
    return request;
}

function onResponse(request, response) {
    if (!response) return response;
    
    var uri = request && request.uri ? request.uri : '';
    
    // 1. FAKE RESPONSE unlock_episode + inject m3u8 URL
    if (uri.includes('/dm-api/drama/unlock_episode') && request.method === 'POST') {
        var epId = '';
        if (request.body) {
            try { var reqData = JSON.parse(request.body); epId = reqData.episode_id || ''; } catch(e) {}
        }
        var m3u8Url = REAL_M3U8_URLS[epId] || 'https://video-v6.mydramawave.com/vt/unknown/h264-unknown.m3u8';
        
        response.statusCode = 200;
        response.headers = response.headers || {};
        response.headers['Content-Type'] = 'application/json';
        response.body = JSON.stringify({
            code: 200,
            message: "success",
            data: {
                id: epId,
                unlock: true,
                external_audio_h264_m3u8: m3u8Url,
                external_audio_h265_m3u8: m3u8Url.replace('h264-', 'h265-')
            }
        });
        console.log("=== PROXYMAN: Fake unlock_episode success! ep=" + epId + " ===");
        return response;
    }
    
    // 1b. FAKE RESPONSE ad/finish - unlock bằng quảng cáo
    if (uri.includes('/dm-api/ad/finish') && request.method === 'POST') {
        var epKey = '';
        var seriesKey = '';
        if (request.body) {
            try {
                var reqData = JSON.parse(request.body);
                epKey = reqData.episode_key || '';
                seriesKey = reqData.series_key || '';
            } catch(e) {}
        }
        var m3u8Url = REAL_M3U8_URLS[epKey] || '';
        
        if (m3u8Url) {
            response.statusCode = 200;
            response.headers = response.headers || {};
            response.headers['Content-Type'] = 'application/json';
            response.body = JSON.stringify({
                code: 200,
                message: "success",
                data: {
                    unlock_episodes: [{
                        id: epKey,
                        unlock: true,
                        external_audio_h264_m3u8: m3u8Url,
                        external_audio_h265_m3u8: m3u8Url.replace('h264-', 'h265-')
                    }]
                }
            });
            console.log("=== PROXYMAN: Fake ad/finish success! ep=" + epKey + " ===");
            return response;
        }
    }
    
    // 2. INJECT m3u8 URLs vào info_v2
    if (uri.includes('/dm-api/drama/info_v2') && response.statusCode === 200 && response.body) {
        try {
            var bodyJson = JSON.parse(response.body);
            var episodes = bodyJson.data && bodyJson.data.info && bodyJson.data.info.episode_list;
            if (Array.isArray(episodes)) {
                for (var i = 0; i < episodes.length; i++) {
                    var ep = episodes[i];
                    ep.unlock = true;
                    ep.user_unlocked = true;
                    ep.video_type = "free";
                    ep.episode_price = 0;
                    
                    // Inject real m3u8 URL nếu có trong map
                    if (REAL_M3U8_URLS[ep.id]) {
                        ep.external_audio_h264_m3u8 = REAL_M3U8_URLS[ep.id];
                        ep.external_audio_h265_m3u8 = REAL_M3U8_URLS[ep.id].replace('h264-', 'h265-');
                    }
                }
                response.body = JSON.stringify(bodyJson);
                console.log("=== PROXYMAN: Injected unlock + m3u8 URLs for " + episodes.length + " episodes ===");
            }
        } catch (e) {
            console.error("PROXYMAN ERROR: " + e.message);
        }
    }
    
    return response;
}
