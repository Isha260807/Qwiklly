const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');

const makeTicketNumber = () => `QW-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

const notifyAdminsAboutTicket = async (ticket) => {
  try {
    const Admin = require('../models/Admin');
    const { createNotification } = require('./notificationControllers/notificationController');
    const admins = await Admin.find({ isActive: { $ne: false }, isDeleted: { $ne: true } }).select('_id');

    await Promise.allSettled(admins.map(admin => createNotification({
      adminId: admin._id,
      type: 'support_ticket',
      title: `New support ticket: ${ticket.subject}`,
      message: `${ticket.requesterName} submitted a support request.`,
      relatedId: ticket._id,
      relatedType: 'support_ticket',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject
      },
      pushData: {
        type: 'support_ticket',
        priority: ticket.priority
      },
      priority: ticket.priority
    })));
  } catch (error) {
    console.error('Support ticket admin notification error:', error);
  }
};

const createSupportTicket = async (req, res) => {
  try {
    const { subject, message, bookingId = '', priority = 'normal' } = req.body || {};
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.'
      });
    }

    const user = await User.findById(req.user.id).select('name email phone');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const ticket = await SupportTicket.create({
      ticketNumber: makeTicketNumber(),
      userId: user._id,
      requesterName: user.name,
      requesterEmail: user.email || '',
      requesterPhone: user.phone || '',
      bookingId: String(bookingId || '').trim(),
      subject: subject.trim(),
      message: message.trim(),
      priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal'
    });

    await notifyAdminsAboutTicket(ticket);

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: ticket
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit support ticket.' });
  }
};

const getUserSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Get user support tickets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load support tickets.' });
  }
};

const getAdminSupportTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email phone')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageLimit)
      .limit(pageLimit);

    return res.json({
      success: true,
      data: tickets,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit)
      },
      counts: {
        total: await SupportTicket.countDocuments(),
        open: await SupportTicket.countDocuments({ status: 'open' }),
        inProgress: await SupportTicket.countDocuments({ status: 'in_progress' }),
        resolved: await SupportTicket.countDocuments({ status: 'resolved' })
      }
    });
  } catch (error) {
    console.error('Get admin support tickets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load support tickets.' });
  }
};

const updateSupportTicket = async (req, res) => {
  try {
    const { status, adminResponse } = req.body || {};
    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket status.' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    if (status !== undefined) ticket.status = status;
    if (adminResponse !== undefined) {
      ticket.adminResponse = String(adminResponse).trim();
      ticket.respondedAt = ticket.adminResponse ? new Date() : null;
      ticket.respondedBy = ticket.adminResponse ? req.user.id : null;
    }
    await ticket.save();

    if (ticket.userId && (status !== undefined || adminResponse !== undefined)) {
      try {
        const { createNotification } = require('./notificationControllers/notificationController');
        const updateText = adminResponse !== undefined && ticket.adminResponse
          ? 'Support team replied to your ticket.'
          : `Your support ticket is now ${ticket.status.replace('_', ' ')}.`;
        await createNotification({
          userId: ticket.userId,
          type: 'support_ticket_update',
          title: 'Support ticket updated',
          message: updateText,
          relatedId: ticket._id,
          relatedType: 'support_ticket',
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status
          },
          pushData: { type: 'support_ticket_update' }
        });
      } catch (notificationError) {
        console.error('Support ticket user notification error:', notificationError);
      }
    }

    return res.json({ success: true, message: 'Support ticket updated.', data: ticket });
  } catch (error) {
    console.error('Update support ticket error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update support ticket.' });
  }
};

module.exports = {
  createSupportTicket,
  getUserSupportTickets,
  getAdminSupportTickets,
  updateSupportTicket
};
