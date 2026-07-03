# Sử dụng Node.js base image chính thức (Debian-based)
FROM node:18-slim

# Cài đặt FFmpeg bản đầy đủ (gói ffmpeg trên Debian mặc định có sẵn subtitles filter và libass)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy toàn bộ mã nguồn dự án vào container
COPY . .

# Expose cổng 3000
EXPOSE 3000

# Lệnh chạy ứng dụng
CMD ["node", "server.js"]
