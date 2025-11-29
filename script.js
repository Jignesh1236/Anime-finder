const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
    'Thriller', 'Mecha', 'Music', 'Psychological', 'School', 'Shounen',
    'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Ecchi', 'Harem'
];

const GENRE_ID_MAP = {
    'Action': 1, 'Adventure': 2, 'Comedy': 4, 'Drama': 8, 'Fantasy': 10,
    'Horror': 14, 'Mystery': 7, 'Romance': 22, 'Sci-Fi': 24, 'Slice of Life': 36,
    'Sports': 30, 'Supernatural': 37, 'Thriller': 41, 'Mecha': 18, 'Music': 19,
    'Psychological': 40, 'School': 23, 'Shounen': 27, 'Shoujo': 25, 'Seinen': 42,
    'Josei': 43, 'Isekai': 62, 'Ecchi': 9, 'Harem': 35
};

const HINDI_DUB_ANIME = new Set([
    20, 21, 1735, 25755, 38000, 11757, 25777, 35760, 38524, 40748, 32281, 28851, 1575, 31240, 9253, 31964, 11061, 22319
]);

let currentPage = 1;
let currentData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initGenres();
    setupEventListeners();
    fetchAnime();
});

function initGenres() {
    const select = document.getElementById('genreFilter');
    GENRES.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', () => {
        currentPage = 1;
        fetchAnime();
    });

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            fetchAnime();
        }
    });

    document.getElementById('applyFilters').addEventListener('click', () => {
        currentPage = 1;
        fetchAnime();
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAnime();
            window.scrollTo(0, 0);
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentData?.pagination?.has_next_page) {
            currentPage++;
            fetchAnime();
            window.scrollTo(0, 0);
        }
    });

    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function fetchAnime() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const grid = document.getElementById('animeGrid');

    loading.style.display = 'block';
    error.style.display = 'none';
    grid.innerHTML = '';

    try {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('limit', '24');

        const search = document.getElementById('searchInput').value;
        if (search) params.set('q', search);

        const genre = document.getElementById('genreFilter').value;
        if (genre) {
            const genreId = GENRE_ID_MAP[genre];
            if (genreId) params.set('genres', genreId);
        }

        const type = document.getElementById('typeFilter').value;
        if (type) params.set('type', type);

        const status = document.getElementById('statusFilter').value;
        if (status) params.set('status', status);

        const rating = document.getElementById('ratingFilter').value;
        if (rating) params.set('rating', rating);

        const minScore = document.getElementById('minScore').value;
        if (minScore) params.set('min_score', minScore);

        const maxScore = document.getElementById('maxScore').value;
        if (maxScore) params.set('max_score', maxScore);

        const adult = document.getElementById('adultFilter').value;
        params.set('sfw', adult === 'off' ? 'true' : 'false');

        const sort = document.getElementById('sortFilter').value;
        params.set('order_by', sort);
        params.set('sort', sort === 'score' ? 'desc' : 'asc');

        const response = await fetch(`${JIKAN_BASE_URL}/anime?${params.toString()}`);
        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        let anime = data.data.map(transformAnime);

        // Filter 18+ content
        const adultFilter = document.getElementById('adultFilter').value;
        if (adultFilter === 'only') {
            anime = anime.filter(a => {
                const r = a.rating?.toLowerCase() || '';
                return (r.startsWith('r') || r.includes('hentai')) && !r.includes('pg');
            });
        }

        // Filter by language
        const language = document.getElementById('languageFilter').value;
        if (language) {
            anime = anime.filter(a => a.languages.includes(language));
        }

        currentData = { anime, pagination: data.pagination };
        displayAnime(anime);
        updatePagination();

        loading.style.display = 'none';
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Failed to fetch anime. Please try again.';
        console.error(err);
    }
}

function transformAnime(anime) {
    const languages = ['japanese'];
    const englishDubStudios = ['Studio Pierrot', 'Toei Animation', 'White Fox', 'Madhouse', 'ufotable', 'Bones', 'A-1 Pictures', 'MAPPA', 'Wit Studio'];

    if (englishDubStudios.some(s => anime.studios.map(st => st.name).includes(s)) || (anime.score ?? 0) > 7.5) {
        languages.push('english');
    }

    if (HINDI_DUB_ANIME.has(anime.mal_id)) {
        if (!languages.includes('hindi')) languages.push('hindi');
    }

    return {
        id: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english || anime.title,
        image: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
        synopsis: anime.synopsis || 'No synopsis available.',
        score: anime.score || 0,
        episodes: anime.episodes,
        year: anime.year || new Date(anime.aired?.from).getFullYear() || 2020,
        type: anime.type || 'TV',
        status: anime.status || 'Unknown',
        rating: anime.rating || 'PG-13',
        genres: anime.genres.map(g => g.name),
        studios: anime.studios.map(s => s.name),
        languages
    };
}

function displayAnime(anime) {
    const grid = document.getElementById('animeGrid');
    grid.innerHTML = '';

    anime.forEach(item => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="anime-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22280%22/%3E%3C/svg%3E'">
            <div class="anime-info">
                <div class="anime-title">${item.titleEnglish}</div>
                <div class="anime-meta">
                    <span class="anime-score">⭐ ${item.score}</span>
                    <span class="anime-year">${item.year}</span>
                </div>
                <div class="anime-genres">
                    ${item.genres.slice(0, 2).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                </div>
                <div class="anime-rating">${item.rating}</div>
            </div>
        `;
        card.addEventListener('click', () => showModal(item));
        grid.appendChild(card);
    });
}

function showModal(anime) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');

    body.innerHTML = `
        <div class="modal-title">${anime.titleEnglish}</div>
        <div class="modal-meta">
            <div class="modal-meta-item">
                <span class="modal-meta-label">Score</span>
                <span>⭐ ${anime.score}/10</span>
            </div>
            <div class="modal-meta-item">
                <span class="modal-meta-label">Type</span>
                <span>${anime.type}</span>
            </div>
            <div class="modal-meta-item">
                <span class="modal-meta-label">Episodes</span>
                <span>${anime.episodes || 'Unknown'}</span>
            </div>
            <div class="modal-meta-item">
                <span class="modal-meta-label">Year</span>
                <span>${anime.year}</span>
            </div>
            <div class="modal-meta-item">
                <span class="modal-meta-label">Status</span>
                <span>${anime.status}</span>
            </div>
            <div class="modal-meta-item">
                <span class="modal-meta-label">Rating</span>
                <span>${anime.rating}</span>
            </div>
        </div>
        <div><strong>Genres:</strong> ${anime.genres.join(', ')}</div>
        <div style="margin-top: 15px;"><strong>Studios:</strong> ${anime.studios.join(', ')}</div>
        <div style="margin-top: 15px;"><strong>Languages:</strong> ${anime.languages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</div>
        <div class="modal-synopsis" style="margin-top: 20px;">
            <strong>Synopsis:</strong><br>
            ${anime.synopsis}
        </div>
    `;

    modal.style.display = 'block';
}

function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    pageInfo.textContent = `Page ${currentPage} of ${currentData?.pagination?.last_visible_page || 1}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !currentData?.pagination?.has_next_page;
}