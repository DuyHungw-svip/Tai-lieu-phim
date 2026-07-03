/**
 * Proxyman Script: Mở khóa tất cả tập phim trên DramaWave (Front-End)
 * 
 * Cách cài đặt:
 * 1. Mở Proxyman -> Scripting -> Script List (Cmd + Alt + S) -> "+" -> New Script
 * 2. Đặt tên: Unlock All Episodes
 * 3. Điền URL: *api.mydramawave.com/dm-api/drama/info_v2*
 * 4. Paste toàn bộ code này vào ô editor và bấm Save.
 */

function onResponse(request, response) {
    // 1. Kiểm tra response hợp lệ
    if (response.statusCode !== 200 || !response.body) {
        return response;
    }

    try {
        // Parse chuỗi JSON thành JavaScript Object
        var bodyJson = JSON.parse(response.body);

        // 2. Kiểm tra cấu trúc data.info.episode_list
        if (bodyJson && bodyJson.data && bodyJson.data.info && Array.isArray(bodyJson.data.info.episode_list)) {
            var episodes = bodyJson.data.info.episode_list;
            var baseCdn = "https://video-v6.mydramawave.com";
            
            for (var i = 0; i < episodes.length; i++) {
                episodes[i].unlock = true;
                episodes[i].user_unlocked = true;
                episodes[i].video_type = "free";
                episodes[i].episode_price = 0;
                
                // Inject link HLS giả nếu tập chưa có link thật
                if (!episodes[i].external_audio_h264_m3u8 || episodes[i].external_audio_h264_m3u8.length === 0) {
                    episodes[i].external_audio_h264_m3u8 = baseCdn + "/drama/" + bodyJson.data.info.id + "/" + episodes[i].id + "/master.m3u8";
                }
            }
            
            response.body = JSON.stringify(bodyJson);
            console.log("===> PROXYMAN: Đã mở khóa thành công " + episodes.length + " tập phim trên UI!");
        }
    } catch (e) {
        console.error("PROXYMAN SCRIPT ERROR: " + e.message);
    }

    return response;
}
