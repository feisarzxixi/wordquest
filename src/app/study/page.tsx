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
import { MatchingQuizView } from '../../components/study/views/MatchingQuizView';
import { ResultFeedbackView } from '../../components/study/views/ResultFeedbackView';
import { DailySummaryView } from '../../components/study/views/DailySummaryView';
import { FocusEasterEggModal } from '../../components/study/views/FocusEasterEggModal';
import { FOCUS_EASTER_EGG_MS } from '../../config/learningRules';
import { COPYWRITING } from '../../config/copywriting';
import { Card } from '../../components/ui/Card';
import { initClientImageCache, preloadWordImages } from '../../lib/images/clientImageCache';
import { SoundService } from '../../lib/audio/SoundService';
import { ClientSession } from '../../lib/auth/clientSession';
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
  const [recognitionWords, setRecognitionWords] = useState<BaseWord[]>([]);
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

  // 15 分钟专注成就彩蛋控制（严格采用与学习统计完全一致的真操作专注计时器）
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const sessionActiveSecondsRef = useRef<number>(0);
  const hasTriggeredEasterEggRef = useRef<boolean>(false);

  // 今日完成结算数据暂存
  const [summaryData, setSummaryData] = useState<any>(null);

  const startTimeRef = useRef<number>(Date.now());
  const wakeLockRef = useRef<any>(null);

  // 本地镜像备份助手：保障弱网、断网或容器重启时 0 进度丢失
  const syncLocalBackup = (user: any, planData: any) => {
    if (!user || !planData || !planData.date) return;
    try {
      localStorage.setItem(`wq_backup_plan_${user.id}_${planData.date}`, JSON.stringify(planData));
      window.dispatchEvent(new CustomEvent('wq_sync_needed'));
    } catch (e) {}
  };

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

  // 实时累加专注学习时长：严格执行防发呆/防挂机机制（超过 20 秒无触屏操作自动停止计时）
  const lastInteractionRef = useRef<number>(Date.now());
  const activeSecondsAccumulatorRef = useRef<number>(0);

  // 统一的专注时长上报函数，附带精准学生账号与防丢保障
  const reportActiveSeconds = (sec: number) => {
    if (sec <= 0) return;
    try {
      const currentUser = ClientSession.getCurrentUser();
      if (!currentUser) return;
      fetch('/api/study/time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': currentUser.id,
        },
        body: JSON.stringify({ seconds: sec, studentId: currentUser.id }),
      }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    const markActive = () => {
      lastInteractionRef.current = Date.now();
    };

    const events = ['touchstart', 'touchend', 'click', 'keydown', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const secondTicker = setInterval(() => {
      const now = Date.now();
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const isUserActive = now - lastInteractionRef.current <= 20000;

      if (isVisible && isUserActive) {
        activeSecondsAccumulatorRef.current += 1;
        sessionActiveSecondsRef.current += 1;

        if (sessionActiveSecondsRef.current >= 900 && !hasTriggeredEasterEggRef.current) {
          hasTriggeredEasterEggRef.current = true;
          const reportSec = activeSecondsAccumulatorRef.current;
          activeSecondsAccumulatorRef.current = 0;
          if (reportSec > 0) {
            reportActiveSeconds(reportSec);
          }
          setShowEasterEgg(true);
        }

        if (activeSecondsAccumulatorRef.current >= 15) {
          const reportSec = activeSecondsAccumulatorRef.current;
          activeSecondsAccumulatorRef.current = 0;
          reportActiveSeconds(reportSec);
        }
      }
    }, 1000);

    return () => {
      clearInterval(secondTicker);
      events.forEach((evt) => window.removeEventListener(evt, markActive));
      const remainingSec = activeSecondsAccumulatorRef.current;
      if (remainingSec > 0) {
        reportActiveSeconds(remainingSec);
      }
    };
  }, []);

  // 加载数据与初始化
  useEffect(() => {
    fetchSession();
  }, [isPracticeMode]);

  // 管道预加载 4：识记阶段提前预加载后 2~3 个新词配图与音频
  useEffect(() => {
    if (studyState === 'BATCH_RECOGNITION' && recognitionWords.length > 0) {
      const upcoming = recognitionWords.slice(recognitionIndex, recognitionIndex + 3);
      preloadWordImages(upcoming);
      SoundService.preloadWordAudio(upcoming);
    }
  }, [studyState, recognitionIndex, recognitionWords]);

  /**
   * 启动某一批次的学习流：严格执行“旧词无剧透”原则
   */
  const startBatchFlow = (batch: LearningBatch, initialTaskIdx: number = 0) => {
    setCurrentBatch(batch);

    // 筛选本组中真正属于首次学习的全新单词
    const newWords = batch.words.filter((w) =>
      batch.newWordIds && batch.newWordIds.length > 0 ? batch.newWordIds.includes(w.id) : false
    );

    if (newWords.length > 0 && initialTaskIdx === 0 && !batch.testTasks[0]?.isAnswered) {
      // 含有新词：仅对新词开展认识卡学习
      setRecognitionWords(newWords);
      setRecognitionIndex(0);
      setStudyState('BATCH_RECOGNITION');
      preloadWordImages(newWords);
      SoundService.preloadWordAudio(newWords);
    } else {
      // 纯复习词组：严禁剧透中文释义，直接进入测试题目考查记忆！
      setRecognitionWords([]);
      setTaskIndex(initialTaskIdx);
      prepareQuiz(batch, initialTaskIdx);
      setStudyState('BATCH_TESTING');
    }
  };

  const fetchSession = async () => {
    try {
      initClientImageCache();
      const currentUser = ClientSession.getCurrentUser();

      if (isPracticeMode) {
        fetchNextPracticeBatch(0);
        return;
      }

      // 常规今日计划加载
      const authHeaders = ClientSession.getAuthHeaders();
      const res = await fetch('/api/plan', {
        headers: authHeaders,
      }).then((r) => r.json());

      if (!res.success || !res.data || res.data.totalWordCount === 0) {
        setStudyState('EMPTY');
        return;
      }

      let planData = res.data;

      // 离线/刷新保护：检查本地备份，如果本地存在且进度比服务端新（如容器重启），自动恢复
      if (currentUser && planData) {
        try {
          const rawLocal = localStorage.getItem(`wq_backup_plan_${currentUser.id}_${planData.date}`);
          if (rawLocal) {
            const localPlan = JSON.parse(rawLocal);
            const localAnswered = localPlan.batches?.reduce(
              (acc: number, b: any) => acc + (b.testTasks?.filter((t: any) => t.isAnswered).length || 0),
              0
            ) || 0;
            const serverAnswered = planData.batches?.reduce(
              (acc: number, b: any) => acc + (b.testTasks?.filter((t: any) => t.isAnswered).length || 0),
              0
            ) || 0;

            if (localAnswered > serverAnswered) {
              planData = localPlan;
              fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                  action: 'restore_plan',
                  plan: localPlan,
                  studentId: currentUser.id,
                }),
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }

      syncLocalBackup(currentUser, planData);
      setPlan(planData);

      if (planData.isCompleted) {
        fetchNextPracticeBatch(0);
        return;
      }

      const savedBatchIdx = planData.currentBatchIndex || 0;
      const savedTaskIdx = planData.currentTaskIndex || 0;
      setCurrentBatchIndex(savedBatchIdx);

      const batch = planData.batches[savedBatchIdx];
      if (!batch) {
        buildSummaryData(planData, 0);
        setStudyState('DAILY_SUMMARY');
        return;
      }

      // 管道预加载当前组和下一组单词
      if (batch?.words) {
        preloadWordImages(batch.words);
        SoundService.preloadWordAudio(batch.words);
      }
      if (planData.batches[savedBatchIdx + 1]?.words) {
        preloadWordImages(planData.batches[savedBatchIdx + 1].words);
        SoundService.preloadWordAudio(planData.batches[savedBatchIdx + 1].words);
      }

      startBatchFlow(batch, savedTaskIdx);
    } catch (err) {
      console.error('Fetch session error:', err);
      setStudyState('EMPTY');
    }
  };

  // 获取下一个无尽加练批次 (每批 8 词)
  const fetchNextPracticeBatch = async (batchIdx: number) => {
    try {
      setStudyState('LOADING');
      const authHeaders = ClientSession.getAuthHeaders();
      const res = await fetch(`/api/plan?mode=practice&batchIndex=${batchIdx}`, {
        headers: authHeaders,
      }).then((r) => r.json());

      if (res.success && res.data?.batch) {
        const batch: LearningBatch = res.data.batch;
        setCurrentBatchIndex(batchIdx);
        startBatchFlow(batch, 0);
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

    if (task.word) {
      preloadWordImages([task.word]);
      SoundService.preloadWordAudio([task.word]);
    }
    const nextTask = batch.testTasks[tIdx + 1];
    if (nextTask?.word) {
      preloadWordImages([nextTask.word]);
      SoundService.preloadWordAudio([nextTask.word]);
    }

    const allWords = batch.words;
    const quizPayload = QuestionFactory.createQuiz(task.taskType, task.word, allWords, task.taskId);
    setCurrentQuiz(quizPayload);
  };

  // 1. 认识卡选择 (我不认识 / 我认识) - 仅在新词出现时进行
  const handleCardChoice = async (familiarity: number) => {
    if (!currentBatch || recognitionWords.length === 0) return;
    const currentWord = recognitionWords[recognitionIndex];
    const currentUser = ClientSession.getCurrentUser();

    fetch('/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...ClientSession.getAuthHeaders(),
      },
      body: JSON.stringify({
        action: 'card_familiarity',
        wordId: currentWord.id,
        familiarity,
        studentId: currentUser?.id,
      }),
    });

    if (recognitionIndex < recognitionWords.length - 1) {
      setRecognitionIndex((prev) => prev + 1);
    } else {
      // 本批次新词全部认识完毕，直接进入测试
      setRecognitionWords([]);
      prepareQuiz(currentBatch, 0);
      setTaskIndex(0);
      setStudyState('BATCH_TESTING');
    }
  };

  // 2. 提交答案
  const handleSubmitAnswer = async (isCorrect: boolean) => {
    if (!currentBatch) return;
    const task = currentBatch.testTasks[taskIndex];
    const currentUser = ClientSession.getCurrentUser();

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...ClientSession.getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'submit_task',
          taskId: task.taskId,
          wordId: task.wordId,
          isCorrect,
          studentId: currentUser?.id,
        }),
      }).then((r) => r.json());

      const isFirstTry = res.data?.isFirstTry ?? true;
      task.isAnswered = true;
      task.isFirstTryCorrect = isCorrect;

      // 更新本地镜像
      if (plan) {
        syncLocalBackup(currentUser, plan);
      }

      // 15 分钟专注成就彩蛋判定
      if (sessionActiveSecondsRef.current >= 900 && !hasTriggeredEasterEggRef.current) {
        hasTriggeredEasterEggRef.current = true;
        const reportSec = activeSecondsAccumulatorRef.current;
        activeSecondsAccumulatorRef.current = 0;
        if (reportSec > 0) {
          reportActiveSeconds(reportSec);
        }
        setShowEasterEgg(true);
      }

      // 如果当前是连线题：连线题已在连线题界面原地呈现了完整正确答案和同色标记，
      // 不需要再跳入单张生词结果反馈卡，直接原地推进组内下一题或进入批次结算！
      if (currentQuiz?.quizType === 'MATCHING') {
        const isLastInBatch = taskIndex >= currentBatch.testTasks.length - 1;
        if (isLastInBatch) {
          handleNextFromFeedback();
        } else {
          const nextTaskIdx = taskIndex + 1;
          setTaskIndex(nextTaskIdx);
          prepareQuiz(currentBatch, nextTaskIdx);
          setStudyState('BATCH_TESTING');

          if (!isPracticeMode && plan) {
            fetch('/api/plan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...ClientSession.getAuthHeaders(),
              },
              body: JSON.stringify({
                action: 'update_progress',
                batchIndex: currentBatchIndex,
                taskIndex: nextTaskIdx,
                studentId: currentUser?.id,
              }),
            });
          }
        }
        return;
      }

      const isLastInBatch = taskIndex === currentBatch.testTasks.length - 1;
      const isRegularLast = !isPracticeMode && plan && currentBatchIndex === plan.batches.length - 1 && isLastInBatch;

      setLastResult({
        isCorrect,
        word: task.word,
        isFirstTry,
        isLastTask: isRegularLast,
      });

      // 独立结果反馈页
      setStudyState('RESULT_FEEDBACK');
    } catch (err) {
      console.error('Submit answer error:', err);
    }
  };

  // 3. 结果页推进
  const handleNextFromFeedback = async () => {
    if (!currentBatch) return;
    const isLastTaskInBatch = taskIndex >= currentBatch.testTasks.length - 1;
    const currentUser = ClientSession.getCurrentUser();

    if (!isLastTaskInBatch) {
      // 推进组内下一题
      const nextTaskIdx = taskIndex + 1;
      setTaskIndex(nextTaskIdx);
      prepareQuiz(currentBatch, nextTaskIdx);
      setStudyState('BATCH_TESTING');

      if (!isPracticeMode && plan) {
        fetch('/api/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...ClientSession.getAuthHeaders(),
          },
          body: JSON.stringify({
            action: 'update_progress',
            batchIndex: currentBatchIndex,
            taskIndex: nextTaskIdx,
            studentId: currentUser?.id,
          }),
        });
      }
    } else {
      // 本批次全部 8 题结束
      if (isPracticeMode || (plan && plan.isCompleted)) {
        fetchNextPracticeBatch(currentBatchIndex + 1);
      } else {
        if (currentBatchIndex < plan.batches.length - 1) {
          const nextBatchIdx = currentBatchIndex + 1;
          const nextBatch = plan.batches[nextBatchIdx];
          setCurrentBatchIndex(nextBatchIdx);
          startBatchFlow(nextBatch, 0);

          fetch('/api/plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...ClientSession.getAuthHeaders(),
            },
            body: JSON.stringify({
              action: 'update_progress',
              batchIndex: nextBatchIdx,
              taskIndex: 0,
              studentId: currentUser?.id,
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
      const currentUser = ClientSession.getCurrentUser();
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...ClientSession.getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'complete_plan',
          studentId: currentUser?.id,
        }),
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

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* 顶部简易返回条 */}
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{isPracticeMode || (plan && plan.isCompleted) ? COPYWRITING.study.btnExitPractice : '返回首页'}</span>
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {isPracticeMode || (plan && plan.isCompleted) ? '无尽加练进行中' : `第 ${currentBatchIndex + 1} 批次 (8词/组)`}
        </span>
      </div>

      {/* 阶段 1：组内连续认识卡（仅针对本组全新单词，旧复习词绝不剧透） */}
      {studyState === 'BATCH_RECOGNITION' && currentBatch && recognitionWords.length > 0 && (
        <WordCardView
          key={`recog-${currentBatchIndex}-${recognitionIndex}-${recognitionWords[recognitionIndex]?.word}`}
          word={recognitionWords[recognitionIndex]}
          batchIndex={currentBatchIndex}
          wordIndexInBatch={recognitionIndex}
          totalInBatch={recognitionWords.length}
          onUnknown={() => handleCardChoice(0)}
          onKnown={() => handleCardChoice(1)}
        />
      )}

      {/* 阶段 2：组内混排测试题 (8 题丰富多样化随机分发) */}
      {studyState === 'BATCH_TESTING' && currentQuiz && currentBatch && (
        <>
          {(currentQuiz.quizType === 'MEANING_CHOICE' ||
            currentQuiz.quizType === 'SENTENCE_FILL' ||
            currentQuiz.quizType === 'PREPOSITION_FILL' ||
            currentQuiz.quizType === 'PART_OF_SPEECH' ||
            currentQuiz.quizType === 'FORM_TRANSFORMATION' ||
            currentQuiz.quizType === 'GRAMMAR_USAGE') && (
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

          {currentQuiz.quizType === 'MATCHING' && (
            <MatchingQuizView
              quiz={currentQuiz}
              batchIndex={currentBatchIndex}
              taskIndexInBatch={taskIndex}
              totalInBatch={currentBatch.testTasks.length}
              onSubmitAnswer={(isCorrect) => handleSubmitAnswer(isCorrect)}
            />
          )}
        </>
      )}

      {/* 阶段 3：常规题独立答题结果反馈页 */}
      {studyState === 'RESULT_FEEDBACK' && lastResult && (
        <ResultFeedbackView
          isCorrect={lastResult.isCorrect}
          word={lastResult.word}
          isFirstTry={lastResult.isFirstTry}
          isLastTask={lastResult.isLastTask}
          onNext={handleNextFromFeedback}
        />
      )}

      {/* 阶段 4：今日学习结算卡 */}
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

      {/* 加载中与空状态 */}
      {studyState === 'LOADING' && (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-sm">正在智能装载组块考题...</p>
        </div>
      )}

      {studyState === 'EMPTY' && (
        <Card className="w-full max-w-md p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl mb-4">
            <Sparkles size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">暂无可学计划</h2>
          <p className="text-slate-500 text-sm mb-6">今日任务可能已全部完成或词库为空。</p>
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </Link>
        </Card>
      )}

      {/* 15 分钟专注学习成就彩蛋弹窗 */}
      {showEasterEgg && (
        <FocusEasterEggModal
          onContinue={() => {
            setShowEasterEgg(false);
            sessionActiveSecondsRef.current = 0;
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
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudyInner />
    </Suspense>
  );
}
