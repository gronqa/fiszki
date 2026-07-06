import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Award, 
  BookOpen, 
  ChevronRight, 
  AlertCircle, 
  Percent, 
  Check, 
  X, 
  Clock 
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
  
  // States
  const [remainingIds, setRemainingIds] = useState<number[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 120 seconds per question
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    
    const savedRemaining = localStorage.getItem('fiszki_remaining');
    const savedCurrent = localStorage.getItem('fiszki_current_id');
    const savedSelected = localStorage.getItem('fiszki_selected_answer');
    const savedCorrect = localStorage.getItem('fiszki_correct_count');
    const savedWrong = localStorage.getItem('fiszki_wrong_count');
    const savedTimeLeft = localStorage.getItem('fiszki_time_left');

    if (savedRemaining && savedCurrent) {
      setRemainingIds(JSON.parse(savedRemaining));
      setCurrentId(Number(savedCurrent));
      setSelectedAnswer(savedSelected ? JSON.parse(savedSelected) : null);
      setCorrectCount(Number(savedCorrect) || 0);
      setWrongCount(Number(savedWrong) || 0);
      setTimeLeft(savedTimeLeft ? Number(savedTimeLeft) : 120);
    } else {
      startNewSession();
    }
  }, []);

  // Save states to localStorage on changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('fiszki_remaining', JSON.stringify(remainingIds));
    localStorage.setItem('fiszki_current_id', currentId !== null ? String(currentId) : '');
    localStorage.setItem('fiszki_selected_answer', JSON.stringify(selectedAnswer));
    localStorage.setItem('fiszki_correct_count', String(correctCount));
    localStorage.setItem('fiszki_wrong_count', String(wrongCount));
    localStorage.setItem('fiszki_time_left', String(timeLeft));
  }, [remainingIds, currentId, selectedAnswer, correctCount, wrongCount, timeLeft, mounted]);

  // Timer Effect
  useEffect(() => {
    if (!mounted || currentId === null || selectedAnswer !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timeout occurred: Count as wrong and skip to next question
          setWrongCount((w) => w + 1);
          
          if (remainingIds.length === 0) {
            setCurrentId(null);
          } else {
            const nextRemaining = [...remainingIds];
            const nextId = nextRemaining.pop() || null;
            setRemainingIds(nextRemaining);
            setCurrentId(nextId);
          }
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, currentId, selectedAnswer, remainingIds]);

  const startNewSession = () => {
    const allIds = questionsData.map(q => q.id);
    const shuffled = shuffleArray(allIds);
    const firstId = shuffled.pop() || null;
    
    setRemainingIds(shuffled);
    setCurrentId(firstId);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setWrongCount(0);
    setTimeLeft(120);
    setShowResetConfirm(false);
  };

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return; // Already answered
    
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

  const handleNext = () => {
    if (selectedAnswer === null) return;
    
    if (remainingIds.length === 0) {
      setCurrentId(null);
    } else {
      const nextRemaining = [...remainingIds];
      const nextId = nextRemaining.pop() || null;
      
      setRemainingIds(nextRemaining);
      setCurrentId(nextId);
      setSelectedAnswer(null);
      setTimeLeft(120);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="font-medium text-slate-300">Loading questions...</p>
      </div>
    );
  }

  const currentQuestion = questions.find(q => q.id === currentId);
  const totalQuestions = questions.length;
  const answeredCount = correctCount + wrongCount;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const progressPercent = (answeredCount / totalQuestions) * 100;

  // Format seconds into M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Session Completed
  if (currentId === null && remainingIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl"></div>
          
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full mb-6 shadow-lg shadow-yellow-500/20">
            <Award className="w-10 h-10 text-slate-950" />
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-200 bg-clip-text text-transparent mb-4">
            Congratulations!
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto">
            You successfully completed all <strong>{totalQuestions}</strong> questions! Your final score:
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

          <button
            onClick={startNewSession}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-0"
          >
            <RotateCcw className="w-5 h-5" />
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  const timerWarning = timeLeft <= 15; // Warn when <= 15 seconds remain

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Top Controls & Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-400 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Claude Certified Architect
          </h1>
        </div>

        <div className="relative">
          {showResetConfirm ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl shadow-lg absolute right-0 top-0 z-50 whitespace-nowrap">
              <span className="text-xs text-slate-300 px-2">Confirm reset?</span>
              <button 
                onClick={startNewSession}
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
              title="Reset current progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Session
            </button>
          )}
        </div>
      </div>

      {/* Progress & Stats Card */}
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

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/30">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"
            initial={{ width: `${progressPercent}%` }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Question Display */}
      {currentQuestion && (
        <div className="space-y-6">
          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-slate-700/40 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden"
          >
            {/* Ambient Background Lights */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Header: ID and Timer */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/40 text-xs font-semibold text-slate-400 px-3 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                Question #{currentQuestion.id}
              </div>

              {/* Countdown Timer */}
              <div 
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border font-sans transition-all duration-300 ${
                  selectedAnswer !== null
                    ? 'bg-slate-800/40 border-slate-700/30 text-slate-400' // Paused state
                    : timerWarning
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-400 animate-pulse font-extrabold shadow-md shadow-rose-500/5'
                      : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-400'
                }`}
                title={selectedAnswer !== null ? "Timer paused" : "Time remaining"}
              >
                <Clock className={`w-4 h-4 ${selectedAnswer === null && !timerWarning ? 'animate-pulse' : ''}`} />
                <span>
                  {selectedAnswer !== null ? 'Paused' : formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed mb-6 font-sans">
              {currentQuestion.question}
            </h2>

            {/* Options List */}
            <div className="space-y-3">
              {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                const optionText = currentQuestion.options[key];
                const isSelected = selectedAnswer === key;
                const isCorrect = currentQuestion.answer === key;
                
                let buttonStyle = "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600 hover:text-white";
                let badgeStyle = "bg-slate-800 border-slate-700 text-slate-400";
                
                if (selectedAnswer !== null) {
                  if (isCorrect) {
                    buttonStyle = "bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-500/5";
                    badgeStyle = "bg-emerald-500 text-slate-950 border-emerald-400";
                  } else if (isSelected) {
                    buttonStyle = "bg-rose-950/40 border-rose-500/80 text-rose-100 shadow-md shadow-rose-500/5";
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
                    onClick={() => handleAnswerSelect(key)}
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

          {/* Explanation panel & Next button */}
          <AnimatePresence>
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-4"
              >
                {/* Explanation Card */}
                <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-lg ${
                  selectedAnswer === currentQuestion.answer 
                    ? 'bg-emerald-950/20 border-emerald-500/20' 
                    : 'bg-slate-900/60 border-slate-700/40'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {selectedAnswer === currentQuestion.answer ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
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
                    <div className="border-t border-slate-800/80 pt-4 font-sans">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Explanation:</h4>
                      <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Next button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleNext}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-0"
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
