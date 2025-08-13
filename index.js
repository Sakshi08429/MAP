const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


app.get('/', (req, res) => {
  res.render('index');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


app.get('/api/countries', async (req, res) => {
  try {
    const response = await axios.get('https://countriesnow.space/api/v0.1/countries/positions');
   
    const countries = response.data.data.map(c => c.name).sort();
    res.json({ countries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});


app.post('/api/states', async (req, res) => {
  const { country } = req.body;
  if (!country) return res.status(400).json({ error: 'Country required' });

  try {
    const response = await axios.post('https://countriesnow.space/api/v0.1/countries/states', { country });
    const states = response.data.data.states.map(s => s.name).sort();
    res.json({ states });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});


app.post('/api/cities', async (req, res) => {
  const { country, state } = req.body;
  if (!country || !state) return res.status(400).json({ error: 'Country and state required' });

  try {
    const response = await axios.post('https://countriesnow.space/api/v0.1/countries/state/cities', { country, state });
    const cities = response.data.data.sort();
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});
