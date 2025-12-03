import { Question, UserProgress } from '@/types'

export interface QuestionBankInfo {
  version: string
  totalQuestions: number
  lastUpdated: string
  questionIds: number[]
}

export class ClientQuestionManager {
  // 检查题库是否有变化
  static hasQuestionBankChanged(currentQuestions: Question[]): boolean {
    try {
      const storedInfo = localStorage.getItem('questionBankInfo')
      if (!storedInfo) return true

      const info: QuestionBankInfo = JSON.parse(storedInfo)
      const currentIds = currentQuestions.map(q => q.id).sort((a, b) => a - b)
      const storedIds = info.questionIds.sort((a, b) => a - b)

      return (
        info.totalQuestions !== currentQuestions.length ||
        JSON.stringify(currentIds) !== JSON.stringify(storedIds)
      )
    } catch (error) {
      return true
    }
  }

  // 更新本地存储的题库信息
  static updateLocalQuestionBankInfo(questions: Question[]): void {
    const info: QuestionBankInfo = {
      version: Date.now().toString(),
      totalQuestions: questions.length,
      lastUpdated: new Date().toISOString(),
      questionIds: questions.map(q => q.id)
    }
    localStorage.setItem('questionBankInfo', JSON.stringify(info))
  }

  // 清理无效的练习进度
  static cleanupUserProgress(userProgress: UserProgress, validQuestionIds: number[]): UserProgress {
    const validIdSet = new Set(validQuestionIds)
    
    const cleanedProgress = {
      ...userProgress,
      completedQuestions: userProgress.completedQuestions?.filter(id => validIdSet.has(id)) || [],
      wrongQuestions: userProgress.wrongQuestions?.filter(id => validIdSet.has(id)) || []
    }

    // 重新计算统计数据
    const totalAnswered = cleanedProgress.completedQuestions.length
    const wrongCount = cleanedProgress.wrongQuestions.length
    const correctCount = totalAnswered - wrongCount

    return {
      ...cleanedProgress,
      correctCount: Math.max(0, correctCount),
      incorrectCount: wrongCount
    }
  }

  // 检查并更新用户进度
  static checkAndUpdateProgress(questions: Question[]): UserProgress | null {
    const currentProgress = this.getUserProgress()
    
    if (this.hasQuestionBankChanged(questions)) {
      console.log('题库已更新，正在清理用户进度...')
      
      const validIds = questions.map(q => q.id)
      const cleanedProgress = this.cleanupUserProgress(currentProgress, validIds)
      
      // 重置当前题目索引，确保不超出范围
      if (cleanedProgress.currentQuestionIndex >= questions.length) {
        cleanedProgress.currentQuestionIndex = 0
      }

      this.saveUserProgress(cleanedProgress)
      this.updateLocalQuestionBankInfo(questions)
      
      return cleanedProgress
    }

    return null
  }

  // 获取用户进度
  static getUserProgress(): UserProgress {
    try {
      const progress = localStorage.getItem('userProgress')
      if (progress) {
        return JSON.parse(progress)
      }
    } catch (error) {
      console.error('获取用户进度失败:', error)
    }

    return {
      currentQuestionIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      wrongQuestions: [],
      completedQuestions: []
    }
  }

  // 保存用户进度
  static saveUserProgress(progress: UserProgress): void {
    localStorage.setItem('userProgress', JSON.stringify(progress))
  }

  // 获取题库统计信息
  static getStatistics(questions: Question[]): {
    total: number
    byType: Record<string, number>
    completed: number
    correctRate: number
  } {
    const progress = this.getUserProgress()
    
    const byType = questions.reduce((acc, q) => {
      const typeName = q.type === 'multiple' ? '多选题' : 
                      q.type === 'single' ? '单选题' : 
                      q.type === 'indefinite' ? '不定项' : '判断题'
      acc[typeName] = (acc[typeName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalAnswered = progress.correctCount + progress.incorrectCount
    const correctRate = totalAnswered > 0 ? Math.round((progress.correctCount / totalAnswered) * 100) : 0

    return {
      total: questions.length,
      byType,
      completed: progress.completedQuestions?.length || 0,
      correctRate
    }
  }

  // 重置所有进度
  static resetAllProgress(): void {
    const defaultProgress: UserProgress = {
      currentQuestionIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      wrongQuestions: [],
      completedQuestions: []
    }
    
    this.saveUserProgress(defaultProgress)
    localStorage.removeItem('examHistory')
    localStorage.removeItem('questionBankInfo')
  }

  // 导出用户数据
  static exportUserData(): string {
    const progress = this.getUserProgress()
    const examHistory = localStorage.getItem('examHistory')
    const questionBankInfo = localStorage.getItem('questionBankInfo')

    return JSON.stringify({
      userProgress: progress,
      examHistory: examHistory ? JSON.parse(examHistory) : null,
      questionBankInfo: questionBankInfo ? JSON.parse(questionBankInfo) : null,
      exportTime: new Date().toISOString()
    }, null, 2)
  }

  // 导入用户数据
  static importUserData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.userProgress) {
        this.saveUserProgress(data.userProgress)
      }
      
      if (data.examHistory) {
        localStorage.setItem('examHistory', JSON.stringify(data.examHistory))
      }
      
      if (data.questionBankInfo) {
        localStorage.setItem('questionBankInfo', JSON.stringify(data.questionBankInfo))
      }

      return true
    } catch (error) {
      console.error('导入用户数据失败:', error)
      return false
    }
  }
}
