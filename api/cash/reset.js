const prisma = require('../_lib/prisma');
const { cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await prisma.cashLog.deleteMany();
    res.json({ success: true, message: 'Semua catatan buku kas telah di-reset.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
