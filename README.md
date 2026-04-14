# 📺 Watch Together

A real-time web application that allows multiple users to watch YouTube videos **in sync** while interacting through **live chat**.

Built using **Django**, **Django Channels**, and **ASGI** to enable real-time communication via WebSockets.

---

## 🚀 Features

* 🔗 Create and share room links
* 👥 Join rooms with multiple users
* ▶️ Host-controlled video playback (play, pause, seek)
* 🔄 Real-time video synchronization across all users
* 💬 Live chat system inside each room
* 🎥 YouTube video integration
* 🔐 Built-in authentication (register, login, logout)

---

## 🧱 Tech Stack

* **Backend:** Django
* **Real-Time:** Django Channels
* **Protocol:** ASGI
* **Frontend:** Django Templates (HTML, CSS, JS)
* **Video Source:** YouTube Embed API
* **Database:** SQLite (default)

---

## ⚙️ How It Works

1. User creates a room
2. A unique room link is generated
3. Other users join using the link
4. WebSocket connection is established
5. Host actions (play/pause/seek) are broadcast to all users
6. All clients stay synchronized in real-time

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Ayushhuh/seproj.git
cd seproj
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

Activate it:

* Windows:

```bash
venv\Scripts\activate
```

* Mac/Linux:

```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Apply Migrations

```bash
python manage.py migrate
```

### 5. Run Server (ASGI)

```bash
python manage.py runserver
```

(Optional: Using Daphne)

```bash
daphne your_project_name.asgi:application
```

### 6. Open in Browser

```
http://127.0.0.1:8000/
```

---

## 📡 WebSocket Flow

* Client connects to server via WebSocket
* Events (play, pause, seek, chat) are sent to server
* Server broadcasts events to all users in the room
* All clients update instantly

---

## ⚠️ Important Notes

* Only the **host controls playback**
* Internet speed may affect synchronization slightly
* WebSockets must be properly configured (Channels + ASGI)
* YouTube videos must be publicly accessible
* Authentication is required for room creation (if enabled in settings)

---

## 🔮 Future Improvements

* 📁 Upload and stream custom videos
* 🎤 Voice/video chat integration
* 📱 Mobile responsiveness
* 🌍 Deployment with Redis & scalable channels layer

---

## 👥 Team DJangle

* Ayush Parashar
* Harshit Kumar
* Yuvraj Yadav
* Krish Agarwal

---

## 📌 Final Thought

This project demonstrates how to build **real-time collaborative applications** using Django’s async capabilities and WebSockets.
