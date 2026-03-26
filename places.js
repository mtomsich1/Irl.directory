const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// IRL-relevant place types mapped to our categories
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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, category = 'outdoors', radius = 10000, keyword } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const types = CATEGORY_TYPES[category] || CATEGORY_TYPES.outdoors;
    const results = [];

    // Search with keyword or type
    const searchKeyword = keyword || getCategoryKeyword(category);
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
      photo: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
        : null,
      openNow: place.opening_hours?.open_now,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
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
