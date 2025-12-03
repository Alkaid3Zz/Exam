import { Question } from '@/types'

export interface PracticeQuestion extends Question {
  attempted: boolean
  isCorrect: boolean
}

export class PracticeManager {
  private static STORAGE_KEY = 'practiceQuestions'
  private static STATS_KEY = 'practiceStats'

  // 初始化练习题库
  static initializePracticeQuestions(originalQuestions: Question[]): PracticeQuestion[] {
    const savedQuestions = this.getSavedQuestions()
    
    if (savedQuestions.length === 0 || savedQuestions.length !== originalQuestions.length) {
      // 如果没有保存的数据或题目数量不匹配，重新初始化
      const practiceQuestions: PracticeQuestion[] = originalQuestions.map(q => ({
        ...q,
        attempted: false,
        isCorrect: false
      }))
      
      this.savePracticeQuestions(practiceQuestions)
      return practiceQuestions
    }
    
    // 合并原始题目和保存的状态
    const mergedQuestions: PracticeQuestion[] = originalQuestions.map(originalQ => {
      const savedQ = savedQuestions.find(sq => sq.id === originalQ.id)
      return {
        ...originalQ,
        attempted: savedQ?.attempted || false,
        isCorrect: savedQ?.isCorrect || false
      }
    })
    
    this.savePracticeQuestions(mergedQuestions)
    return mergedQuestions
  }

  // 获取保存的练习题目
  static getSavedQuestions(): PracticeQuestion[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('获取练习题目失败:', error)
      return []
    }
  }

  // 保存练习题目
  static savePracticeQuestions(questions: PracticeQuestion[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(questions))
    } catch (error) {
      console.error('保存练习题目失败:', error)
    }
  }

  // 更新题目状态
  static updateQuestionStatus(questionId: number, isCorrect: boolean): void {
    const questions = this.getSavedQuestions()
    const questionIndex = questions.findIndex(q => q.id === questionId)
    
    if (questionIndex !== -1) {
      questions[questionIndex].attempted = true
      questions[questionIndex].isCorrect = isCorrect
      this.savePracticeQuestions(questions)
    }
  }

  // 查找第一个未做过的题目索引
  static findFirstUnattemptedQuestionIndex(questions: PracticeQuestion[]): number {
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].attempted) {
        return i
      }
    }
    // 如果所有题目都做过了，返回0（重新开始）
    return 0
  }

  // 查找下一个未做过的题目索引
  static findNextUnattemptedQuestionIndex(questions: PracticeQuestion[], currentIndex: number): number {
    // 从当前题目的下一题开始查找
    for (let i = currentIndex + 1; i < questions.length; i++) {
      if (!questions[i].attempted) {
        return i
      }
    }
    
    // 如果后面没有未做过的题目，返回下一题（如果存在）
    if (currentIndex + 1 < questions.length) {
      return currentIndex + 1
    }
    
    // 如果已经是最后一题，返回当前索引
    return currentIndex
  }

  // 获取练习统计
  static getPracticeStats(questions: PracticeQuestion[]): {
    total: number
    attempted: number
    correct: number
    incorrect: number
    correctRate: number
    wrongQuestions: PracticeQuestion[]
  } {
    const total = questions.length
    const attempted = questions.filter(q => q.attempted).length
    const correct = questions.filter(q => q.attempted && q.isCorrect).length
    const incorrect = questions.filter(q => q.attempted && !q.isCorrect).length
    const correctRate = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
    const wrongQuestions = questions.filter(q => q.attempted && !q.isCorrect)

    return {
      total,
      attempted,
      correct,
      incorrect,
      correctRate,
      wrongQuestions
    }
  }

  // 重置所有练习进度
  static resetAllProgress(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.STATS_KEY)
  }

  // 获取错题列表
  static getWrongQuestions(questions: PracticeQuestion[]): PracticeQuestion[] {
    return questions.filter(q => q.attempted && !q.isCorrect)
  }

  // 检查是否所有题目都已完成
  static isAllCompleted(questions: PracticeQuestion[]): boolean {
    return questions.every(q => q.attempted)
  }

  // 重做错题（重置错题的attempted状态）
  static retryWrongQuestions(): void {
    const questions = this.getSavedQuestions()
    questions.forEach(q => {
      if (q.attempted && !q.isCorrect) {
        q.attempted = false
        q.isCorrect = false
      }
    })
    this.savePracticeQuestions(questions)
  }
}
