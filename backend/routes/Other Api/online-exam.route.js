const express = require('express');
const router = express.Router();
const {
  createExam,
  getFacultyExams,
  getExamById,
  updateExam,
  deleteExam,
  publishExam,
  getStudentExams,
  startExam,
  saveAnswer,
  submitExam,
  getExamSubmissions,
  getSubmissionForEvaluation,
  evaluateSubmission,
  getStudentResult
} = require('../../controllers/Other/online-exam.controller');

// Faculty routes
router.post('/create', createExam);
router.get('/faculty', getFacultyExams);
router.get('/:id', getExamById);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.put('/:id/publish', publishExam);
router.get('/:id/submissions', getExamSubmissions);
router.get('/:examId/submissions/:submissionId', getSubmissionForEvaluation);
router.post('/:examId/submissions/:submissionId/evaluate', evaluateSubmission);

// Student routes
router.get('/student/available', getStudentExams);
router.post('/:examId/start', startExam);
router.post('/:examId/saveAnswer', saveAnswer);
router.post('/:examId/submit', submitExam);
router.get('/:examId/result', getStudentResult);

module.exports = router;