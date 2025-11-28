// Shared playlist creator functionality

function openCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  const visibleTracks = getVisibleTracks();
  
  if (visibleTracks.length === 0) {
    alert('No tracks to save. Please adjust your filters.');
    return;
  }
  
  const countDisplay = document.getElementById('track-count-display');
  countDisplay.textContent = `This will create a playlist with ${visibleTracks.length} track${visibleTracks.length !== 1 ? 's' : ''}.`;
  
  modal.classList.remove('hidden');
}

function closeCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  modal.classList.add('hidden');
  document.getElementById('create-playlist-form').reset();
}

function getVisibleTracks() {
  const trackItems = document.querySelectorAll('.track-item');
  const visibleTrackIds = [];
  
  trackItems.forEach((item, index) => {
    if (item.style.display !== 'none') {
      const track = window.tracksData[index];
      if (track && track.track && track.track.id) {
        visibleTrackIds.push(track.track.id);
      }
    }
  });
  
  return visibleTrackIds;
}

function initializePlaylistCreator(userId) {
  // Save filtered playlist button
  const saveBtn = document.getElementById('save-filtered-playlist');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      openCreatePlaylistModal();
    });
  }

  // Form submission
  document.getElementById('create-playlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('playlist-name').value.trim();
    const description = document.getElementById('playlist-description').value.trim();
    const visibleTrackIds = getVisibleTracks();
    
    if (!name) {
      alert('Please enter a playlist name.');
      return;
    }
    
    if (visibleTrackIds.length === 0) {
      alert('No tracks to save.');
      return;
    }
    
    if (!userId) {
      alert('User not logged in. Please refresh the page.');
      return;
    }
    
    try {
      showLoadingOverlay();
      
      const response = await fetch('/api/playlists/create-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description: description || null,
          trackIds: visibleTrackIds,
          userId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Playlist created:', result);
        
        // Redirect to the new playlist
        window.location.href = '/playlists/' + result.playlistId;
      } else {
        const error = await response.json();
        alert('Failed to create playlist: ' + (error.error || 'Unknown error'));
        document.getElementById('loading-overlay').classList.add('hidden');
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist. Please try again.');
      document.getElementById('loading-overlay').classList.add('hidden');
    }
  });
}
