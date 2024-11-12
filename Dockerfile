# Sử dụng hình ảnh Node.js phiên bản 16
FROM node:18

# Tạo thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json vào thư mục làm việc
COPY package*.json ./

# Cài đặt các gói phụ thuộc
RUN npm install

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Mở cổng mà ứng dụng sẽ chạy (Render sẽ tự động sử dụng biến môi trường $PORT)
EXPOSE 5000

# Chạy ứng dụng
CMD ["npm", "start"]