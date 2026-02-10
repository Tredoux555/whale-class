// public/video-discovery-demo.js
// Phase 6: Extracted from inline script for CSP compliance

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

var API_BASE = window.location.origin;

function showStatus(message, type) {
  type = type || 'info';
  var statusDiv = document.getElementById('status');
  // Validate type against allowlist to prevent CSS class injection
  var validTypes = ['info', 'success', 'error', 'loading'];
  var safeType = validTypes.indexOf(type) !== -1 ? type : 'info';
  statusDiv.innerHTML = '<div class="status ' + safeType + '">' + escapeHtml(message) + '</div>';
}

function showResults(data) {
  var resultsDiv = document.getElementById('results');
  if (!data) return;

  var html = '<div class="results"><h3>📊 Discovery Results</h3>';

  if (data.totalWorks !== undefined) {
    html += '<div class="result-item">';
    html += '<strong>Total Works:</strong> ' + escapeHtml(data.totalWorks);
    html += '</div>';
    html += '<div class="result-item">';
    html += '<strong>Videos Found:</strong> ' + escapeHtml(data.videosFound || 0);
    html += '</div>';
    html += '<div class="result-item">';
    html += '<strong>Coverage:</strong> ' + escapeHtml(data.coveragePercent || 0) + '%';
    html += '</div>';

    if (data.videosFound > 0) {
      html += '<div style="margin-top: 20px;">';
      html += '<p><strong>✅ Next Steps:</strong></p>';
      html += '<ol style="line-height: 2; padding-left: 20px;">';
      html += '<li>Go to <a href="/admin/video-management" class="link">Video Management</a></li>';
      html += '<li>Review videos in "Pending" tab</li>';
      html += '<li>Click "Approve" for good videos</li>';
      html += '<li>Videos will appear on curriculum pages automatically!</li>';
      html += '</ol></div>';
    }
  } else if (data.stats) {
    html += '<div class="result-item">';
    html += '<strong>Total Works:</strong> ' + escapeHtml(data.stats.total_works || 0);
    html += '</div>';
    html += '<div class="result-item">';
    html += '<strong>Works with Videos:</strong> ' + escapeHtml(data.stats.works_with_videos || 0);
    html += '</div>';
    html += '<div class="result-item">';
    html += '<strong>Pending Approval:</strong> ' + escapeHtml(data.stats.works_pending_approval || 0);
    html += '</div>';
    html += '<div class="result-item">';
    html += '<strong>Missing Videos:</strong> ' + escapeHtml(data.stats.works_missing_videos || 0);
    html += '</div>';
  }

  html += '</div>';
  resultsDiv.innerHTML = html;
}

async function startDiscovery() {
  var btn = document.getElementById('discoverBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Discovering...';

  showStatus('🔄 Starting video discovery... This may take 2-3 minutes.', 'loading');
  document.getElementById('results').innerHTML = '';

  try {
    var response = await fetch(API_BASE + '/api/youtube/discover-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        forceAll: false,
        minScore: 60,
        autoApprove: false
      })
    });

    var data = await response.json();

    if (data.success) {
      showStatus('✅ Discovery complete! Found ' + escapeHtml(data.videosFound) + ' videos out of ' + escapeHtml(data.totalWorks) + ' works (' + escapeHtml(data.coveragePercent) + '% coverage).', 'success');
      showResults(data);
    } else {
      showStatus('❌ Discovery failed: ' + escapeHtml(data.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showStatus('❌ Error: ' + escapeHtml(error.message) + '. Make sure the server is running and you\'re logged in.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Discover Videos';
  }
}

async function checkStats() {
  var btn = document.getElementById('statsBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';

  showStatus('📊 Fetching statistics...', 'info');

  try {
    var response = await fetch(API_BASE + '/api/youtube/discover-all');
    var data = await response.json();

    if (data.success && data.stats) {
      showStatus('✅ Statistics loaded!', 'success');
      showResults(data);
    } else {
      showStatus('ℹ️ No statistics available yet. Run discovery first!', 'info');
    }
  } catch (error) {
    showStatus('❌ Error: ' + escapeHtml(error.message), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Check Statistics';
  }
}

// Check stats on load
window.addEventListener('load', function() {
  checkStats();
});
