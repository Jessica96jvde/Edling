# Backend - Server Files

This folder contains the server code that handles data and user requests.

## Files Explained

### Main Files
- `server.js` - Main server file (starts everything)
- `package.json` - Lists required packages
- `.env` - Configuration settings
- `init-db.js` - Sets up demo data

### Models Folder (Database Structure)
- `User.js` - How user data is stored
- `Session.js` - How session data is stored  
- `Feedback.js` - How feedback data is stored

### Routes Folder (API Endpoints)
- `auth.js` - Handles login/register
- `sessions.js` - Handles session operations
- `users.js` - Handles user profile operations
- `feedback.js` - Handles feedback operations

### Middleware Folder
- `auth.js` - Checks if users are logged in

## How It Works

1. **Server Start**: `server.js` starts the web server
2. **Database**: Connects to MongoDB to store data
3. **Routes**: Handle different website requests (login, get sessions, etc.)
4. **Models**: Define how data is structured in database
5. **Middleware**: Checks permissions before allowing actions

## API Endpoints (What Frontend Can Call)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user

### Sessions  
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:id/register` - Register for session

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Get all feedback

### Users
- `GET /api/users/profile` - Get user info
- `PUT /api/users/profile` - Update user info

## Setup Commands

```bash
npm install          # Install packages
node init-db.js     # Setup demo data  
npm start           # Start server
```

## Adding New Features

1. **New Data Type**: Add new model in `models/` folder
2. **New API**: Add new route in `routes/` folder  
3. **Update Server**: Import new route in `server.js`