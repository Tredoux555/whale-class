// Test script for admin message API
// Run this in browser console while logged into admin dashboard

(async () => {
  try {
    // Get session token
    const session = sessionStorage.getItem('story_admin_session');
    if (!session) {
      console.error('❌ No session found. Please log in first.');
      return;
    }
    
    console.log('✅ Session token found');
    console.log('Token length:', session.length);
    console.log('Token preview:', session.substring(0, 20) + '...');
    
    // Test API call
    console.log('\n📤 Sending test message...');
    const response = await fetch('/api/story/admin/send-message', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session}`
      },
      body: JSON.stringify({ 
        message: 'Test message from browser console', 
        author: 'Admin' 
      })
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📥 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Success!');
    } else {
      console.error('❌ Error:', data.error);
      if (data.details) console.error('Details:', data.details);
      if (data.hint) console.error('Hint:', data.hint);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
})();
