const authHeader = "oauth_signature=4a7eb6b6e263ab109102b19b6b339aed,oauth_token=DSwPIfwYH1j3MlazeoDxnS2Va1a7K6Dk,ts=1782980110505";

const headers = {
    'Host': 'api.mydramawave.com',
    'session-id': 'C3137F4A-3F6B-4B3F-BBFD-2DCD0AD3E3BB',
    'language': 'vi-VN',
    'User-Agent': 'DramaWave/1.8.91 (iPhone; iOS 18.1.1; Scale/3.00)',
    'country': 'VN',
    'device-language': 'vi-VN',
    'x-device-model': 'iPhone',
    'screen-width': '414',
    'device-id': '190F8882-BBB7-45BE-AF95-3B4EF5497A34',
    'screen-height': '896',
    'appsflyer-id': '1782977089935-4481649',
    'Authorization': authHeader,
    'timezone': '+7',
    'device-country': 'VN',
    'Accept-Language': 'vi-VN;q=1',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'app-name': 'com.dramabuzz.app',
    'app-version': '1.8.91',
    'device': 'ios'
};

// ==========================================
// THÔNG TIN BỘ PHIM VÀ TẬP PHIM MUỐN MỞ KHÓA
// ==========================================
const SERIES_ID = "2WNQrvybk4"; // Điền ID bộ phim (ví dụ trong log là 2WNQrvybk4)
const EPISODE_ID = "BGXgW0rJTF"; // Điền ID tập phim muốn mở khóa (ví dụ tập 60 là BGXgW0rJTF)
// ==========================================

async function unlockEpisode() {
    console.log(`Đang gửi yêu cầu mở khóa Tập: ${EPISODE_ID} của Phim: ${SERIES_ID}...`);
    try {
        const res = await fetch('https://api.mydramawave.com/dm-api/drama/unlock_episode', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "episode_id": EPISODE_ID,
                "check_auto_unlock": 1,
                "series_id": SERIES_ID,
                "auto_unlock": 0,
                "diamondUnlock": 0,
                "diamondCheckUnlock": 0
            })
        });
        
        const data = await res.json();
        console.log("Phản hồi từ Server:", JSON.stringify(data));
        
        if (data.code === 200) {
            console.log("🎉 Mở khóa thành công! Bạn có thể vào app phát trực tiếp tập này.");
        } else {
            console.log("❌ Thất bại:", data.message || data.err_msg || "Lỗi không xác định");
        }
    } catch (e) {
        console.log("Lỗi kết nối:", e.message);
    }
}

unlockEpisode();
