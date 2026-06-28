# Augmont Gold Tech — Fullstack Developer Assignment

## Tech Stack
- **Backend**: Node.js (Express), PostgreSQL (via Sequelize ORM), JWT auth, Multer, XLSX
- **Frontend**: Angular 17+, Angular Material
- **Key Features**: Server-side pagination, bulk upload (async/non-blocking), streaming CSV/XLSX export

---

## 🚀 Backend Setup

### 1. Navigate to backend folder
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
On **Windows**:
```cmd
copy .env.example .env
```
On **Mac/Linux**:
```bash
cp .env.example .env
```
Then open `.env` and fill in your PostgreSQL password:
```
DB_PASSWORD=your_postgres_password
JWT_SECRET=any_long_random_string
```

### 4. Create PostgreSQL database
Open **pgAdmin** → right-click **Databases** → **Create** → **Database** → name it `augmont_db` → Save.

Or run in pgAdmin Query Tool:
```sql
CREATE DATABASE augmont_db;
```

### 5. Run migrations (auto-creates all tables)
```bash
node config/migrate.js
```
You should see:
```
✅ DB connection established.
✅ All models synchronized.
```

### 6. Start the server
```bash
npm run dev       # development (auto-restarts on file change)
npm start         # production
```

Server runs at: `http://localhost:3000`
Health check: `http://localhost:3000/health`

---

## 🅰 Angular Frontend Setup

### 1. Navigate to frontend folder
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the frontend
```bash
npm start
```

Frontend runs at: `http://localhost:4200`

> ⚠️ Make sure the backend is running on port 3000 before starting the frontend.

---

## 🧪 Testing with Postman

1. Open Postman → click **Import**
2. Select `postman/Augmont_Assignment.postman_collection.json`
3. Run requests in this order:
   - **Auth → Register** (creates your user)
   - **Auth → Login** (token auto-saves)
   - **Categories → Create Category**
   - **Products → Create Product**
   - **Products → Get All Products**

---

## 📋 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login, get JWT |
| GET | /api/auth/profile | Get current user |
| PUT | /api/auth/profile | Update profile |
| GET | /api/categories | List categories (paginated) |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |
| GET | /api/products | List products (paginated, sortable, searchable) |
| POST | /api/products | Create product (multipart/form-data) |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/bulk-template | Download sample XLSX |
| POST | /api/products/bulk-upload | Upload CSV/XLSX (async, returns jobId) |
| GET | /api/products/bulk-status/:jobId | Poll upload progress |
| GET | /api/reports/products?format=csv\|xlsx | Download product report |

### Product List Query Params
```
?page=1&limit=10&sortBy=price&sortOrder=asc&search=gold&category_id=2
```

---

## 🔑 How the tricky parts work

### Bulk Upload (no 504 timeout)
1. `POST /api/products/bulk-upload` returns **immediately** with `202 Accepted` + a `jobId`
2. The file is processed **in the background** in chunks of 100 rows
3. Client polls `GET /api/products/bulk-status/:jobId` every 2 seconds
4. Angular uses `rxjs/interval` + `takeUntil` to auto-stop polling when `status === 'completed'`

### Report Download (no 504 timeout)
- **CSV**: Streams rows directly to the HTTP response in batches of 500 — no memory buildup
- **XLSX**: Fetches rows in batches of 1000, builds workbook, sends as buffer
- Both avoid loading all data into memory at once

---
