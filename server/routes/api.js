const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const categoriesController = require('../controllers/categories.controller');
const productsController = require('../controllers/products.controller');
const transactionsController = require('../controllers/transactions.controller');
const cashController = require('../controllers/cash.controller');

const router = express.Router();

router.get('/health', (_, res) => res.json({ ok: true }));
router.get('/categories', asyncHandler(categoriesController.listCategories));
router.get('/products', asyncHandler(productsController.listProducts));
router.get('/products/low-stock', asyncHandler(productsController.listLowStockProducts));
router.get('/products/barcode/:barcode', asyncHandler(productsController.getProductByBarcode));
router.post('/products', asyncHandler(productsController.createProduct));
router.put('/products/:id', asyncHandler(productsController.updateProduct));
router.delete('/products/:id', asyncHandler(productsController.deleteProduct));
router.post('/transactions/checkout', asyncHandler(transactionsController.checkout));
router.get('/transactions', asyncHandler(transactionsController.listTransactions));
router.post('/cash/in', asyncHandler(cashController.createCashIn));
router.post('/cash/out', asyncHandler(cashController.createCashOut));
router.post('/cash/refund', asyncHandler(cashController.refundCash));
router.post('/cash/deposit', asyncHandler(cashController.depositCash));
router.get('/cash/logs', asyncHandler(cashController.listCashLogs));
router.get('/cash/summary', asyncHandler(cashController.cashSummary));
router.post('/cash/reset', asyncHandler(cashController.resetCashLogs));

module.exports = router;
