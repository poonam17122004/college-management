import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiArrowLeft, FiEye, FiEdit, FiTrash2, FiCheck } from 'react-icons/fi';
import Heading from '../../components/Heading';
import { baseApiURL } from '../../baseUrl';

const OnlineExam = () => {
  // Current view management
  const [view, setView] = useState('list'); // list, create, view, edit, evaluate
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // Faculty data from Redux store
  const userData = useSelector((state) => state.userData);
  
  // Exams list state
  const [exams, setExams] = useState([]);
  
  // Form data states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    startDate: '',
    endDate: '',
    duration: 60, // default 60 minutes
    branch: '',
    semester: '',
    subject: '',
    totalMarks: 0,
    passingMarks: 0,
    questions: []
  });
  
  // Question states
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1
  });
  
  // UI states
  const [branch, setBranch] = useState([]);
  const [subject, setSubject] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [evaluationData, setEvaluationData] = useState(null);
  
  // Load faculty's exams
  useEffect(() => {
    if (view === 'list') {
      fetchExams();
    }
  }, [view]);
  
  // Load branch and subject data
  useEffect(() => {
    getBranchData();
    getSubjectData();
  }, []);
  
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const response = await axios.get(
        `${baseApiURL()}/online-exam/faculty?facultyId=${userData.employeeId}`
      );
      
      if (response.data.success) {
        setExams(response.data.exams);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to fetch exams');
    } finally {
      setLoadingExams(false);
    }
  };
  
  const getBranchData = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      const response = await axios.get(`${baseApiURL()}/branch/getBranch`, { headers });
      
      if (response.data.success) {
        setBranch(response.data.branches);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };
  
  const getSubjectData = async () => {
    try {
      const response = await axios.get(`${baseApiURL()}/subject/getSubject`);
      
      if (response.data.success) {
        setSubject(response.data.subject);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };
  
  const handleCreateExam = async (e) => {
    e.preventDefault();
    
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question.');
      return;
    }
    
    // Calculate total marks
    const totalMarksCalculated = formData.questions.reduce((sum, q) => sum + q.marks, 0);
    
    // Check if calculated marks match the form data
    if (totalMarksCalculated !== parseInt(formData.totalMarks)) {
      setFormData({
        ...formData,
        totalMarks: totalMarksCalculated
      });
      toast('Total marks updated to match sum of question marks', {
        icon: '⚠️'
      });
      return;
    }
    
    // Validate passing marks
    if (parseInt(formData.passingMarks) > parseInt(formData.totalMarks)) {
      toast.error('Passing marks cannot be greater than total marks');
      return;
    }
    
    toast.loading('Creating exam...');
    
    try {
      const response = await axios.post(`${baseApiURL()}/online-exam/create`, {
        ...formData,
        facultyId: userData.employeeId
      });
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Exam created successfully!');
        resetForm();
        setView('list');
        fetchExams();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error creating exam:', error);
      toast.error(error.response?.data?.message || 'Failed to create exam');
    }
  };
  
  const handleAddQuestion = () => {
    // Validate question
    if (!questionForm.question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    
    // Validate marks
    if (!questionForm.marks || questionForm.marks < 1) {
      toast.error('Marks must be at least 1');
      return;
    }
    
    // Validate based on question type
    if (questionForm.type === 'mcq') {
      // Check that all options are filled
      if (questionForm.options.some(opt => !opt.trim())) {
        toast.error('Please fill all options');
        return;
      }
      
      // Check that correct answer is one of the options
      if (!questionForm.options.includes(questionForm.correctAnswer)) {
        toast.error('Correct answer must be one of the options');
        return;
      }
    } else if (['oneWord', 'fillBlank'].includes(questionForm.type)) {
      if (!questionForm.correctAnswer.trim()) {
        toast.error('Please provide the correct answer');
        return;
      }
    }
    
    // Update form data with the new question
    const updatedQuestions = [...formData.questions, questionForm];
    const updatedTotalMarks = formData.questions.reduce(
      (sum, q) => sum + q.marks, 0
    ) + questionForm.marks;
    
    setFormData({
      ...formData,
      questions: updatedQuestions,
      totalMarks: updatedTotalMarks
    });
    
    // Reset question form for next question
    setQuestionForm({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1
    });
    
    toast.success('Question added');
  };
  
  const handleRemoveQuestion = (index) => {
    const updatedQuestions = [...formData.questions];
    const removedMarks = updatedQuestions[index].marks;
    updatedQuestions.splice(index, 1);
    
    setFormData({
      ...formData,
      questions: updatedQuestions,
      totalMarks: formData.totalMarks - removedMarks
    });
    
    toast('Question removed', {
      icon: '🗑️'
    });
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      instructions: '',
      startDate: '',
      endDate: '',
      duration: 60,
      branch: '',
      semester: '',
      subject: '',
      totalMarks: 0,
      passingMarks: 0,
      questions: []
    });
    
    setQuestionForm({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1
    });
  };
  
  const handleViewExam = async (examId) => {
    try {
      toast.loading('Loading exam details...');
      
      const response = await axios.get(`${baseApiURL()}/online-exam/${examId}`);
      
      toast.dismiss();
      
      if (response.data.success) {
        setSelectedExam(response.data.exam);
        setView('view');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error fetching exam details:', error);
      toast.error('Failed to load exam details');
    }
  };
  
  const handlePublishExam = async (examId) => {
    try {
      toast.loading('Publishing exam...');
      
      const response = await axios.put(`${baseApiURL()}/online-exam/${examId}/publish`);
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Exam published successfully!');
        fetchExams();
        if (view === 'view' && selectedExam) {
          setSelectedExam(response.data.exam);
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error publishing exam:', error);
      toast.error('Failed to publish exam');
    }
  };
  
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }
    
    try {
      toast.loading('Deleting exam...');
      
      const response = await axios.delete(`${baseApiURL()}/online-exam/${examId}`);
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Exam deleted successfully!');
        fetchExams();
        if (view === 'view' && selectedExam && selectedExam._id === examId) {
          setView('list');
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error deleting exam:', error);
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    }
  };
  
  const fetchSubmissions = async (examId) => {
    setLoadingSubmissions(true);
    try {
      const response = await axios.get(`${baseApiURL()}/online-exam/${examId}/submissions`);
      
      if (response.data.success) {
        setSubmissions(response.data.submissions);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };
  
  const handleViewSubmissions = (examId) => {
    setSelectedExam({ _id: examId });
    fetchSubmissions(examId);
    setView('submissions');
  };
  
  const handleEvaluateSubmission = async (examId, submissionId) => {
    try {
      toast.loading('Loading submission...');
      
      const response = await axios.get(
        `${baseApiURL()}/online-exam/${examId}/submissions/${submissionId}`
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        setEvaluationData(response.data);
        setSelectedSubmission(submissionId);
        setView('evaluate');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error loading submission:', error);
      toast.error('Failed to load submission for evaluation');
    }
  };
  
  const handleSubmitEvaluation = async () => {
    if (!selectedExam || !selectedSubmission || !evaluationData) return;
    
    // Filter questions that need evaluation (short/long answers)
    const evaluations = evaluationData.questionsWithAnswers
      .filter(q => q.needsEvaluation && q.studentAnswer)
      .map(q => ({
        questionId: q.questionId,
        marks: q.awardedMarks
      }));
    
    if (evaluations.length === 0) {
      toast.success('No answers require evaluation');
      return;
    }
    
    try {
      toast.loading('Submitting evaluation...');
      
      const response = await axios.post(
        `${baseApiURL()}/online-exam/${selectedExam._id}/submissions/${selectedSubmission}/evaluate`,
        {
          evaluations,
          facultyId: userData.employeeId
        }
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Evaluation submitted successfully!');
        setView('submissions');
        fetchSubmissions(selectedExam._id);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    }
  };
  
  const updateEvaluationMarks = (questionId, marks) => {
    if (!evaluationData) return;
    
    const updatedQuestions = evaluationData.questionsWithAnswers.map(q => 
      q.questionId === questionId ? { ...q, awardedMarks: Number(marks) } : q
    );
    
    setEvaluationData({
      ...evaluationData,
      questionsWithAnswers: updatedQuestions
    });
  };

  // Date formatter
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Render different views based on state
  return (
    <div className="w-full flex justify-center items-start flex-col mx-auto">
      <Heading title="Online Exams" />
      
      {/* View Selector */}
      {view === 'list' && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium">My Exams</h2>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
              onClick={() => setView('create')}
            >
              <FiPlus className="mr-2" /> Create New Exam
            </button>
          </div>
          
          {loadingExams ? (
            <p className="text-center py-10">Loading exams...</p>
          ) : exams.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-md">
              <p className="text-gray-500 mb-4">You haven't created any exams yet.</p>
              <button 
                className="bg-blue-500 text-white px-4 py-2 rounded-md inline-flex items-center"
                onClick={() => setView('create')}
              >
                <FiPlus className="mr-2" /> Create Your First Exam
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left">Exam Name</th>
                    <th className="py-3 px-4 text-left">Subject</th>
                    <th className="py-3 px-4 text-left">Branch</th>
                    <th className="py-3 px-4 text-left">Semester</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam._id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{exam.name}</td>
                      <td className="py-3 px-4">{exam.subject}</td>
                      <td className="py-3 px-4">{exam.branch}</td>
                      <td className="py-3 px-4">{exam.semester}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          exam.status === 'draft' 
                            ? 'bg-gray-200 text-gray-800' 
                            : exam.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : exam.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => handleViewExam(exam._id)}
                            title="View Exam"
                          >
                            <FiEye />
                          </button>
                          {exam.status === 'draft' && (
                            <button 
                              className="text-purple-500 hover:text-purple-700"
                              onClick={() => handlePublishExam(exam._id)}
                              title="Publish Exam"
                            >
                              <FiCheck />
                            </button>
                          )}
                          {exam.status !== 'draft' && (
                            <button 
                              className="text-green-500 hover:text-green-700"
                              onClick={() => handleViewSubmissions(exam._id)}
                              title="View Submissions"
                            >
                              <FiEdit />
                            </button>
                          )}
                          {exam.status === 'draft' && (
                            <button 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteExam(exam._id)}
                              title="Delete Exam"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Create Exam Form */}
      {view === 'create' && (
        <div className="w-full">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                if (window.confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
                  resetForm();
                  setView('list');
                }
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Exams
            </button>
            <h2 className="text-xl font-medium">Create New Exam</h2>
          </div>
          
          <form onSubmit={handleCreateExam}>
            <div className="bg-white p-6 rounded-md shadow-sm mb-6">
              <h3 className="text-lg font-medium mb-4">Exam Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title*</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. Midterm Exam"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject*</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {subject.map((sub) => (
                      <option key={sub._id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch*</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    required
                  >
                    <option value="">-- Select Branch --</option>
                    {branch.map((b) => (
                      <option key={b._id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester*</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    required
                  >
                    <option value="">-- Select Semester --</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time*</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time*</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)*</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 60"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks*</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 40"
                    value={formData.passingMarks}
                    onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Brief description of this exam"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                ></textarea>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Instructions for students taking this exam"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            {/* Questions Section */}
            <div className="bg-white p-6 rounded-md shadow-sm mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Questions</h3>
                <span className="text-sm text-gray-600">
                  Total Marks: {formData.totalMarks}
                </span>
              </div>
              
              {formData.questions.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500 mb-2">No questions added yet.</p>
                  <p className="text-sm text-gray-400">Use the form below to add questions.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {formData.questions.map((q, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 relative">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <FiX />
                      </button>
                      
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{index + 1}. {q.question}</div>
                        <div className="text-sm bg-blue-100 text-blue-800 px-2 rounded-full ml-2">
                          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-1 capitalize">
                        Type: {q.type.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      
                      {q.type === 'mcq' && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`text-sm p-1 px-3 rounded ${
                              opt === q.correctAnswer 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-gray-50'
                            }`}>
                              {String.fromCharCode(97 + i)}. {opt}
                              {opt === q.correctAnswer && (
                                <span className="ml-2 text-green-500">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {['oneWord', 'fillBlank'].includes(q.type) && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Answer:</span> {q.correctAnswer}
                        </div>
                      )}
                      
                      {['shortAnswer', 'longAnswer'].includes(q.type) && (
                        <div className="mt-2 text-sm italic text-gray-500">
                          This question requires manual evaluation after submission.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Question Form */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium mb-4">Add New Question</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={questionForm.type}
                      onChange={(e) => {
                        setQuestionForm({ 
                          ...questionForm,
                          type: e.target.value,
                          options: e.target.value === 'mcq' ? ['', '', '', ''] : []
                        });
                      }}
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="oneWord">One Word Answer</option>
                      <option value="fillBlank">Fill in the Blanks</option>
                      <option value="shortAnswer">Short Answer</option>
                      <option value="longAnswer">Long Answer</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={questionForm.marks}
                      onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter the question text"
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                    rows="2"
                  ></textarea>
                </div>
                
                {questionForm.type === 'mcq' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                    <div className="space-y-2">
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-6 text-center">{String.fromCharCode(97 + index)}.</div>
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index] = e.target.value;
                              setQuestionForm({ ...questionForm, options: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                          <div className="ml-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={questionForm.correctAnswer === option}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: option })}
                              className="mr-1"
                            />
                            Correct
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {['oneWord', 'fillBlank'].includes(questionForm.type) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter the correct answer"
                      value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    />
                  </div>
                )}
                
                {['shortAnswer', 'longAnswer'].includes(questionForm.type) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                    This question type will require manual evaluation after students submit their answers.
                  </div>
                )}
                
                <button
                  type="button"
                  className="bg-green-500 text-white px-4 py-2 rounded-md"
                  onClick={handleAddQuestion}
                >
                  Add Question
                </button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                className="border border-gray-300 px-6 py-2 rounded-md text-gray-600"
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
                    resetForm();
                    setView('list');
                  }
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded-md"
              >
                Create Exam
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* View Exam Detail */}
      {view === 'view' && selectedExam && (
        <div className="w-full">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                setSelectedExam(null);
                setView('list');
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Exams
            </button>
            <h2 className="text-xl font-medium">Exam Details</h2>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">{selectedExam.name}</h3>
                <p className="text-sm text-gray-500">{selectedExam.subject} | {selectedExam.branch} | Semester {selectedExam.semester}</p>
              </div>
              
              <div className="flex space-x-2">
                {selectedExam.status === 'draft' && (
                  <>
                    <button 
                      className="bg-green-500 text-white px-3 py-1 rounded-md text-sm"
                      onClick={() => handlePublishExam(selectedExam._id)}
                    >
                      Publish
                    </button>
                    <button 
                      className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
                      onClick={() => handleDeleteExam(selectedExam._id)}
                    >
                      Delete
                    </button>
                  </>
                )}
                
                {selectedExam.status !== 'draft' && (
                  <button 
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                    onClick={() => handleViewSubmissions(selectedExam._id)}
                  >
                    View Submissions
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border-r border-gray-200 pr-4">
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedExam.status.charAt(0).toUpperCase() + selectedExam.status.slice(1)}</p>
                <p className="text-sm"><span className="font-medium">Start Date:</span> {formatDate(selectedExam.startDate)}</p>
                <p className="text-sm"><span className="font-medium">End Date:</span> {formatDate(selectedExam.endDate)}</p>
                <p className="text-sm"><span className="font-medium">Duration:</span> {selectedExam.duration} minutes</p>
              </div>
              
              <div>
                <p className="text-sm"><span className="font-medium">Total Marks:</span> {selectedExam.totalMarks}</p>
                <p className="text-sm"><span className="font-medium">Passing Marks:</span> {selectedExam.passingMarks}</p>
                <p className="text-sm"><span className="font-medium">Total Questions:</span> {selectedExam.questions?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Submissions:</span> {selectedExam.submissions?.length || 0}</p>
              </div>
            </div>
            
            {selectedExam.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{selectedExam.description}</p>
              </div>
            )}
            
            {selectedExam.instructions && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Instructions</h4>
                <p className="text-sm bg-gray-50 p-3 rounded whitespace-pre-line">{selectedExam.instructions}</p>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm">
            <h3 className="text-md font-medium mb-4">Questions ({selectedExam.questions?.length || 0})</h3>
            
            <div className="space-y-4">
              {selectedExam.questions?.map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div className="font-medium">{index + 1}. {q.question}</div>
                    <div className="text-sm bg-blue-100 text-blue-800 px-2 rounded-full ml-2">
                      {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-1 capitalize">
                    Type: {q.type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  
                  {q.type === 'mcq' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-1 px-3 rounded ${
                          opt === q.correctAnswer 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50'
                        }`}>
                          {String.fromCharCode(97 + i)}. {opt}
                          {opt === q.correctAnswer && (
                            <span className="ml-2 text-green-500">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {['oneWord', 'fillBlank'].includes(q.type) && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Answer:</span> {q.correctAnswer}
                    </div>
                  )}
                  
                  {['shortAnswer', 'longAnswer'].includes(q.type) && (
                    <div className="mt-2 text-sm italic text-gray-500">
                      This question requires manual evaluation after submission.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* View Submissions */}
      {view === 'submissions' && selectedExam && (
        <div className="w-full">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                setSelectedExam(null);
                setSubmissions([]);
                setView('list');
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Exams
            </button>
            <h2 className="text-xl font-medium">Exam Submissions</h2>
          </div>
          
          {loadingSubmissions ? (
            <p className="text-center py-10">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-md">
              <p className="text-gray-500">No submissions found for this exam yet.</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-md shadow-sm">
              <h3 className="text-md font-medium mb-4">
                {submissions.length} {submissions.length === 1 ? 'Submission' : 'Submissions'}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-3 px-4 text-left">Student</th>
                      <th className="py-3 px-4 text-left">Submitted On</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Marks</th>
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.submissionId} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{submission.studentId}</div>
                          <div className="text-sm text-gray-500">{submission.studentName}</div>
                        </td>
                        <td className="py-3 px-4">
                          {submission.submitTime 
                            ? formatDate(submission.submitTime)
                            : <span className="text-sm text-yellow-600">In Progress</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'in-progress' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : submission.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : submission.status === 'evaluated'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {submission.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {submission.submitTime ? (
                            `${submission.totalMarks || 0} / ${selectedExam.totalMarks}`
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {submission.status !== 'in-progress' && (
                            <button 
                              className="text-blue-500 hover:text-blue-700"
                              onClick={() => handleEvaluateSubmission(selectedExam._id, submission.submissionId)}
                              title={submission.status === 'evaluated' ? 'View Submission' : 'Evaluate Submission'}
                            >
                              <FiEye />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Evaluate Submission */}
      {view === 'evaluate' && evaluationData && (
        <div className="w-full">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                setEvaluationData(null);
                setSelectedSubmission(null);
                setView('submissions');
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Submissions
            </button>
            <h2 className="text-xl font-medium">
              {evaluationData.submissionInfo.status === 'evaluated' 
                ? 'View Submission' 
                : 'Evaluate Submission'}
            </h2>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 mb-4">
              <div>
                <h3 className="text-md font-medium">{evaluationData.examName}</h3>
                <p className="text-sm text-gray-500">
                  Student: {evaluationData.studentInfo.name} ({evaluationData.studentInfo.id})
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <span className="font-medium">Current Score:</span> {evaluationData.submissionInfo.currentMarks} / {evaluationData.submissionInfo.maxMarks}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Submitted:</span> {evaluationData.submissionInfo.submitTime ? formatDate(evaluationData.submissionInfo.submitTime) : 'In Progress'}
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-8">
              {evaluationData.questionsWithAnswers.map((qa, index) => (
                <div key={qa.questionId} className="border-b border-gray-200 pb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">Question {index + 1}: {qa.question}</div>
                    <div className="text-sm bg-blue-100 text-blue-800 px-2 rounded-full">
                      {qa.maxMarks} {qa.maxMarks === 1 ? 'mark' : 'marks'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3 capitalize">
                    Type: {qa.type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  
                  {/* Show correct answer for auto-graded questions */}
                  {['mcq', 'oneWord', 'fillBlank'].includes(qa.type) && (
                    <div className="text-sm mb-2 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Correct Answer:</span> {qa.correctAnswer}
                    </div>
                  )}
                  
                  {/* Show options for MCQs */}
                  {qa.type === 'mcq' && qa.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {qa.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-1 px-3 rounded ${
                          opt === qa.correctAnswer 
                            ? 'bg-green-50 border border-green-200' 
                            : opt === qa.studentAnswer
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-gray-50'
                        }`}>
                          {String.fromCharCode(97 + i)}. {opt}
                          {opt === qa.correctAnswer && (
                            <span className="ml-2 text-green-500">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Student's answer */}
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Student's Answer:</p>
                    {qa.studentAnswer ? (
                      <div className={`text-sm p-3 rounded ${
                        ['mcq', 'oneWord', 'fillBlank'].includes(qa.type)
                          ? qa.isCorrect
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                        {qa.studentAnswer}
                      </div>
                    ) : (
                      <p className="text-sm italic text-gray-500">No answer provided</p>
                    )}
                  </div>
                  
                  {/* Evaluation section for subjective questions */}
                  {qa.needsEvaluation && qa.studentAnswer && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium">Marks for this answer:</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md mr-1 text-center"
                            min="0"
                            max={qa.maxMarks}
                            value={qa.awardedMarks}
                            onChange={(e) => updateEvaluationMarks(qa.questionId, e.target.value)}
                            disabled={evaluationData.submissionInfo.status === 'evaluated'}
                          />
                          <span className="text-sm text-gray-500">/ {qa.maxMarks}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {evaluationData.submissionInfo.status !== 'evaluated' && (
              <div className="mt-6 flex justify-end">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-md"
                  onClick={handleSubmitEvaluation}
                >
                  Submit Evaluation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineExam;