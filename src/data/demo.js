// Shape mirrors the database: a theme, an ordered list of sections, and menu data.
export const cafes = {
  'ember-and-oak': { name: 'Ember & Oak', tagline: 'Small-batch roastery. Slow mornings.', theme: 'roastery', menuLayout: 'list',
    hours: 'Mon–Sun 7am – 10pm', insta: 'https://instagram.com/', review: 'https://google.com/', wifi: 'EmberGuest',
    sections: ['hero', 'special', 'menu', 'hours', 'links'], special: 'Single-origin Chikmagalur pour-over, ₹220 today only',
    menu: [{ cat: 'Brews', items: [{ n: 'Pour-over', p: 22000, d: 'Light roast, clean finish', a: true }, { n: 'Flat white', p: 15000, d: 'Double ristretto', a: true }, { n: 'Cold brew', p: 17000, d: 'Steeped 18 hours', a: false }] },
            { cat: 'Toast', items: [{ n: 'Sourdough & butter', p: 12000, d: 'Cultured butter, sea salt', a: true }] }] },
  'flour-and-fig': { name: 'Flour & Fig', tagline: 'Pastries baked before sunrise', theme: 'bakery', menuLayout: 'cards',
    hours: 'Tue–Sun 8am – 8pm', insta: 'https://instagram.com/', review: 'https://google.com/', wifi: '',
    sections: ['hero', 'menu', 'special', 'links', 'hours'], special: 'Fig & almond tart is back this weekend',
    menu: [{ cat: 'Pastries', items: [{ n: 'Butter croissant', p: 9000, d: 'Laminated 27 layers', a: true }, { n: 'Fig tart', p: 14000, d: 'Almond cream', a: true }, { n: 'Pain au choc', p: 11000, d: 'Dark chocolate', a: false }] }] },
  'kulhad-corner': { name: 'Kulhad Corner', tagline: 'Chai. Maska bun. Repeat.', theme: 'chai', menuLayout: 'board',
    hours: 'Daily 6am – 11pm', insta: 'https://instagram.com/', review: 'https://google.com/', wifi: 'Kulhad_WiFi',
    sections: ['hero', 'menu', 'links', 'hours'], special: '',
    menu: [{ cat: 'Chai', items: [{ n: 'Masala chai', p: 3000, d: 'Kulhad, extra ginger', a: true }, { n: 'Irani chai', p: 4000, d: 'Slow brewed', a: true }] },
           { cat: 'Bites', items: [{ n: 'Maska bun', p: 5000, d: 'Butter, toasted', a: true }] }] },
}
