const prisma = require('../utils/prisma');

async function listCategories(req, res) {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
}

module.exports = {
  listCategories
};
