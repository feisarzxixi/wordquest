import { NextResponse } from 'next/server';
import { LocalDB, DailyPlanEntity } from '../../../lib/db';
import { generateDailyPlan, generateNextEndlessBatch } from '../../../lib/algorithms/planEngine';
import { calculateNextReview, formatDate, checkMasteryStatus } from '../../../lib/algorithms/srsScheduler';
import { DIFFICULTY_CONFIGS } from '../../../config/gamification';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';
import { resolveWordImage } from '../../../lib/utils/imageResolver';

export const dynamic = 'force-dynamic';

function enrichPlanImages(targetPlan: DailyPlanEntity): DailyPlanEntity {
  if (!targetPlan || !targetPlan.batches) return targetPlan;
  for (const batch of targetPlan.batches) {
    if (batch.words) {
      for (const w of batch.words) {
        w.image = resolveWordImage(w.word, w.image);
      }
    }
    if (batch.testTasks) {
      for (const t of batch.testTasks) {
        if (t.word) {
          t.word.image = resolveWordImage(t.word.word, t.word.image);
        }
      }
    }
  }
  return targetPlan;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode'); // 'practice' 为无尽加练模式
  const today = formatDate(new Date());
  const studentId = getStudentIdFromRequest(req);

  const settings = LocalDB.getSettings(studentId);
  const allWords = LocalDB.getAllWords();
  const allRecords = LocalDB.getAllRecords(studentId);
  const recordsMap = new Map(allRecords.map((r) => [r.wordId, r]));

  // 统计当前在学（未掌握）负荷量 N
  const activeLearningCount = allRecords.filter(
    (r) => !checkMasteryStatus(r.reviewInterval, r.lastResult)
  ).length;

  // 1. 无尽加练模式请求
  if (mode === 'practice') {
    const batchIdx = parseInt(searchParams.get('batchIndex') || '0', 10);
    const allReviewWords = allWords.filter((w) => recordsMap.has(w.id));
    const unlearnedWords = allWords.filter((w) => !recordsMap.has(w.id));

    const endlessBatch = generateNextEndlessBatch(
      allReviewWords.length > 0 ? allReviewWords : allWords,
      unlearnedWords,
      activeLearningCount,
      batchIdx,
      today
    );

    if (endlessBatch.words) {
      for (const w of endlessBatch.words) {
        w.image = resolveWordImage(w.word, w.image);
      }
    }
    if (endlessBatch.testTasks) {
      for (const t of endlessBatch.testTasks) {
        if (t.word) {
          t.word.image = resolveWordImage(t.word.word, t.word.image);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        batch: endlessBatch,
        activeLearningCount,
      },
    });
  }

  // 2. 常规今日计划请求
  let plan = LocalDB.getDailyPlan(today, studentId);
  if (plan) {
    enrichPlanImages(plan);
    return NextResponse.json({
      success: true,
      data: plan,
      activeLearningCount,
    });
  }

  // 首次生成今日计划
  const dueReviewWords = allWords.filter((w) => {
    const rec = recordsMap.get(w.id);
    return rec && rec.nextReviewDate <= today;
  });
  const unlearnedWords = allWords.filter((w) => !recordsMap.has(w.id));

  const generated = generateDailyPlan(
    dueReviewWords,
    unlearnedWords,
    activeLearningCount,
    settings.difficulty,
    today
  );

  const newPlan: DailyPlanEntity = {
    id: `plan-${today}-${studentId}`,
    date: today,
    difficulty: settings.difficulty,
    targetNewWordCount: generated.targetNewWordCount,
    totalWordCount: generated.totalWordCount,
    isCompleted: false,
    bonusAwarded: false,
    currentBatchIndex: 0,
    currentTaskIndex: 0,
    batches: generated.batches,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  enrichPlanImages(newPlan);
  LocalDB.saveDailyPlan(newPlan, studentId);
  return NextResponse.json({
    success: true,
    data: newPlan,
    activeLearningCount,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, date, batchIndex, taskIndex, taskId, wordId, isCorrect, familiarity } = body;
    const planDate = date || formatDate(new Date());
    const studentId = getStudentIdFromRequest(req) || body.studentId || 'student-default';

    const plan = LocalDB.getDailyPlan(planDate, studentId);
    const settings = LocalDB.getSettings(studentId);

    if (action === 'update_progress' && plan) {
      plan.currentBatchIndex = batchIndex ?? plan.currentBatchIndex;
      plan.currentTaskIndex = taskIndex ?? plan.currentTaskIndex;
      LocalDB.saveDailyPlan(plan, studentId);
      return NextResponse.json({ success: true, data: plan });
    }

    if (action === 'card_familiarity') {
      const existingRec = LocalDB.getRecordByWordId(wordId, studentId);
      LocalDB.upsertRecord(
        {
          wordId,
          familiarity: familiarity ?? 0,
          reviewInterval: existingRec?.reviewInterval ?? 1,
          nextReviewDate: existingRec?.nextReviewDate ?? planDate,
        },
        studentId
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'submit_task') {
      let isFirstTry = true;
      let pointsAwarded = 0;

      if (plan) {
        for (const batch of plan.batches) {
          const found = batch.testTasks.find((t) => t.taskId === taskId);
          if (found) {
            isFirstTry = !found.isAnswered;
            found.isAnswered = true;
            found.isFirstTryCorrect = isCorrect;
            if (isFirstTry && isCorrect && !found.scoreAwarded) {
              found.scoreAwarded = true;
              pointsAwarded = 1;
              LocalDB.updateSettings({ totalPoints: settings.totalPoints + 1 }, studentId);
            }
            break;
          }
        }
        LocalDB.saveDailyPlan(plan, studentId);
      }

      if (taskId.startsWith('endless-') && isCorrect) {
        pointsAwarded = 1;
        LocalDB.updateSettings({ totalPoints: settings.totalPoints + 1 }, studentId);
      }

      const existingRec = LocalDB.getRecordByWordId(wordId, studentId);
      const srs = calculateNextReview(existingRec?.reviewInterval ?? 0, isCorrect, new Date());

      LocalDB.upsertRecord(
        {
          wordId,
          reviewInterval: srs.nextInterval,
          nextReviewDate: srs.nextReviewDate,
          totalAttempts: 1,
          correctCount: isCorrect ? 1 : 0,
          lastResult: isCorrect,
        },
        studentId
      );

      // 记录当日学习单词活跃数
      LocalDB.recordDailyLearnedWord(wordId, planDate, studentId);

      return NextResponse.json({
        success: true,
        data: { pointsAwarded, isFirstTry, srs },
      });
    }

    if (action === 'complete_plan' && plan) {
      let bonusAwarded = 0;
      if (!plan.bonusAwarded) {
        const diffConfig = DIFFICULTY_CONFIGS[plan.difficulty] || DIFFICULTY_CONFIGS.regular;
        bonusAwarded = diffConfig.dailyBonusPoints;

        const yesterday = formatDate(new Date(Date.now() - 86400000));
        let newStreak = settings.streakDays;
        if (settings.lastCompletedDate === yesterday) {
          newStreak += 1;
        } else if (settings.lastCompletedDate !== planDate) {
          newStreak = 1;
        }

        LocalDB.updateSettings(
          {
            totalPoints: settings.totalPoints + bonusAwarded,
            streakDays: newStreak,
            lastCompletedDate: planDate,
          },
          studentId
        );

        plan.bonusAwarded = true;
      }

      plan.isCompleted = true;
      LocalDB.saveDailyPlan(plan, studentId);

      return NextResponse.json({
        success: true,
        data: {
          plan,
          bonusAwarded,
          newStreak: LocalDB.getSettings(studentId).streakDays,
          totalPoints: LocalDB.getSettings(studentId).totalPoints,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
