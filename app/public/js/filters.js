// Shared filter functionality for playlist and liked-songs pages

let filters = {
  artists: [],
  albums: [],
  genres: [],
  trackName: []
};

function parseFilterInput(input) {
  if (!input) return [];
  
  const terms = [];
  const regex = /"([^"]*)"|([^,]+)/g;
  let match;
  
  while ((match = regex.exec(input)) !== null) {
    const term = match[1] || match[2];
    if (term && term.trim()) {
      const trimmed = term.trim();
      terms.push({
        value: trimmed.toLowerCase(),
        exact: !!match[1]
      });
    }
  }
  
  return terms;
}

function matchesFilter(text, filterTerms) {
  if (filterTerms.length === 0) return true;
  const lowerText = text.toLowerCase();
  
  return filterTerms.some(term => {
    if (term.exact) {
      return lowerText === term.value;
    } else {
      return lowerText.includes(term.value);
    }
  });
}

function filterTracks(tracks, genres) {
  const trackItems = document.querySelectorAll('.track-item');
  let visibleCount = 0;

  trackItems.forEach((item, index) => {
    const track = tracks[index];
    if (!track || !track.track) {
      item.style.display = 'none';
      return;
    }

    let showTrack = true;

    // Artist filter (OR within category)
    if (filters.artists.length > 0) {
      const artistNames = track.track.artists.map(a => a.name).join(' ');
      showTrack = showTrack && matchesFilter(artistNames, filters.artists);
    }

    // Album filter (OR within category)
    if (filters.albums.length > 0) {
      const albumName = track.track.album ? track.track.album.name : '';
      showTrack = showTrack && matchesFilter(albumName, filters.albums);
    }

    // Genre filter (OR within category)
    if (filters.genres.length > 0) {
      const trackGenres = genres[track.track.id] || '';
      showTrack = showTrack && matchesFilter(trackGenres, filters.genres);
    }

    // Track name filter
    if (filters.trackName.length > 0) {
      showTrack = showTrack && matchesFilter(track.track.name, filters.trackName);
    }

    item.style.display = showTrack ? '' : 'none';
    if (showTrack) visibleCount++;
  });

  updateFilterCount(visibleCount, tracks.length);
  updateFilterChips();
}

function updateFilterCount(visible, total) {
  const countEl = document.getElementById('filter-count');
  if (visible === total) {
    countEl.textContent = `Showing all ${total} tracks`;
  } else {
    countEl.textContent = `Showing ${visible} of ${total} tracks`;
  }
}

function updateFilterChips() {
  const chipsContainer = document.getElementById('filter-chips');
  chipsContainer.innerHTML = '';

  const allFilters = [
    ...filters.artists.map(a => ({ type: 'artist', value: a.value, exact: a.exact })),
    ...filters.albums.map(a => ({ type: 'album', value: a.value, exact: a.exact })),
    ...filters.genres.map(g => ({ type: 'genre', value: g.value, exact: g.exact })),
    ...filters.trackName.map(t => ({ type: 'track', value: t.value, exact: t.exact }))
  ];

  if (allFilters.length === 0) {
    chipsContainer.style.display = 'none';
    return;
  }

  chipsContainer.style.display = 'flex';
  allFilters.forEach(filter => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    const prefix = filter.exact ? '=' : '~';
    chip.textContent = `${filter.type} ${prefix} ${filter.value}`;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeFilter(filter.type, filter.value);
    
    chip.appendChild(removeBtn);
    chipsContainer.appendChild(chip);
  });
}

function removeFilter(type, value) {
  if (type === 'artist') {
    filters.artists = filters.artists.filter(a => a.value !== value);
    document.getElementById('artist-filter').value = rebuildFilterInput(filters.artists);
  } else if (type === 'album') {
    filters.albums = filters.albums.filter(a => a.value !== value);
    document.getElementById('album-filter').value = rebuildFilterInput(filters.albums);
  } else if (type === 'genre') {
    filters.genres = filters.genres.filter(g => g.value !== value);
    document.getElementById('genre-filter').value = rebuildFilterInput(filters.genres);
  } else if (type === 'track') {
    filters.trackName = filters.trackName.filter(t => t.value !== value);
    document.getElementById('track-filter').value = rebuildFilterInput(filters.trackName);
  }
  
  // Re-filter tracks with updated global tracks and genres
  if (window.tracksData && window.genresData) {
    filterTracks(window.tracksData, window.genresData);
  }
}

function rebuildFilterInput(terms) {
  return terms.map(t => t.exact ? `"${t.value}"` : t.value).join(', ');
}

function initializeFilters(tracksData, genresData) {
  // Store globally for removeFilter function
  window.tracksData = tracksData;
  window.genresData = genresData;
  
  // Event listeners
  document.getElementById('artist-filter').addEventListener('input', (e) => {
    filters.artists = parseFilterInput(e.target.value);
    filterTracks(tracksData, genresData);
  });

  document.getElementById('album-filter').addEventListener('input', (e) => {
    filters.albums = parseFilterInput(e.target.value);
    filterTracks(tracksData, genresData);
  });

  document.getElementById('genre-filter').addEventListener('input', (e) => {
    filters.genres = parseFilterInput(e.target.value);
    filterTracks(tracksData, genresData);
  });

  document.getElementById('track-filter').addEventListener('input', (e) => {
    filters.trackName = parseFilterInput(e.target.value);
    filterTracks(tracksData, genresData);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    filters = { artists: [], albums: [], genres: [], trackName: [] };
    document.getElementById('artist-filter').value = '';
    document.getElementById('album-filter').value = '';
    document.getElementById('genre-filter').value = '';
    document.getElementById('track-filter').value = '';
    filterTracks(tracksData, genresData);
  });

  // Initialize
  filterTracks(tracksData, genresData);
}
