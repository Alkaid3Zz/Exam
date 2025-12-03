import { Question, UserProgress } from '@/types'
import fs from 'fs'
import path from 'path'

export interface QuestionBankInfo {
  version: string
  totalQuestions: number
  lastUpdated: string
  questionIds: number[]
}

export class QuestionManager {
  private static questionsFilePath = path.join(process.cwd(), 'data', 'questions.json')
  private static versionFilePath = path.join(process.cwd(), 'data', 'version.json')

  // 获取当前题库信息
  static async getQuestionBankInfo(): Promise<QuestionBankInfo> {
    try {
      const versionData = fs.readFileSync(this.versionFilePath, 'utf-8')
      return JSON.parse(versionData)
    } catch (error) {
      // 如果版本文件不存在，创建默认版本信息
      const questions = await this.loadQuestions()
      const info: QuestionBankInfo = {
        version: '1.0.0',
        totalQuestions: questions.length,
        lastUpdated: new Date().toISOString(),
        questionIds: questions.map(q => q.id)
      }
      await this.saveVersionInfo(info)
      return info
    }
  }

  // 保存版本信息
  static async saveVersionInfo(info: QuestionBankInfo): Promise<void> {
    fs.writeFileSync(this.versionFilePath, JSON.stringify(info, null, 2))
  }

  // 加载题库
  static async loadQuestions(): Promise<Question[]> {
    try {
      const data = fs.readFileSync(this.questionsFilePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  // 保存题库
  static async saveQuestions(questions: Question[]): Promise<void> {
    // 重新分配ID，确保连续性
    const sortedQuestions = questions.map((q, index) => ({
      ...q,
      id: index + 1
    }))

    fs.writeFileSync(this.questionsFilePath, JSON.stringify(sortedQuestions, null, 2))

    // 更新版本信息
    const currentInfo = await this.getQuestionBankInfo()
    const newInfo: QuestionBankInfo = {
      version: this.incrementVersion(currentInfo.version),
      totalQuestions: sortedQuestions.length,
      lastUpdated: new Date().toISOString(),
      questionIds: sortedQuestions.map(q => q.id)
    }
    await this.saveVersionInfo(newInfo)
  }

  // 添加新题目
  static async addQuestions(newQuestions: Question[]): Promise<void> {
    const existingQuestions = await this.loadQuestions()
    const maxId = existingQuestions.length > 0 ? Math.max(...existingQuestions.map(q => q.id)) : 0
    
    // 为新题目分配ID
    const questionsWithIds = newQuestions.map((q, index) => ({
      ...q,
      id: maxId + index + 1
    }))

    const allQuestions = [...existingQuestions, ...questionsWithIds]
    await this.saveQuestions(allQuestions)
  }

  // 替换整个题库
  static async replaceQuestions(newQuestions: Question[]): Promise<void> {
    await this.saveQuestions(newQuestions)
  }

  // 合并题目（去重）
  static async mergeQuestions(newQuestions: Question[]): Promise<void> {
    const existingQuestions = await this.loadQuestions()
    const existingQuestionTexts = new Set(existingQuestions.map(q => q.question.trim()))
    
    // 过滤掉重复的题目
    const uniqueNewQuestions = newQuestions.filter(q => 
      !existingQuestionTexts.has(q.question.trim())
    )

    if (uniqueNewQuestions.length > 0) {
      await this.addQuestions(uniqueNewQuestions)
    }
  }

  // 检查题库是否有变化
  static async hasQuestionBankChanged(): Promise<boolean> {
    try {
      const currentInfo = await this.getQuestionBankInfo()
      const storedVersion = localStorage.getItem('questionBankVersion')
      return storedVersion !== currentInfo.version
    } catch (error) {
      return true
    }
  }

  // 更新本地存储的版本信息
  static updateLocalVersion(version: string): void {
    localStorage.setItem('questionBankVersion', version)
  }

  // 清理无效的练习进度
  static cleanupUserProgress(userProgress: UserProgress, validQuestionIds: number[]): UserProgress {
    const validIdSet = new Set(validQuestionIds)
    
    return {
      ...userProgress,
      completedQuestions: userProgress.completedQuestions.filter(id => validIdSet.has(id)),
      wrongQuestions: userProgress.wrongQuestions.filter(id => validIdSet.has(id))
    }
  }

  // 版本号递增
  private static incrementVersion(version: string): string {
    const parts = version.split('.')
    const patch = parseInt(parts[2] || '0') + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  // 获取题库统计信息
  static async getStatistics(): Promise<{
    total: number
    byType: Record<string, number>
    lastUpdated: string
  }> {
    const questions = await this.loadQuestions()
    const info = await this.getQuestionBankInfo()
    
    const byType = questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: questions.length,
      byType,
      lastUpdated: info.lastUpdated
    }
  }
}
