const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
  createSupportTicket,
  getUserSupportTickets
} = require('../../controllers/supportTicketController');

router.use(authenticate, isUser);
router.get('/', getUserSupportTickets);
router.post('/', createSupportTicket);

module.exports = router;
