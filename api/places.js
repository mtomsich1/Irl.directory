const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const CATEGORY_TYPES = {
  outdoors:  ['park', 'natural_feature', 'campground', 'rv_park', 'marina'],
  arts:      ['art_gallery', 'museum', 'painter', 'ceramic_store'],
  sports:    ['gym', 'stadium', 'bowling_alley', 'rock_climbing', 'tennis_court', 'swimming_pool', 'golf_course'],
  social:    ['bowling_alley', 'amusement_park', 'escape_room', 'movie_theater', 'night_club', 'bar'],
  volunteer: ['church', 'local_government_office', 'food_bank'],
  food:      ['bakery', 'cooking_school', 'meal_kit'],
  learning:  ['library', 'university', 'school', 'book_store'],
  wellness:  ['spa', 'yoga', 'health', 'gym'],
};

// Problem icons:
// 🎮 gaming-detox
// 📱 social-reset
// 📰 doom-detox
// 🧠 brain-recharge
// 👍 identity-reset
// 🪑 body-wakeup
// 👦 kid-reset

function getProblemTags(types, category) {
  const tags = new Set();
  const t = types || [];
  const c = category || '';

  // Outdoors / nature → brain recharge, body wakeup, kid reset, doom detox
  if (c === 'outdoors' || t.some(x => ['park','natural_feature','campground','hiking_area','forest','nature_reserve'].includes(x))) {
    tags.add('🧠'); tags.add('🪑'); tags.add('👦'); tags.add('📰');
  }

  // Sports / physical → gaming detox, body wakeup, kid reset
  if (c === 'sports' || t.some(x => ['gym','stadium','bowling_alley','rock_climbing','tennis_court','swimming_pool','golf_course','sports_club','fitness_center'].includes(x))) {
    tags.add('🎮'); tags.add('🪑'); tags.add('👦');
  }

  // Arts / crafts / creative → social reset, identity reset
  if (c === 'arts' || t.some(x => ['art_gallery','museum','painter','ceramic_store','art_studio'].includes(x))) {
    tags.add('📱'); tags.add('👍');
  }

  // Social / games / performance → social reset, identity reset, gaming detox
  if (c === 'social' || t.some(x => ['bowling_alley','amusement_park','escape_room','night_club','bar','comedy_club'].includes(x))) {
    tags.add('📱'); tags.add('👍'); tags.add('🎮');
  }

  // Volunteer / community → doom detox
  if (c === 'volunteer' || t.some(x => ['food_bank','local_government_office','community_center','place_of_worship'].includes(x))) {
    tags.add('📰'); tags.add('🪑');
  }

  // Food / cooking → social reset, body wakeup
  if (c === 'food' || t.some(x => ['bakery','cooking_school','meal_kit','restaurant'].includes(x))) {
    tags.add('📱'); tags.add('🪑');
  }

  // Learning / library → brain recharge, doom detox
  if (c === 'learning' || t.some(x => ['library','university','school','book_store'].includes(x))) {
    tags.add('🧠'); tags.add('📰');
  }

  // Wellness / yoga / spa → brain recharge, social reset, body wakeup
  if (c === 'wellness' || t.some(x => ['spa','yoga','health','meditation_center'].includes(x))) {
    tags.add('🧠'); tags.add('📱'); tags.add('🪑');
  }

  return Array.from(tags);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { action, address, latlng, lat, lng, category = 'outdoors', radius = 10000 } = req.query;

  // ── GEOCODE
  if (action === 'geocode') {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      if (address) url.searchParams.set('address', address);
      if (latlng)  url.searchParams.set('latlng', latlng);
      url.searchParams.set('key', GOOGLE_API_KEY);
      const response = await fetch(url.toString());
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Geocoding failed' });
    }
  }

  // ── PLACES
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const searchKeyword = getCategoryKeyword(category);
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radius);
    url.searchParams.set('keyword', searchKeyword);
    url.searchParams.set('key', GOOGLE_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(500).json({ error: data.status, message: data.error_message });
    }

    const places = (data.results || []).slice(0, 12).map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      problemTags: getProblemTags(place.types, category),
      photo: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
        : null,
      openNow: place.opening_hours?.open_now,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
      priceLevel: place.price_level,
    }));

    res.status(200).json({ places, category, location: { lat, lng } });

  } catch (err) {
    console.error('Places API error:', err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}

function getCategoryKeyword(category) {
  const keywords = {
    outdoors:  'park hiking nature trail outdoor',
    arts:      'art studio pottery painting ceramics craft class',
    sports:    'rec center gym sports climbing tennis pickleball',
    social:    'board game cafe escape room bowling arcade',
    volunteer: 'volunteer community service food bank habitat',
    food:      'cooking class bakery culinary workshop',
    learning:  'library museum workshop class lecture',
    wellness:  'yoga meditation wellness spa mindfulness',
  };
  return keywords[category] || 'recreation';
}
