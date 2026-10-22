const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAdminSupportTickets,
  updateSupportTicket
} = require('../../controllers/supportTicketController');

router.use(authenticate, isAdmin);
router.get('/', getAdminSupportTickets);
router.patch('/:id', updateSupportTicket);

module.exports = router;
