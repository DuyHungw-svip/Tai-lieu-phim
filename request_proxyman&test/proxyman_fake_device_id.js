/**
 * Proxyman Script: Ép DramaWave tự động tạo tài khoản khách mới
 * 
 * Cách hoạt động:
 * Script này sẽ chặn mọi request gửi đi của DramaWave, tự động ghi đè Token cũ thành Token hết hạn
 * và đổi mã thiết bị (Device-ID) sang một mã ngẫu nhiên mới. 
 * Điều này sẽ ép Server và App phải tự thiết lập một phiên làm việc mới và trả về Token mới.
 */

function onRequest(request) {
    // 1. Kiểm tra an toàn để tránh lỗi khi request hoặc headers không tồn tại
    if (!request || !request.headers) {
        return request;
    }

    try {
        // 2. Tạo ngẫu nhiên một Device-ID mới bằng cách đổi 4 số cuối của ID cũ
        var randomSuffix = Math.floor(1000 + Math.random() * 9000); // Sinh 4 số ngẫu nhiên
        var newDeviceId = "190F8882-BBB7-45BE-AF95-3B4EF549" + randomSuffix;
        
        // 3. Sửa đổi trực tiếp trên các thuộc tính của request.headers
        // Lưu ý quan trọng: Tuyệt đối không gán đè cả object request.headers để tránh làm hỏng liên kết native của Proxyman
        request.headers["device-id"] = newDeviceId;
        
        if (request.headers["Authorization"]) {
            request.headers["Authorization"] = "oauth_signature=expired,oauth_token=expired,ts=1782979547000";
        }
        
        console.log("===> PROXYMAN: Đã giả lập thiết bị mới: " + newDeviceId + " (Đã fake expired Token)");
    } catch (e) {
        console.error("PROXYMAN REQUEST SCRIPT ERROR: " + e.message);
    }

    return request;
}
