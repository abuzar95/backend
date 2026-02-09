# User System Setup

## ✅ What's Been Created

### 1. User Table in Database
- **Table**: `User`
- **Columns**:
  - `id` (UUID, primary key)
  - `email` (unique)
  - `name` (optional)
  - `password_hash` (optional, for future auth)
  - `role` (enum: admin, user)
  - `created_at`, `updated_at`

### 2. Admin User Created
- **Email**: `admin@prospectmanager.com`
- **Role**: `admin`
- **User ID**: `aef5e700-1401-4e3f-bd54-5be9d645df0f`
- **Password**: Not set (will be added when auth is implemented)

### 3. Prospect Table Updated
- `user_id` column already exists (String, required)
- Foreign key relation to User table
- Cascade delete (if user is deleted, prospects are deleted)

### 4. Extension Updated
- Default user_id set to admin user ID
- Settings button to change user_id
- User ID stored in Chrome storage
- User ID displayed in extension popup

## 📝 How to Use

### Extension
1. Open extension popup
2. Default user_id is set to admin user
3. Click "Settings" to change user_id
4. Enter any valid user_id from database
5. Save - this user_id will be used for all prospect creations

### Creating Prospects
- Extension automatically sends `user_id` in the payload
- Backend receives and saves it with the prospect
- No manual user_id entry needed

### API Endpoints
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/prospects` - Create prospect (requires user_id in body)

## 🔮 Future: Authentication System
When auth is implemented:
- Users will login and get JWT token
- Token will contain user_id
- Backend will extract user_id from token automatically
- No need to send user_id in payload

## 📊 Current Admin User
```
ID: aef5e700-1401-4e3f-bd54-5be9d645df0f
Email: admin@prospectmanager.com
Role: admin
```

Use this ID in extension settings or when creating prospects manually.
