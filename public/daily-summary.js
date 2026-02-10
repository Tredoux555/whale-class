// public/daily-summary.js
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

const datePicker = document.getElementById('datePicker');
const content = document.getElementById('content');

// Set today's date
datePicker.value = new Date().toISOString().split('T')[0];

async function loadData() {
  content.innerHTML = '<div class="loading">⏳ Loading...</div>';

  try {
    const res = await fetch('/api/whale/daily-summary?date=' + datePicker.value);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    renderData(data);
  } catch (err) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">❌</div><p>Error: ' + escapeHtml(err.message) + '</p></div>';
  }
}

function renderData(data) {
  const { stats, photos, completions } = data;

  let html = `
    <div class="stats">
      <div class="stat">
        <div class="stat-icon">👶</div>
        <div class="stat-value">${escapeHtml(stats.childrenActive)}</div>
        <div class="stat-label">Children Active</div>
      </div>
      <div class="stat">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${escapeHtml(stats.totalCompletions)}</div>
        <div class="stat-label">Works Completed</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📸</div>
        <div class="stat-value">${escapeHtml(stats.totalPhotos)}</div>
        <div class="stat-label">Photos</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${escapeHtml(stats.totalAssignments)}</div>
        <div class="stat-label">Assignments</div>
      </div>
    </div>
  `;

  if (photos && photos.length > 0) {
    html += '<div class="section"><h2>📸 Photos (' + escapeHtml(photos.length) + ')</h2><div class="photos">';
    photos.forEach(function(p) {
      html += `
        <div class="photo-card">
          <img src="${escapeHtml(p.photo_url)}" alt="Photo">
          <div class="photo-info">
            <div class="name">${escapeHtml(p.child?.avatar_emoji || '👶')} ${escapeHtml(p.child?.name || 'Unknown')}</div>
            <div class="activity">${escapeHtml(p.notes || 'Photo')}</div>
          </div>
        </div>
      `;
    });
    html += '</div></div>';
  }

  if (completions && completions.length > 0) {
    html += '<div class="section"><h2>✅ Work Completed (' + escapeHtml(completions.length) + ')</h2><table>';
    html += '<tr><th>Child</th><th>Activity</th><th>Area</th><th>Status</th></tr>';
    completions.forEach(function(c) {
      const statusClass = c.status === 'mastered' ? 'status-mastered' :
                         c.status === 'practicing' ? 'status-practicing' : 'status-presented';
      html += `
        <tr>
          <td>${escapeHtml(c.child?.avatar_emoji || '👶')} ${escapeHtml(c.child?.name || 'Unknown')}</td>
          <td>${escapeHtml(c.activity?.name || 'Activity')}</td>
          <td>${escapeHtml(c.activity?.area || '-')}</td>
          <td><span class="status ${statusClass}">${escapeHtml(c.status || 'presented')}</span></td>
        </tr>
      `;
    });
    html += '</table></div>';
  }

  if (stats.childrenActive === 0) {
    html += '<div class="empty"><div class="empty-icon">📭</div><p>No activity recorded for this date</p></div>';
  }

  content.innerHTML = html;
}

datePicker.addEventListener('change', loadData);
loadData();
