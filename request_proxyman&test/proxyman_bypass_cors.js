/**
 * Proxyman Script: Bypass CORS cho Web App DramaWave Downloader
 * 
 * Cách hoạt động:
 * Khi chạy Web App bằng file index.html cục bộ (giao thức file://), trình duyệt sẽ chặn request do lỗi CORS.
 * Script này tự động chèn thêm các header CORS (Access-Control-Allow-Origin: *) vào mọi Response 
 * gửi về trình duyệt, giúp Web App gửi fetch request thành công 100% không bị chặn.
 */

function onRequest(request) {
    // Cho phép tất cả request đi qua bình thường
    return request;
}

function onResponse(request, response) {
    if (!response) {
        return response;
    }

    try {
        // Khởi tạo headers nếu chưa có
        if (!response.headers) {
            response.headers = {};
        }

        // Tự động chèn các Header cho phép chia sẻ tài nguyên chéo nguồn (CORS Bypass)
        response.headers["Access-Control-Allow-Origin"] = "*";
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE";
        response.headers["Access-Control-Allow-Headers"] = "*";
        response.headers["Access-Control-Allow-Credentials"] = "true";

        // Nếu trình duyệt gửi request kiểm tra OPTIONS (Preflight), ép phản hồi thành công 200 OK
        if (request.method === "OPTIONS") {
            response.statusCode = 200;
        }
    } catch (e) {
        console.error("PROXYMAN CORS SCRIPT ERROR: " + e.message);
    }

    return response;
}
