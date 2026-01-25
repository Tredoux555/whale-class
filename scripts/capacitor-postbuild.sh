#!/bin/bash
# Post-build script for Capacitor - replaces Next.js pages with pure HTML

OUT_DIR="out"

# Landing page
cat > "$OUT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Montree</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(to bottom, #ecfdf5, #ffffff, #ecfdf5);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header { padding: 16px 24px; display: flex; align-items: center; gap: 8px; }
    .header-icon { font-size: 28px; }
    .header-text { font-size: 20px; font-weight: bold; color: #065f46; }
    .main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
    .logo { width: 128px; height: 128px; border-radius: 50%; background: linear-gradient(to bottom right, #d1fae5, #a7f3d0); display: flex; align-items: center; justify-content: center; margin-bottom: 32px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.3); }
    .logo span { font-size: 72px; }
    h1 { font-size: 28px; color: #1f2937; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 48px; font-size: 18px; }
    .buttons { width: 100%; max-width: 300px; display: flex; flex-direction: column; gap: 12px; }
    .btn { display: block; padding: 18px 24px; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 18px; }
    .btn-primary { background: #10b981; color: white; box-shadow: 0 4px 14px -3px rgba(16, 185, 129, 0.5); }
    .btn-secondary { background: white; color: #047857; border: 2px solid #a7f3d0; }
    .btn-demo { background: #fef3c7; color: #92400e; border: 2px solid #fcd34d; }
    .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <header class="header">
    <span class="header-icon">🌳</span>
    <span class="header-text">Montree</span>
  </header>
  <main class="main">
    <div class="logo"><span>🌳</span></div>
    <h1>Watch them grow</h1>
    <p class="subtitle">Simple progress tracking for Montessori</p>
    <div class="buttons">
      <a href="/montree/login/index.html" class="btn btn-primary">Teacher Login</a>
      <a href="/montree/demo/index.html" class="btn btn-demo">✨ Try Demo</a>
    </div>
  </main>
  <footer class="footer">Your data stays on your device</footer>
</body>
</html>
EOF

# Create montree directory if needed
mkdir -p "$OUT_DIR/montree/login"
mkdir -p "$OUT_DIR/montree/dashboard"
mkdir -p "$OUT_DIR/montree/demo"

# Login page
cat > "$OUT_DIR/montree/login/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Login - Montree</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #ecfdf5, #d1fae5); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: white; border-radius: 24px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); width: 100%; max-width: 400px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header span { font-size: 48px; }
    .header h1 { font-size: 24px; margin-top: 8px; color: #1f2937; }
    .header p { color: #6b7280; font-size: 14px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 14px 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; outline: none; }
    .form-group input:focus { border-color: #10b981; }
    .btn { display: block; width: 100%; padding: 16px; background: #10b981; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; margin-top: 8px; }
    .btn-secondary { background: #f3f4f6; color: #4b5563; margin-top: 12px; }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; display: none; }
    .tabs { display: flex; margin-bottom: 24px; background: #f3f4f6; border-radius: 10px; padding: 4px; }
    .tab { flex: 1; padding: 10px; text-align: center; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6b7280; }
    .tab.active { background: white; color: #1f2937; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span>🌱</span>
      <h1>Montree</h1>
      <p>Teacher Login</p>
    </div>
    
    <div class="tabs">
      <div class="tab active" onclick="showTab('password')">Password</div>
      <div class="tab" onclick="showTab('code')">First Time</div>
    </div>
    
    <div id="error" class="error"></div>
    
    <form id="passwordForm" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" id="name" placeholder="Enter your name" required>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="password" placeholder="Enter password" required>
      </div>
      <button type="submit" class="btn">Login →</button>
    </form>
    
    <form id="codeForm" style="display:none" onsubmit="handleCode(event)">
      <div class="form-group">
        <label>Setup Code</label>
        <input type="text" id="code" placeholder="e.g. whale-7392" required>
      </div>
      <button type="submit" class="btn">Continue →</button>
    </form>
    
    <a href="/index.html" class="btn btn-secondary">← Back to Home</a>
  </div>
  
  <script>
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('passwordForm').style.display = tab === 'password' ? 'block' : 'none';
      document.getElementById('codeForm').style.display = tab === 'code' ? 'block' : 'none';
      document.getElementById('error').style.display = 'none';
    }
    
    function showError(msg) {
      var err = document.getElementById('error');
      err.textContent = msg;
      err.style.display = 'block';
    }
    
    function handleLogin(e) {
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var password = document.getElementById('password').value;
      
      // Store locally and go to dashboard
      localStorage.setItem('montree_teacher', JSON.stringify({ name: name, id: 'local' }));
      window.location.href = '/montree/dashboard/index.html';
    }
    
    function handleCode(e) {
      e.preventDefault();
      showError('Setup codes require internet connection');
    }
  </script>
</body>
</html>
EOF

# Dashboard page
cat > "$OUT_DIR/montree/dashboard/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Dashboard - Montree</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #f8fafc, #ecfdf5, #f0fdfa); min-height: 100vh; }
    .header { background: white; border-bottom: 1px solid #e5e7eb; padding: 16px; position: sticky; top: 0; z-index: 40; }
    .header-content { display: flex; align-items: center; justify-content: space-between; max-width: 800px; margin: 0 auto; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left span { font-size: 28px; }
    .header-title { font-size: 18px; font-weight: 600; color: #1e293b; }
    .header-sub { font-size: 12px; color: #9ca3af; }
    .logout-btn { padding: 8px 16px; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .main { padding: 24px; max-width: 800px; margin: 0 auto; }
    .welcome { background: #dbeafe; padding: 20px; border-radius: 16px; text-align: center; margin-bottom: 24px; color: #1e40af; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .student { background: white; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; margin: 0 auto 8px; }
    .student-name { font-size: 14px; color: #374151; }
    .nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: white; padding: 12px; border-radius: 16px; }
    .nav a { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; text-decoration: none; color: #4b5563; font-size: 12px; border-radius: 12px; }
    .nav a:active { background: #f3f4f6; }
    .nav span { font-size: 24px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <div class="header-left">
        <span>🐋</span>
        <div>
          <div class="header-title">Whale Class</div>
          <div class="header-sub" id="teacherName">Loading...</div>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </div>
  </header>
  
  <main class="main">
    <div class="welcome">
      ✅ Dashboard loaded successfully!<br>
      <small>Navigation is working properly.</small>
    </div>
    
    <div class="grid" id="students"></div>
    
    <div class="nav">
      <a href="#progress"><span>📊</span>Progress</a>
      <a href="#reports"><span>📝</span>Reports</a>
      <a href="#games"><span>🎮</span>Games</a>
      <a href="#tools"><span>🔧</span>Tools</a>
    </div>
  </main>
  
  <script>
    var students = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver'];
    var colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    
    function init() {
      var teacher = localStorage.getItem('montree_teacher');
      if (teacher) {
        try {
          var t = JSON.parse(teacher);
          document.getElementById('teacherName').textContent = t.name || 'Teacher';
        } catch(e) {
          document.getElementById('teacherName').textContent = 'Teacher';
        }
      }
      
      var grid = document.getElementById('students');
      students.forEach(function(name, i) {
        grid.innerHTML += '<div class="student"><div class="avatar" style="background:' + colors[i] + '">' + name[0] + '</div><div class="student-name">' + name + '</div></div>';
      });
    }
    
    function logout() {
      localStorage.removeItem('montree_teacher');
      window.location.href = '/index.html';
    }
    
    init();
  </script>
</body>
</html>
EOF

# Demo page
cat > "$OUT_DIR/montree/demo/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Demo - Montree</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #fef3c7, #fefce8); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
    .icon { font-size: 80px; margin-bottom: 24px; }
    h1 { font-size: 28px; color: #1f2937; margin-bottom: 8px; }
    p { color: #6b7280; margin-bottom: 32px; text-align: center; max-width: 300px; }
    .btn { display: block; width: 280px; padding: 18px; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 18px; margin-bottom: 12px; }
    .btn-primary { background: #f59e0b; color: white; box-shadow: 0 4px 14px -3px rgba(245, 158, 11, 0.5); }
    .btn-secondary { background: white; color: #6b7280; }
  </style>
</head>
<body>
  <div class="icon">✨</div>
  <h1>Demo Mode</h1>
  <p>Explore Montree with sample data. No account needed!</p>
  <a href="/montree/dashboard/index.html" class="btn btn-primary" onclick="startDemo()">Start Demo →</a>
  <a href="/index.html" class="btn btn-secondary">← Back to Home</a>
  
  <script>
    function startDemo() {
      localStorage.setItem('montree_teacher', JSON.stringify({ name: 'Demo Teacher', id: 'demo' }));
    }
  </script>
</body>
</html>
EOF

# Montree landing
cat > "$OUT_DIR/montree/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Montree</title>
  <script>window.location.href = '/index.html';</script>
</head>
<body></body>
</html>
EOF

echo "✅ Pure HTML pages created for Capacitor!"
