const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../../controllers/adminControllers/serviceController');

const serviceValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('basePrice').isNumeric().withMessage('Base Price must be a number'),
  body('gstPercentage').optional().isNumeric().withMessage('GST Percentage must be a number'),
  body('pricingType').optional().isIn(['FIXED', 'HOURLY']).withMessage('Pricing type must be FIXED or HOURLY'),
  body('hourlyRate')
    .if(body('pricingType').equals('HOURLY'))
    .isFloat({ min: 1 })
    .withMessage('Hourly rate is required for hourly services'),
  body('minHours').optional().isInt({ min: 1 }).withMessage('Minimum hours must be at least 1'),
  body('maxHours').optional().isInt({ min: 1 }).withMessage('Maximum hours must be at least 1')
];

router.get('/services', authenticate, isAdmin, getAllServices);
router.get('/services/:id', authenticate, isAdmin, getServiceById);
router.post('/services', authenticate, isAdmin, serviceValidation, createService);
router.put('/services/:id', authenticate, isAdmin, updateService);
router.delete('/services/:id', authenticate, isAdmin, deleteService);

module.exports = router;
