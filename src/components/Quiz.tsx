import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Award, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle, 
  Percent, 
  Check, 
  X, 
  Clock, 
  Home, 
  ArrowRight,
  Info
} from 'lucide-react';
import questionsData from '../data/questions.json';

interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
  explanation: string;
}

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function Quiz() {
  const [mounted, setMounted] = useState(false);
  const [questions] = useState<Question[]>(questionsData as Question[]);
  
  // Navigation Mode: 'menu' | 'study' | 'exam'
  const [mode, setMode] = useState<'menu' | 'study' | 'exam'>('menu');

  // ==========================================
  // STUDY MODE STATE
  // ==========================================
  const [remainingIds, setRemainingIds] = useState<number[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ==========================================
  // EXAM MODE STATE
  // ==========================================
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<{ [id: number]: string }>({});
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [examTimeLeft, setExamTimeLeft] = useState<number>(7200); // 120 minutes in seconds
  const [examCurrentIndex, setExamCurrentIndex] = useState<number>(0);
  const [examCompleted, setExamCompleted] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    
    const savedMode = localStorage.getItem('fiszki_mode') as 'menu' | 'study' | 'exam' | null;
    
    if (savedMode === 'study') {
      const savedRemaining = localStorage.getItem('fiszki_remaining');
      const savedCurrent = localStorage.getItem('fiszki_current_id');
      const savedSelected = localStorage.getItem('fiszki_selected_answer');
      const savedCorrect = localStorage.getItem('fiszki_correct_count');
      const savedWrong = localStorage.getItem('fiszki_wrong_count');

      if (savedRemaining && savedCurrent) {
        setRemainingIds(JSON.parse(savedRemaining));
        setCurrentId(Number(savedCurrent));
        setSelectedAnswer(savedSelected ? JSON.parse(savedSelected) : null);
        setCorrectCount(Number(savedCorrect) || 0);
        setWrongCount(Number(savedWrong) || 0);
        setMode('study');
      }
    } else if (savedMode === 'exam') {
      const savedExamQuestions = localStorage.getItem('fiszki_exam_questions');
      const savedExamAnswers = localStorage.getItem('fiszki_exam_answers');
      const savedExamStartTime = localStorage.getItem('fiszki_exam_start_time');
      const savedExamCurrentIndex = localStorage.getItem('fiszki_exam_current_index');
      const savedExamCompleted = localStorage.getItem('fiszki_exam_completed');

      if (savedExamQuestions && savedExamStartTime) {
        setExamQuestions(JSON.parse(savedExamQuestions));
        setExamAnswers(savedExamAnswers ? JSON.parse(savedExamAnswers) : {});
        setExamStartTime(Number(savedExamStartTime));
        setExamCurrentIndex(Number(savedExamCurrentIndex) || 0);
        setExamCompleted(savedExamCompleted === 'true');
        setMode('exam');
      }
    }
  }, []);

  // Save states to localStorage on changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('fiszki_mode', mode);
    
    if (mode === 'study') {
      localStorage.setItem('fiszki_remaining', JSON.stringify(remainingIds));
      localStorage.setItem('fiszki_current_id', currentId !== null ? String(currentId) : '');
      localStorage.setItem('fiszki_selected_answer', JSON.stringify(selectedAnswer));
      localStorage.setItem('fiszki_correct_count', String(correctCount));
      localStorage.setItem('fiszki_wrong_count', String(wrongCount));
    } else if (mode === 'exam') {
      localStorage.setItem('fiszki_exam_questions', JSON.stringify(examQuestions));
      localStorage.setItem('fiszki_exam_answers', JSON.stringify(examAnswers));
      localStorage.setItem('fiszki_exam_start_time', examStartTime !== null ? String(examStartTime) : '');
      localStorage.setItem('fiszki_exam_current_index', String(examCurrentIndex));
      localStorage.setItem('fiszki_exam_completed', String(examCompleted));
    }
  }, [mode, remainingIds, currentId, selectedAnswer, correctCount, wrongCount, examQuestions, examAnswers, examStartTime, examCurrentIndex, examCompleted, mounted]);

  // Timer interval for Exam Mode
  useEffect(() => {
    if (mode !== 'exam' || examCompleted || !examStartTime) return;

    const tick = () => {
      const elapsedSeconds = (Date.now() - examStartTime) / 1000;
      const remaining = Math.max(0, 7200 - elapsedSeconds);
      setExamTimeLeft(remaining);

      if (remaining <= 0) {
        handleExamSubmit(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [mode, examStartTime, examCompleted]);

  // ==========================================
  // STUDY MODE LOGIC
  // ==========================================
  const startStudyMode = () => {
    const allIds = questions.map(q => q.id);
    const shuffled = shuffleArray(allIds);
    const firstId = shuffled.pop() || null;
    
    setRemainingIds(shuffled);
    setCurrentId(firstId);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setWrongCount(0);
    setShowResetConfirm(false);
    setMode('study');
  };

  const handleStudyAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    
    const currentQuestion = questions.find(q => q.id === currentId);
    if (currentQuestion) {
      if (option === currentQuestion.answer) {
        setCorrectCount(prev => prev + 1);
      } else {
        setWrongCount(prev => prev + 1);
      }
    }
  };

  const handleStudyNext = () => {
    if (selectedAnswer === null) return;
    
    const nextRemaining = [...remainingIds];
    const nextId = nextRemaining.pop() || null;
    
    setRemainingIds(nextRemaining);
    setCurrentId(nextId);
    setSelectedAnswer(null);
  };

  // ==========================================
  // EXAM MODE LOGIC
  // ==========================================
  const startExamMode = () => {
    const shuffledQuestions = shuffleArray(questions);
    const selected = shuffledQuestions.slice(0, 60); // 60 questions
    
    setExamQuestions(selected);
    setExamAnswers({});
    setExamStartTime(Date.now());
    setExamTimeLeft(7200); // 120 minutes
    setExamCurrentIndex(0);
    setExamCompleted(false);
    setShowSubmitConfirm(false);
    setShowExitConfirm(false);
    setMode('exam');
  };

  const handleExamAnswerSelect = (option: string) => {
    if (examCompleted) return;
    
    const currentQ = examQuestions[examCurrentIndex];
    if (!currentQ) return;

    setExamAnswers(prev => ({
      ...prev,
      [currentQ.id]: option
    }));
  };

  const handleExamSubmit = (isTimeout = false) => {
    setExamCompleted(true);
    setShowSubmitConfirm(false);
    localStorage.setItem('fiszki_exam_completed', 'true');
  };

  const exitToMenu = () => {
    setMode('menu');
    setShowExitConfirm(false);
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Calculations for Exam Results
  const getExamScore = () => {
    let correct = 0;
    examQuestions.forEach(q => {
      if (examAnswers[q.id] === q.answer) {
        correct++;
      }
    });
    const percentage = Math.round((correct / 60) * 100);
    const passed = percentage >= 72;
    return { correct, percentage, passed };
  };

  const getExamTimeSpent = () => {
    if (!examStartTime) return "00:00";
    const totalDuration = 7200; // 120 minutes in seconds
    const elapsed = (Date.now() - examStartTime) / 1000;
    const spentSeconds = examCompleted ? Math.min(totalDuration, Math.round(elapsed)) : Math.round(elapsed);
    
    const minutes = Math.floor(spentSeconds / 60);
    const seconds = Math.round(spentSeconds % 60);
    return `${minutes} min ${seconds}s`;
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="font-medium text-slate-300">Loading...</p>
      </div>
    );
  }

  // ==========================================
  // 1. MENU VIEW
  // ==========================================
  if (mode === 'menu') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-center">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Title Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-2">
            <Award className="w-4.5 h-4.5" />
            Claude Certified Architect Simulator
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            Master the Claude Exam
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Prepare for the Claude Certified Architect Foundations certification with 300 professionally designed flashcards and a full exam simulator.
          </p>

          {/* Cards container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-8">
            {/* STUDY MODE CARD */}
            <div className="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 md:p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/5 duration-300 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">Study Mode</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 font-normal">
                  Go through the database of 300 questions. Highlights correct/incorrect answers instantly, displays detailed explanations, and saves progress automatically.
                </p>
              </div>
              <button
                onClick={startStudyMode}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/15 transition-all cursor-pointer border-0"
              >
                Start Studying
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* EXAM SIMULATION CARD */}
            <div className="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-violet-500/50 rounded-3xl p-6 md:p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/5 duration-300 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/10 transition-colors"></div>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">Exam Simulator</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 font-normal">
                  Simulate the actual test environment. 60 random questions, a 120-minute timer, no immediate feedback, and a 72% passing score benchmark.
                </p>
              </div>
              <button
                onClick={startExamMode}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg shadow-violet-500/15 transition-all cursor-pointer border-0"
              >
                Simulate Exam
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 2. STUDY MODE VIEW
  // ==========================================
  if (mode === 'study') {
    const currentQuestion = questions.find(q => q.id === currentId);
    const totalQuestions = questions.length;
    const answeredCount = correctCount + wrongCount;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPercent = (answeredCount / totalQuestions) * 100;

    // Study Session Completed
    if (currentId === null && remainingIds.length === 0) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
          <div className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl"></div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full mb-6 shadow-lg shadow-yellow-500/20">
              <Award className="w-10 h-10 text-slate-950" />
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-200 bg-clip-text text-transparent mb-4">
              Congratulations!
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto">
              You successfully answered all <strong>{totalQuestions}</strong> questions! Your final score:
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
              <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
                <span className="block text-sm text-slate-400 font-medium mb-1">Correct</span>
                <span className="text-2xl font-bold text-emerald-400">{correctCount}</span>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
                <span className="block text-sm text-slate-400 font-medium mb-1">Incorrect</span>
                <span className="text-2xl font-bold text-rose-400">{wrongCount}</span>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
                <span className="block text-sm text-slate-400 font-medium mb-1">Score</span>
                <span className="text-2xl font-bold text-indigo-400">{accuracy}%</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={startStudyMode}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all cursor-pointer border-0"
              >
                <RotateCcw className="w-5 h-5" />
                Start New Session
              </button>
              <button
                onClick={exitToMenu}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-4 px-8 rounded-2xl transition-all cursor-pointer border-0"
              >
                <Home className="w-5 h-5" />
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        {/* Top Controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={exitToMenu}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer bg-transparent border-0"
          >
            <Home className="w-4 h-4" />
            Exit to Menu
          </button>

          <div className="relative">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl shadow-lg absolute right-0 top-0 z-50 whitespace-nowrap animate-fade-in">
                <span className="text-xs text-slate-300 px-2">Confirm reset?</span>
                <button 
                  onClick={startStudyMode}
                  className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg cursor-pointer border-0"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg cursor-pointer border-0"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer bg-transparent"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Session
              </button>
            )}
          </div>
        </div>

        {/* Stats header */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4 md:p-5 mb-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <span className="text-sm font-semibold text-slate-300">
                Progress: <span className="text-indigo-400 font-bold">{answeredCount}</span> / <span className="text-slate-400">{totalQuestions}</span>
              </span>
              <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-800/80 rounded-md border border-slate-700/30">
                Remaining: {remainingIds.length + (selectedAnswer === null ? 1 : 0)}
              </span>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 text-xs md:text-sm font-semibold">
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Correct: <strong className="font-bold">{correctCount}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Incorrect: <strong className="font-bold">{wrongCount}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl">
                <Percent className="w-3.5 h-3.5 text-indigo-400" />
                Score: <strong className="font-bold">{accuracy}%</strong>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/30">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"
              initial={{ width: `${progressPercent}%` }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question card */}
        {currentQuestion && (
          <div className="space-y-6">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/60 border border-slate-700/40 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/40 text-xs font-semibold text-slate-400 px-3 py-1 rounded-full mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                Question #{currentQuestion.id}
              </div>

              <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed mb-6 font-sans">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                  const optionText = currentQuestion.options[key];
                  const isSelected = selectedAnswer === key;
                  const isCorrect = currentQuestion.answer === key;
                  
                  let buttonStyle = "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600 hover:text-white";
                  let badgeStyle = "bg-slate-800 border-slate-700 text-slate-400";
                  
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      buttonStyle = "bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-md";
                      badgeStyle = "bg-emerald-500 text-slate-950 border-emerald-400";
                    } else if (isSelected) {
                      buttonStyle = "bg-rose-950/40 border-rose-500/80 text-rose-100 shadow-md";
                      badgeStyle = "bg-rose-500 text-white border-rose-400";
                    } else {
                      buttonStyle = "bg-slate-900/20 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed";
                      badgeStyle = "bg-slate-900 border-slate-800 text-slate-600";
                    }
                  }

                  return (
                    <button
                      key={key}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleStudyAnswerSelect(key)}
                      className={`w-full text-left inline-flex items-start gap-4 p-4 rounded-2xl border transition-all text-sm md:text-base font-medium duration-200 cursor-pointer ${buttonStyle}`}
                    >
                      <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-xl border text-xs font-bold font-sans transition-colors ${badgeStyle}`}>
                        {selectedAnswer !== null ? (
                          isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : (isSelected ? <X className="w-4 h-4 stroke-[3]" /> : key)
                        ) : key}
                      </span>
                      <span className="pt-0.5 leading-relaxed font-sans">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Explanation & Next */}
            <AnimatePresence>
              {selectedAnswer !== null && (
                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-lg ${
                    selectedAnswer === currentQuestion.answer 
                      ? 'bg-emerald-950/20 border-emerald-500/20' 
                      : 'bg-slate-900/60 border-slate-700/40'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {selectedAnswer === currentQuestion.answer ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <h3 className={`text-sm md:text-base font-bold uppercase tracking-wider ${
                        selectedAnswer === currentQuestion.answer ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                        {selectedAnswer === currentQuestion.answer ? 'Excellent! Correct answer' : 'Incorrect answer'}
                      </h3>
                    </div>
                    
                    {selectedAnswer !== currentQuestion.answer && (
                      <p className="text-slate-300 mb-4 text-sm md:text-base">
                        Correct answer is <strong className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-sans">{currentQuestion.answer}</strong>.
                      </p>
                    )}

                    {currentQuestion.explanation && (
                      <div className="border-t border-slate-800/80 pt-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Explanation:</h4>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal font-sans">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleStudyNext}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all cursor-pointer border-0"
                    >
                      Next Question
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. EXAM ACTIVE & RESULTS VIEW
  // ==========================================
  if (mode === 'exam') {
    const examScore = getExamScore();
    const timeSpent = getExamTimeSpent();
    const answeredCount = Object.keys(examAnswers).length;

    // A. EXAM RUNNING / SIMULATION ACTIVE
    if (!examCompleted) {
      const currentQ = examQuestions[examCurrentIndex];
      const timerPulsing = examTimeLeft < 600; // less than 10 minutes (600s)

      return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          {/* Exam Header */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4 md:p-5 mb-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-40">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 animate-pulse" />
                Exam Mode
              </span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50">
                Answered: {answeredCount} / 60
              </span>
            </div>

            {/* Timer and Submit early */}
            <div className="flex items-center justify-between md:justify-end gap-4">
              <div className={`flex items-center gap-2 text-lg font-bold font-sans ${timerPulsing ? 'text-rose-500 animate-pulse font-extrabold' : 'text-slate-100'}`}>
                {timerPulsing && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {formatTime(examTimeLeft)}
              </div>

              {showSubmitConfirm ? (
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl shadow-lg whitespace-nowrap animate-fade-in text-xs font-semibold">
                  <span className="text-slate-300 px-2">Submit now?</span>
                  <button 
                    onClick={() => handleExamSubmit(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg cursor-pointer border-0"
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setShowSubmitConfirm(false)}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg cursor-pointer border-0"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer border-0"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>

          {/* Alert Confirm Exit */}
          {showExitConfirm ? (
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl mb-6 text-center max-w-md mx-auto animate-fade-in relative z-50">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-100 mb-2">Abandon simulated exam?</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                You will lose all progress and answers in this exam simulation. Are you sure you want to exit?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={exitToMenu}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-5 rounded-xl cursor-pointer border-0 text-sm"
                >
                  Yes, Abandon
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-5 rounded-xl cursor-pointer border-0 text-sm"
                >
                  No, Keep Going
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <button
                onClick={() => setShowExitConfirm(true)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 transition-all cursor-pointer bg-transparent border-0"
              >
                <Home className="w-3.5 h-3.5" />
                Abandon Exam
              </button>
            </div>
          )}

          {/* Question Nav grid sheet */}
          <div className="bg-slate-900/30 border border-slate-800/60 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Sheet (Navigation)</h4>
            <div className="flex flex-wrap gap-1.5">
              {examQuestions.map((q, idx) => {
                const isCurrent = idx === examCurrentIndex;
                const isAnswered = examAnswers[q.id] !== undefined;

                let btnClass = "border border-slate-700/60 text-slate-400 bg-slate-900/20 hover:bg-slate-800/40";
                if (isCurrent) {
                  btnClass = "border-2 border-indigo-500 text-indigo-400 font-bold bg-slate-900/60";
                } else if (isAnswered) {
                  btnClass = "bg-slate-800 border-slate-700 text-slate-300";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setExamCurrentIndex(idx)}
                    className={`w-7.5 h-7.5 rounded-lg text-xs flex items-center justify-center font-sans font-medium transition-all cursor-pointer ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question display */}
          {currentQ && (
            <div className="space-y-6">
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-slate-700/40 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/40 text-xs font-semibold text-slate-400 px-3 py-1 rounded-full">
                    Question {examCurrentIndex + 1} of 60
                  </div>
                  <span className="text-[10px] text-slate-500">ID: #{currentQ.id}</span>
                </div>

                <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed mb-6 font-sans">
                  {currentQ.question}
                </h2>

                <div className="space-y-3">
                  {(Object.keys(currentQ.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                    const optionText = currentQ.options[key];
                    const isSelected = examAnswers[currentQ.id] === key;
                    
                    let buttonStyle = "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600 hover:text-white";
                    let badgeStyle = "bg-slate-800 border-slate-700 text-slate-400";
                    
                    if (isSelected) {
                      buttonStyle = "bg-indigo-950/40 border-indigo-500/80 text-indigo-100 shadow-md shadow-indigo-500/5";
                      badgeStyle = "bg-indigo-500 text-white border-indigo-400";
                    }

                    return (
                      <button
                        key={key}
                        onClick={() => handleExamAnswerSelect(key)}
                        className={`w-full text-left inline-flex items-start gap-4 p-4 rounded-2xl border transition-all text-sm md:text-base font-medium duration-200 cursor-pointer ${buttonStyle}`}
                      >
                        <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-xl border text-xs font-bold font-sans transition-colors ${badgeStyle}`}>
                          {key}
                        </span>
                        <span className="pt-0.5 leading-relaxed font-sans">{optionText}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <button
                  disabled={examCurrentIndex === 0}
                  onClick={() => setExamCurrentIndex(prev => prev - 1)}
                  className={`inline-flex items-center justify-center gap-1.5 font-semibold py-3.5 px-6 rounded-2xl transition-all border-0 text-sm ${
                    examCurrentIndex === 0 
                      ? 'bg-slate-900/10 text-slate-600 cursor-not-allowed' 
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white cursor-pointer shadow'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                {examCurrentIndex === 59 ? (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg transition-all cursor-pointer border-0 text-sm"
                  >
                    Finish Exam
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setExamCurrentIndex(prev => prev + 1)}
                    className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg transition-all cursor-pointer border-0 text-sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // B. EXAM COMPLETED / RESULTS SCREEN
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Result Card */}
        <div className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden text-center mb-8">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
          <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl ${examScore.passed ? 'bg-emerald-600/20' : 'bg-rose-600/20'}`}></div>

          {examScore.passed ? (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-full mb-6 shadow-lg shadow-emerald-500/25">
              <Check className="w-10 h-10 text-slate-950 stroke-[3]" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-rose-500 to-red-400 rounded-full mb-6 shadow-lg shadow-rose-500/25">
              <X className="w-10 h-10 text-slate-950 stroke-[3]" />
            </div>
          )}

          <h2 className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${examScore.passed ? 'bg-gradient-to-r from-emerald-200 via-emerald-300 to-teal-100 bg-clip-text text-transparent' : 'bg-gradient-to-r from-rose-200 via-rose-300 to-red-100 bg-clip-text text-transparent'}`}>
            {examScore.passed ? 'PASSED!' : 'FAILED'}
          </h2>
          
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-6">
            Passing score: 72% (44 / 60 correct)
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8 font-sans">
            <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
              <span className="block text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Your Score</span>
              <span className={`text-2xl font-bold ${examScore.passed ? 'text-emerald-400' : 'text-rose-400'}`}>{examScore.percentage}%</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
              <span className="block text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Correct</span>
              <span className="text-2xl font-bold text-slate-100">{examScore.correct} / 60</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/30 p-4 rounded-2xl">
              <span className="block text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Time Spent</span>
              <span className="text-2xl font-bold text-indigo-400">{timeSpent}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={startExamMode}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all cursor-pointer border-0 text-sm"
            >
              Try Another Exam
            </button>
            <button
              onClick={exitToMenu}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-4 px-8 rounded-2xl transition-all cursor-pointer border-0 text-sm"
            >
              Go to Main Menu
            </button>
          </div>
        </div>

        {/* Detailed Questions Review List */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-slate-100">Review Questions</h3>
          </div>

          {examQuestions.map((q, idx) => {
            const userChoice = examAnswers[q.id];
            const isCorrect = userChoice === q.answer;

            return (
              <div 
                key={q.id}
                className={`p-6 rounded-3xl border backdrop-blur-md shadow-md ${
                  isCorrect 
                    ? 'bg-emerald-950/10 border-emerald-500/25' 
                    : 'bg-rose-950/10 border-rose-500/25'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                    <h4 className="font-bold text-slate-200">
                      Question {idx + 1}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500">ID: #{q.id}</span>
                </div>

                <p className="text-slate-100 leading-relaxed mb-6 font-sans">
                  {q.question}
                </p>

                {/* Options List for review */}
                <div className="space-y-2 mb-4">
                  {(Object.keys(q.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                    const optionText = q.options[key];
                    const isOptionCorrect = q.answer === key;
                    const isOptionSelected = userChoice === key;

                    let rowStyle = "border-slate-800/80 text-slate-400 opacity-60";
                    let badgeStyle = "bg-slate-900 border-slate-800 text-slate-600";

                    if (isOptionCorrect) {
                      rowStyle = "bg-emerald-950/20 border-emerald-500/50 text-emerald-100";
                      badgeStyle = "bg-emerald-500 text-slate-950 border-emerald-400";
                    } else if (isOptionSelected) {
                      rowStyle = "bg-rose-950/20 border-rose-500/50 text-rose-100";
                      badgeStyle = "bg-rose-500 text-white border-rose-400";
                    }

                    return (
                      <div
                        key={key}
                        className={`inline-flex items-start gap-4 p-3.5 rounded-xl border text-sm font-medium w-full leading-normal font-sans ${rowStyle}`}
                      >
                        <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-sans ${badgeStyle}`}>
                          {key}
                        </span>
                        <span className="pt-0.5">{optionText}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Question Explanation */}
                <div className="border-t border-slate-800/80 pt-4 font-sans text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Explanation
                  </div>
                  
                  {!isCorrect && (
                    <p className="text-slate-350 mb-2">
                      Your answer: <strong className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-sans">{userChoice || 'None'}</strong>. 
                      Correct answer: <strong className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-sans">{q.answer}</strong>.
                    </p>
                  )}
                  
                  <p className="text-slate-300 leading-relaxed font-normal">
                    {q.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
