const { cors } = require('./_lib/helpers');

module.exports = (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.json({ ok: true });
};
