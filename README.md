# 🛠️ Hướng dẫn cài đặt & Chạy DramaWave Downloader


## 📋 Yêu cầu hệ thống

### Cài đặt FFmpeg bản đầy đủ (Hỗ trợ libass)
Để tính năng ghi cứng phụ đề (Hardsub) hoạt động, FFmpeg cài trên máy chạy server bắt buộc phải được biên dịch hỗ trợ bộ lọc `subtitles` (thư viện `libass`).

#### 🍏 Trên macOS:
```bash
# Gỡ bản cũ nếu có
brew uninstall ffmpeg

# Thêm tap chuyên dụng và cài bản đầy đủ
brew tap homebrew-ffmpeg/ffmpeg
brew install homebrew-ffmpeg/ffmpeg/ffmpeg
```

#### 💻 Trên Windows:
Cài đặt FFmpeg bản đầy đủ qua winget:
```bash
winget install Gyan.FFmpeg
```
*(Hoặc tải bản build sẵn `.zip` từ [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), giải nén và thêm đường dẫn của thư mục `bin` vào biến môi trường `PATH` của hệ thống).*

#### 🐧 Trên Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg libass-dev -y
```

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Chạy trực tiếp bằng Node.js (Yêu cầu cài đặt FFmpeg ở trên)
Dự án sử dụng các module tích hợp sẵn của Node.js, không cần chạy `npm install` các thư viện bên thứ ba:
```bash
node server.js
```

### Cách 2: Chạy bằng Docker (Tiện lợi nhất - Không cần cài đặt Node.js hay FFmpeg)
Nếu máy tính hoặc server của bạn đã cài đặt Docker, bạn không cần cài đặt bất kỳ môi trường hay FFmpeg nào nữa. Dự án đã cấu hình sẵn Dockerfile và Docker Compose:
```bash
docker compose up -d --build
```
*Sau khi chạy, truy cập ứng dụng ngay tại: [http://localhost:3000](http://localhost:3000)*
