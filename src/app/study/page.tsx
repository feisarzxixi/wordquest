'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BaseWord, LearningBatch, PlanTaskItem } from '../../lib/algorithms/planEngine';
import { QuestionFactory, QuizPayload } from '../../lib/quiz-factory/QuestionFactory';
import { WordCardView } from '../../components/study/views/WordCardView';
import { ChoiceQuizView } from '../../components/study/views/ChoiceQuizView';
import { AudioQuizView } from '../../components/study/views/AudioQuizView';
import { SpellingQuizView } from '../../components/study/views/SpellingQuizView';
import { PhraseBlocksQuizView } from '../../components/study/views/PhraseBlocksQuizView';
import { ResultFeedbackView } from '../../components/study/views/ResultFeedbackView';
import { DailySummaryView } from '../../components/study/views/DailySummaryView';
import { FocusEasterEggModal } from '../../components/study/views/FocusEasterEggModal';
import { FOCUS_EASTER_EGG_MS } from '../../config/learningRules';
import { COPYWRITING } from '../../config/copywriting';
import { Card } from '../../components/ui/Card';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

type StudyState =
  | 'LOADING'
  | 'EMPTY'
  | 'BATCH_RECOGNITION'
  | 'BATCH_TESTING'
  | 'RESULT_FEEDBACK'
  | 'DAILY_SUMMARY';

function StudyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPracticeMode = searchParams.get('mode') === 'practice';

  const [studyState, setStudyState] = useState<StudyState>('LOADING');
  const [currentBatch, setCurrentBatch] = useState<LearningBatch | null>(null);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [recognitionIndex, setRecognitionIndex] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);
  const [plan, setPlan] = useState<any>(null);

  // 答题与反馈暂存
  const [currentQuiz, setCurrentQuiz] = useState<QuizPayload | null>(null);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    word: BaseWord;
    isFirstTry: boolean;
    isLastTask: boolean;
  } | null>(null);

  // 15 分钟专注成就彩蛋控制
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const practiceStartMsRef = useRef<number>(Date.now());
  const hasTriggeredEasterEggRef = useRef<boolean>(false);

  // 今日完成结算数据暂存
  const [summaryData, setSummaryData] = useState<any>(null);

  const startTimeRef = useRef<number>(Date.now());
  const wakeLockRef = useRef<any>(null);

  // iPad 屏幕防熄屏保活 (Screen Wake Lock)
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    }
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // 实时累加学习时长 (每 30 秒向服务器心跳一次，仅在页面可见活跃时记录)
  useEffect(() => {
    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetch('/api/study/time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds: 30 }),
        }).catch(() => {});
      }
    };

    const interval = setInterval(sendHeartbeat, 30000);
    const initialTimer = setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetch('/api/study/time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds: 15 }),
        }).catch(() => {});
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, []);

  // 加载数据与初始化
  useEffect(() => {
    fetchSession();
  }, [isPracticeMode]);

  const fetchSession = async () => {
    try {
      if (isPracticeMode) {
        // 进入无尽加练流
        fetchNextPracticeBatch(0);
        return;
      }

      // 常规今日计划加载
      const res = await fetch('/api/plan').then((r) => r.json());
      if (!res.success || !res.data || res.data.totalWordCount === 0) {
        setStudyState('EMPTY');
        return;
      }

      const planData = res.data;
      setPlan(planData);

      if (planData.isCompleted) {
        // 今日任务已经完成，直接转入无尽加练流！
        fetchNextPracticeBatch(0);
        return;
      }

      // 恢复现场
      const savedBatchIdx = planData.currentBatchIndex || 0;
      const savedTaskIdx = planData.currentTaskIndex || 0;
      setCurrentBatchIndex(savedBatchIdx);
      setTaskIndex(savedTaskIdx);

      const batch = planData.batches[savedBatchIdx];
      if (!batch) {
        buildSummaryData(planData, 0);
        setStudyState('DAILY_SUMMARY');
        return;
      }

      setCurrentBatch(batch);
      if (savedTaskIdx === 0 && !batch.testTasks[0]?.isAnswered) {
        setStudyState('BATCH_RECOGNITION');
        setRecognitionIndex(0);
      } else {
        prepareQuiz(batch, savedTaskIdx);
        setStudyState('BATCH_TESTING');
      }
    } catch (err) {
      console.error('Fetch session error:', err);
      setStudyState('EMPTY');
    }
  };

  // 获取下一个无尽加练批次 (根据 N 动态配比)
  const fetchNextPracticeBatch = async (batchIdx: number) => {
    try {
      setStudyState('LOADING');
      const res = await fetch(`/api/plan?mode=practice&batchIndex=${batchIdx}`).then((r) => r.json());
      if (res.success && res.data?.batch) {
        const batch: LearningBatch = res.data.batch;
        setCurrentBatch(batch);
        setCurrentBatchIndex(batchIdx);
        setRecognitionIndex(0);
        setTaskIndex(0);
        setStudyState('BATCH_RECOGNITION');
      } else {
        setStudyState('EMPTY');
      }
    } catch (err) {
      console.error('Fetch practice batch error:', err);
    }
  };

  // 生成当前题目的题目包
  const prepareQuiz = (batch: LearningBatch, tIdx: number) => {
    const task: PlanTaskItem = batch.testTasks[tIdx];
    if (!task) return;

    const allWords = batch.words;
    const quizPayload = QuestionFactory.createQuiz(task.taskType, task.word, allWords, task.taskId);
    setCurrentQuiz(quizPayload);
  };

  // 1. 认识卡选择 (我不认识 / 我认识)
  const handleCardChoice = async (familiarity: number) => {
    if (!currentBatch) return;
    const currentWord = currentBatch.words[recognitionIndex];

    fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'card_familiarity',
        wordId: currentWord.id,
        familiarity,
      }),
    });

    if (recognitionIndex < currentBatch.words.length - 1) {
      setRecognitionIndex((prev) => prev + 1);
    } else {
      prepareQuiz(currentBatch, 0);
      setTaskIndex(0);
      setStudyState('BATCH_TESTING');
    }
  };

  // 2. 提交答案
  const handleSubmitAnswer = async (isCorrect: boolean) => {
    if (!currentBatch) return;
    const task = currentBatch.testTasks[taskIndex];

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_task',
          taskId: task.taskId,
          wordId: task.wordId,
          isCorrect,
        }),
      }).then((r) => r.json());

      const isFirstTry = res.data?.isFirstTry ?? true;
      task.isAnswered = true;
      task.isFirstTryCorrect = isCorrect;

      // 检查加练是否满 15 分钟专注
      const activeMs = Date.now() - practiceStartMsRef.current;
      if (activeMs >= FOCUS_EASTER_EGG_MS && !hasTriggeredEasterEggRef.current) {
        hasTriggeredEasterEggRef.current = true;
        setShowEasterEgg(true);
      }

      const isLastInBatch = taskIndex === currentBatch.testTasks.length - 1;
      const isRegularLast = !isPracticeMode && plan && currentBatchIndex === plan.batches.length - 1 && isLastInBatch;

      setLastResult({
        isCorrect,
        word: task.word,
        isFirstTry,
        isLastTask: isRegularLast,
      });

      // 方案 A 独立结果页（2.0 秒自动推进或快进）
      setStudyState('RESULT_FEEDBACK');
    } catch (err) {
      console.error('Submit answer error:', err);
    }
  };

  // 3. 结果页推进
  const handleNextFromFeedback = async () => {
    if (!currentBatch) return;
    const isLastTaskInBatch = taskIndex >= currentBatch.testTasks.length - 1;

    if (!isLastTaskInBatch) {
      // 推进组内下一题
      const nextTaskIdx = taskIndex + 1;
      setTaskIndex(nextTaskIdx);
      prepareQuiz(currentBatch, nextTaskIdx);
      setStudyState('BATCH_TESTING');

      if (!isPracticeMode && plan) {
        fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_progress',
            batchIndex: currentBatchIndex,
            taskIndex: nextTaskIdx,
          }),
        });
      }
    } else {
      // 本批次结束
      if (isPracticeMode || (plan && plan.isCompleted)) {
        // 无尽加练流：不回首页，自动开启下一轮！
        fetchNextPracticeBatch(currentBatchIndex + 1);
      } else {
        // 常规模式
        if (currentBatchIndex < plan.batches.length - 1) {
          const nextBatchIdx = currentBatchIndex + 1;
          const nextBatch = plan.batches[nextBatchIdx];
          setCurrentBatch(nextBatch);
          setCurrentBatchIndex(nextBatchIdx);
          setRecognitionIndex(0);
          setTaskIndex(0);
          setStudyState('BATCH_RECOGNITION');

          fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_progress',
              batchIndex: nextBatchIdx,
              taskIndex: 0,
            }),
          });
        } else {
          completeDailyPlan();
        }
      }
    }
  };

  const completeDailyPlan = async () => {
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_plan' }),
      }).then((r) => r.json());

      const bonusAwarded = res.data?.bonusAwarded || 0;
      buildSummaryData(plan, bonusAwarded);
      setStudyState('DAILY_SUMMARY');
    } catch (err) {
      setStudyState('DAILY_SUMMARY');
    }
  };

  const buildSummaryData = (planData: any, bonusAwarded: number) => {
    let total = 0;
    let correct = 0;
    const wrongList: BaseWord[] = [];

    planData.batches.forEach((b: LearningBatch) => {
      b.testTasks.forEach((t: PlanTaskItem) => {
        total++;
        if (t.isFirstTryCorrect) correct++;
        else wrongList.push(t.word);
      });
    });

    const elapsedMinutes = Math.round((Date.now() - startTimeRef.current) / 60000);
    setSummaryData({
      bonusPoints: bonusAwarded,
      totalPointsEarned: correct + bonusAwarded,
      newStreak: 1,
      totalTasks: total,
      correctTasks: correct,
      wrongWords: wrongList,
      durationMinutes: elapsedMinutes,
    });
  };

  // --- 状态渲染 ---

  if (studyState === 'LOADING') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">正在调取词汇与搭配...</span>
        </div>
      </div>
    );
  }

  if (studyState === 'EMPTY') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center flex flex-col items-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">词库尚无单词或短语</h2>
          <p className="text-sm text-slate-500 mb-6">
            请先在【设置】中上传导入你的专属单词/短语表。
          </p>
          <Link
            href="/settings"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition-all shadow-md"
          >
            前往导入词库
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-8">
      {/* 顶部轻量导航 */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{isPracticeMode || (plan && plan.isCompleted) ? COPYWRITING.study.btnExitPractice : '返回首页'}</span>
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {isPracticeMode || (plan && plan.isCompleted) ? '无尽加练进行中' : `第 ${currentBatchIndex + 1} 批次`}
        </span>
      </div>

      {/* 阶段 1：组内连续认识卡 */}
      {studyState === 'BATCH_RECOGNITION' && currentBatch && (
        <WordCardView
          word={currentBatch.words[recognitionIndex]}
          batchIndex={currentBatchIndex}
          wordIndexInBatch={recognitionIndex}
          totalInBatch={currentBatch.words.length}
          onUnknown={() => handleCardChoice(0)}
          onKnown={() => handleCardChoice(1)}
        />
      )}

      {/* 阶段 2：组内混排测试题 */}
      {studyState === 'BATCH_TESTING' && currentQuiz && currentBatch && (
        <>
          {(currentQuiz.quizType === 'MEANING_CHOICE' ||
            currentQuiz.quizType === 'SENTENCE_FILL' ||
            currentQuiz.quizType === 'PREPOSITION_FILL') && (
            <ChoiceQuizView
              quiz={currentQuiz}
              batchIndex={currentBatchIndex}
              taskIndexInBatch={taskIndex}
              totalInBatch={currentBatch.testTasks.length}
              onSelectOption={(_, isCorrect) => handleSubmitAnswer(isCorrect)}
            />
          )}

          {currentQuiz.quizType === 'AUDIO_CHOICE' && (
            <AudioQuizView
              quiz={currentQuiz}
              batchIndex={currentBatchIndex}
              taskIndexInBatch={taskIndex}
              totalInBatch={currentBatch.testTasks.length}
              onSelectOption={(_, isCorrect) => handleSubmitAnswer(isCorrect)}
            />
          )}

          {currentQuiz.quizType === 'SPELLING' && (
            <SpellingQuizView
              quiz={currentQuiz}
              batchIndex={currentBatchIndex}
              taskIndexInBatch={taskIndex}
              totalInBatch={currentBatch.testTasks.length}
              onSubmitAnswer={(assembled) => {
                const isCorrect =
                  assembled.trim().toLowerCase() === currentQuiz.word.word.trim().toLowerCase();
                handleSubmitAnswer(isCorrect);
              }}
            />
          )}

          {currentQuiz.quizType === 'PHRASE_BLOCKS' && (
            <PhraseBlocksQuizView
              quiz={currentQuiz}
              batchIndex={currentBatchIndex}
              taskIndexInBatch={taskIndex}
              totalInBatch={currentBatch.testTasks.length}
              onSubmitAnswer={(isCorrect) => handleSubmitAnswer(isCorrect)}
            />
          )}
        </>
      )}

      {/* 阶段 3：方案 A 独立结果页 (2.0 秒停留) */}
      {studyState === 'RESULT_FEEDBACK' && lastResult && (
        <ResultFeedbackView
          isCorrect={lastResult.isCorrect}
          word={lastResult.word}
          isFirstTry={lastResult.isFirstTry}
          isLastTask={lastResult.isLastTask}
          onNext={handleNextFromFeedback}
        />
      )}

      {/* 阶段 4：今日完成结算看板 */}
      {studyState === 'DAILY_SUMMARY' && summaryData && (
        <DailySummaryView
          bonusPoints={summaryData.bonusPoints}
          totalPointsEarned={summaryData.totalPointsEarned}
          newStreak={summaryData.newStreak}
          totalTasks={summaryData.totalTasks}
          correctTasks={summaryData.correctTasks}
          wrongWords={summaryData.wrongWords}
          durationMinutes={summaryData.durationMinutes}
          onBackHome={() => router.push('/')}
        />
      )}

      {/* 15 分钟专注成就彩蛋弹窗 */}
      {showEasterEgg && (
        <FocusEasterEggModal
          onContinue={() => {
            setShowEasterEgg(false);
            practiceStartMsRef.current = Date.now(); // 开启下一轮 15 分钟
            hasTriggeredEasterEggRef.current = false;
          }}
        />
      )}
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <StudyInner />
    </Suspense>
  );
}
