const prisma = require('./_lib/prisma');
const { cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username dan password wajib diisi' });

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { branch: true }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    // Return user info (tanpa password)
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || null
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
