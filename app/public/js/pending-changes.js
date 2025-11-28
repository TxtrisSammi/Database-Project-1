// Pending Changes Modal Functionality

let pendingChangesModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  createPendingChangesModal();
  loadPendingChangesCount();
  
  // Refresh count every 30 seconds
  setInterval(loadPendingChangesCount, 30000);
});

function createPendingChangesModal() {
  // Create modal HTML
  const modalHTML = `
    <div id="pending-changes-modal" class="pending-modal hidden">
      <div class="pending-modal-content">
        <div class="pending-modal-header">
          <h2>Pending Changes</h2>
          <button class="pending-modal-close" onclick="closePendingChangesModal()">×</button>
        </div>
        <div id="pending-changes-list"></div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  pendingChangesModal = document.getElementById('pending-changes-modal');
  
  // Add click handler to link
  const link = document.getElementById('pending-changes-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openPendingChangesModal();
    });
  }
  
  // Close on background click
  pendingChangesModal.addEventListener('click', (e) => {
    if (e.target === pendingChangesModal) {
      closePendingChangesModal();
    }
  });
}

async function loadPendingChangesCount() {
  try {
    const response = await fetch('/api/pending-changes');
    if (response.ok) {
      const data = await response.json();
      const count = data.changes.length;
      
      const badge = document.getElementById('pending-changes-badge');
      if (badge) {
        badge.textContent = count;
        if (count > 0) {
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    }
  } catch (error) {
    console.error('Failed to load pending changes count:', error);
  }
}

async function openPendingChangesModal() {
  try {
    const response = await fetch('/api/pending-changes');
    if (response.ok) {
      const data = await response.json();
      displayPendingChanges(data.changes);
      pendingChangesModal.classList.remove('hidden');
    } else {
      alert('Failed to load pending changes');
    }
  } catch (error) {
    console.error('Failed to load pending changes:', error);
    alert('Failed to load pending changes');
  }
}

function closePendingChangesModal() {
  pendingChangesModal.classList.add('hidden');
}

function displayPendingChanges(changes) {
  const listContainer = document.getElementById('pending-changes-list');
  
  if (changes.length === 0) {
    listContainer.innerHTML = '<div class="pending-empty">No pending changes</div>';
    return;
  }
  
  listContainer.innerHTML = changes.map(change => {
    const timeAgo = getTimeAgo(new Date(change.CreatedAt));
    let description = '';
    let typeLabel = '';
    
    if (change.ChangeType === 'REMOVE_TRACK') {
      typeLabel = 'REMOVE TRACK';
      description = `Remove "${change.TrackName || 'Unknown Track'}" from "${change.PlaylistName || 'Unknown Playlist'}"`;
    } else if (change.ChangeType === 'CREATE_PLAYLIST') {
      typeLabel = 'CREATE PLAYLIST';
      description = `Create playlist "${change.PlaylistName || 'Unknown Playlist'}" in Spotify`;
    } else if (change.ChangeType === 'DELETE_PLAYLIST') {
      typeLabel = 'DELETE PLAYLIST';
      description = `Delete playlist "${change.PlaylistName || 'Unknown Playlist'}" from Spotify`;
    }
    
    return `
      <div class="pending-change-item" data-change-id="${change.ChangeId}">
        <div class="pending-change-info">
          <div class="pending-change-type">${typeLabel}</div>
          <div class="pending-change-description">${description}</div>
          <div class="pending-change-time">${timeAgo}</div>
        </div>
        <button class="pending-change-cancel" onclick="cancelPendingChange(${change.ChangeId})">Cancel</button>
      </div>
    `;
  }).join('');
}

async function cancelPendingChange(changeId) {
  if (!confirm('Are you sure you want to cancel this change?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/pending-changes/${changeId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      // Remove from UI
      const item = document.querySelector(`[data-change-id="${changeId}"]`);
      if (item) {
        item.style.opacity = '0';
        item.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          item.remove();
          
          // Check if list is empty
          const listContainer = document.getElementById('pending-changes-list');
          if (listContainer.children.length === 0) {
            listContainer.innerHTML = '<div class="pending-empty">No pending changes</div>';
          }
          
          // Update badge count
          loadPendingChangesCount();
        }, 300);
      }
    } else {
      alert('Failed to cancel change. Please try again.');
    }
  } catch (error) {
    console.error('Failed to cancel change:', error);
    alert('Failed to cancel change. Please try again.');
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) !== 1 ? 's' : ''} ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) !== 1 ? 's' : ''} ago`;
}
