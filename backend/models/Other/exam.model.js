const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  branch: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  duration: { type: Number, required: true }, // duration in minutes
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);