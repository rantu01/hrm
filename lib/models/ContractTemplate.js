import mongoose from 'mongoose';

const contractTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    contract_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContractType',
      required: [true, 'Contract type is required'],
    },
    template_content: {
      type: String,
      required: [true, 'Template content is required'],
    },
    variables: {
      type: [String],
      default: [],
    },
    clauses: {
      type: [String],
      default: [],
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ContractTemplate || mongoose.model('ContractTemplate', contractTemplateSchema);