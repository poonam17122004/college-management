const mongoose = require('mongoose');

// Schema for different types of questions
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'oneWord', 'fillBlank', 'shortAnswer', 'longAnswer'],
    required: true
  },
  question: { 
    type: String,
    required: true 
  },
  options: {
    type: [String],  // For MCQ questions
    default: []
  },
  correctAnswer: {
    type: String,     // For MCQ, oneWord, fillBlank questions
    required: function() {
      return ['mcq', 'oneWord', 'fillBlank'].includes(this.type);
    }
  },
  marks: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: true });

// Schema for student answers to questions
const studentAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marks: {
    type: Number,
    default: 0
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  evaluatedAt: {
    type: Date
  }
});

// Schema for student submissions
const studentSubmissionSchema = new mongoose.Schema({
  studentId: {
    type: Number,  // Enrollment number
    required: true
  },
  answers: [studentAnswerSchema],
  startTime: {
    type: Date,
    default: Date.now
  },
  submitTime: {
    type: Date
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'evaluated', 'partial-evaluated'],
    default: 'in-progress'
  }
});

// Main online exam schema
const onlineExamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: {
    type: String
  },
  instructions: {
    type: String
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true 
  }, // duration in minutes
  branch: { 
    type: String, 
    required: true 
  },
  semester: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  questions: [questionSchema],
  submissions: [studentSubmissionSchema],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Faculty Detail', 
    required: true 
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed'],
    default: 'draft'
  }
}, { timestamps: true });

module.exports = mongoose.model('OnlineExam', onlineExamSchema);