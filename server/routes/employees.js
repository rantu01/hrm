const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/employees
// @desc    List all employees with pagination
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object from query params
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter)
      .populate('user', 'name email avatar status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Employee.countDocuments(filter);

    res.status(200).json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error fetching employees' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      'user',
      'name email avatar status type'
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).json({ message: 'Server error fetching employee' });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('phone').optional().trim(),
    body('designation').optional().trim(),
    body('department').optional().trim(),
    body('branch').optional().trim(),
    body('salary').optional().isNumeric().withMessage('Salary must be a number'),
    body('joinDate').optional().isISO8601().withMessage('Join date must be a valid date'),
    body('status').optional().isIn(['active', 'inactive', 'terminated', 'on-leave']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Check if employee already exists
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee already exists with this email' });
      }

      const employee = await Employee.create(req.body);

      res.status(201).json({
        message: 'Employee created successfully',
        employee,
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ message: 'Server error creating employee' });
    }
  }
);

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put(
  '/:id',
  [
    body('name').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('designation').optional().trim(),
    body('department').optional().trim(),
    body('branch').optional().trim(),
    body('salary').optional().isNumeric().withMessage('Salary must be a number'),
    body('joinDate').optional().isISO8601(),
    body('status').optional().isIn(['active', 'inactive', 'terminated', 'on-leave']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      res.status(200).json({
        message: 'Employee updated successfully',
        employee,
      });
    } catch (error) {
      console.error('Update employee error:', error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Employee not found' });
      }
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      res.status(500).json({ message: 'Server error updating employee' });
    }
  }
);

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).json({ message: 'Server error deleting employee' });
  }
});

module.exports = router;
