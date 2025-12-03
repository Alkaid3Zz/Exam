import { Question } from '@/types'

export interface ParseResult {
  questions: Question[]
  errors: string[]
  warnings: string[]
}

export interface ProgressCallback {
  (progress: number, message: string): void
}

export class QuestionParser {
  private static getNextId(existingQuestions: Question[]): number {
    if (existingQuestions.length === 0) return 1
    return Math.max(...existingQuestions.map(q => q.id)) + 1
  }

  static async parseTextWithProgress(
    text: string, 
    existingQuestions: Question[] = [],
    onProgress?: ProgressCallback
  ): Promise<ParseResult> {
    const result: ParseResult = {
      questions: [],
      errors: [],
      warnings: []
    }

    try {
      onProgress?.(5, '正在分析文档结构...')
      await new Promise(resolve => setTimeout(resolve, 100))

      // 清理文本
      const cleanText = this.cleanText(text)
      
      onProgress?.(15, '正在分割文本内容...')
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 按行分割
      const lines = cleanText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      onProgress?.(25, '正在识别题目类型...')
      await new Promise(resolve => setTimeout(resolve, 150))

      let currentType: 'multiple' | 'single' | 'judge' | 'indefinite' = 'multiple'
      let currentId = this.getNextId(existingQuestions)
      let i = 0
      const totalLines = lines.length

      while (i < lines.length) {
        const line = lines[i]
        
        // 更新进度
        const progressPercent = 25 + Math.floor((i / totalLines) * 50)
        onProgress?.(progressPercent, `正在解析第 ${result.questions.length + 1} 道题目...`)

        // 检测题型标题
        const typeResult = this.detectQuestionType(line)
        if (typeResult) {
          currentType = typeResult
          i++
          continue
        }

        // 检测题目开始
        const questionMatch = this.parseQuestionStart(line)
        if (questionMatch) {
          const parseResult = this.parseQuestion(
            lines, 
            i, 
            currentId, 
            currentType, 
            questionMatch.questionText
          )

          if (parseResult.question) {
            result.questions.push(parseResult.question)
            currentId++
          }

          if (parseResult.error) {
            result.errors.push(`题目 ${currentId}: ${parseResult.error}`)
          }

          if (parseResult.warning) {
            result.warnings.push(`题目 ${currentId}: ${parseResult.warning}`)
          }

          i = parseResult.nextIndex
          continue
        }

        i++
      }

      onProgress?.(80, '正在验证题目格式...')
      await new Promise(resolve => setTimeout(resolve, 200))

      if (result.questions.length === 0) {
        result.errors.push('未能解析出任何有效题目，请检查格式')
      }

      onProgress?.(100, `解析完成！共找到 ${result.questions.length} 道题目`)
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      result.errors.push(`解析过程中发生错误: ${error}`)
      onProgress?.(100, '解析过程中发生错误')
    }

    return result
  }

  static parseText(text: string, existingQuestions: Question[] = []): ParseResult {
    const result: ParseResult = {
      questions: [],
      errors: [],
      warnings: []
    }

    try {
      // 清理文本
      const cleanText = this.cleanText(text)
      
      // 按行分割
      const lines = cleanText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      let currentType: 'multiple' | 'single' | 'judge' | 'indefinite' = 'multiple'
      let currentId = this.getNextId(existingQuestions)
      let i = 0

      while (i < lines.length) {
        const line = lines[i]

        // 检测题型标题
        const typeResult = this.detectQuestionType(line)
        if (typeResult) {
          currentType = typeResult
          i++
          continue
        }

        // 检测题目开始
        const questionMatch = this.parseQuestionStart(line)
        if (questionMatch) {
          const parseResult = this.parseQuestion(
            lines, 
            i, 
            currentId, 
            currentType, 
            questionMatch.questionText
          )

          if (parseResult.question) {
            result.questions.push(parseResult.question)
            currentId++
          }

          if (parseResult.error) {
            result.errors.push(`题目 ${currentId}: ${parseResult.error}`)
          }

          if (parseResult.warning) {
            result.warnings.push(`题目 ${currentId}: ${parseResult.warning}`)
          }

          i = parseResult.nextIndex
          continue
        }

        i++
      }

      if (result.questions.length === 0) {
        result.errors.push('未能解析出任何有效题目，请检查格式')
      }

    } catch (error) {
      result.errors.push(`解析过程中发生错误: ${error}`)
    }

    return result
  }

  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+$/gm, '') // 移除行尾空格
      .replace(/^\s+/gm, '') // 移除行首空格
      .replace(/\n{3,}/g, '\n\n') // 合并多个空行
  }

  private static detectQuestionType(line: string): 'multiple' | 'single' | 'judge' | 'indefinite' | null {
    const lowerLine = line.toLowerCase()
    
    if (lowerLine.includes('多选题') || lowerLine.includes('多项选择')) {
      return 'multiple'
    }
    if (lowerLine.includes('单选题') || lowerLine.includes('单项选择') || lowerLine.includes('习近平法治思想之单选题')) {
      return 'single'
    }
    if (lowerLine.includes('判断题') || lowerLine.includes('是非题') || lowerLine.includes('习近平法治思想之判断题')) {
      return 'judge'
    }
    if (lowerLine.includes('不定项')) {
      return 'indefinite'
    }
    
    return null
  }

  private static parseQuestionStart(line: string): { questionText: string } | null {
    // 匹配各种题目开始格式
    const patterns = [
      /^(\d+)\.?\s*(.+)$/,           // 1. 题目内容
      /^(\d+)、\s*(.+)$/,           // 1、题目内容
      /^第?(\d+)题[：:]\s*(.+)$/,    // 第1题：题目内容
      /^题目(\d+)[：:]\s*(.+)$/,     // 题目1：题目内容
    ]

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        return { questionText: match[2].trim() }
      }
    }

    return null
  }

  private static parseQuestion(
    lines: string[], 
    startIndex: number, 
    id: number, 
    type: 'multiple' | 'single' | 'judge' | 'indefinite',
    questionText: string
  ): {
    question: Question | null
    error: string | null
    warning: string | null
    nextIndex: number
  } {
    let i = startIndex + 1
    const options: string[] = []
    let answer: string[] = []
    let error: string | null = null
    let warning: string | null = null

    // 收集选项
    while (i < lines.length) {
      const line = lines[i]
      
      // 检查是否是答案行
      if (this.isAnswerLine(line)) {
        answer = this.parseAnswer(line)
        i++
        break
      }

      // 检查是否是选项
      const option = this.parseOption(line)
      if (option) {
        options.push(option)
        i++
        continue
      }

      // 检查是否是下一题的开始
      if (this.parseQuestionStart(line)) {
        break
      }

      // 跳过空行和无关内容
      i++
    }

    // 验证和修正
    const validation = this.validateQuestion(questionText, options, answer, type)
    
    if (validation.isValid) {
      return {
        question: {
          id,
          type,
          question: questionText,
          options: validation.options,
          answer: validation.answer
        },
        error: null,
        warning: validation.warning,
        nextIndex: i
      }
    } else {
      return {
        question: null,
        error: validation.error,
        warning: null,
        nextIndex: i
      }
    }
  }

  private static isAnswerLine(line: string): boolean {
    const patterns = [
      /^正确答案[：:]/,
      /^答案[：:]/,
      /^标准答案[：:]/,
      /^参考答案[：:]/,
    ]

    return patterns.some(pattern => pattern.test(line))
  }

  private static parseAnswer(line: string): string[] {
    // 提取答案部分，支持Y/N格式
    const answerMatch = line.match(/[：:]\s*([A-Z]+|[ABCD,，\s]+|[YN])/)
    if (!answerMatch) return []

    const answerText = answerMatch[1].trim()
    
    // 处理Y/N格式 (判断题)
    if (answerText === 'Y') {
      return ['A'] // Y表示正确，对应A选项
    }
    if (answerText === 'N') {
      return ['B'] // N表示错误，对应B选项
    }
    
    // 处理连续字母格式 (如: ABCD)
    if (/^[A-Z]+$/.test(answerText)) {
      return answerText.split('')
    }

    // 处理逗号分隔格式 (如: A,B,C,D 或 A，B，C，D)
    if (answerText.includes(',') || answerText.includes('，')) {
      return answerText.split(/[,，]/).map(s => s.trim()).filter(s => s)
    }

    // 处理空格分隔格式 (如: A B C D)
    if (answerText.includes(' ')) {
      return answerText.split(/\s+/).filter(s => s)
    }

    // 单个答案
    return [answerText]
  }

  private static parseOption(line: string): string | null {
    // 匹配选项格式
    const patterns = [
      /^([A-Z])[\.、]\s*(.+)$/,      // A. 选项内容 或 A、选项内容
      /^([A-Z])\s+(.+)$/,           // A 选项内容
      /^（([A-Z])）\s*(.+)$/,       // （A）选项内容
      /^\(([A-Z])\)\s*(.+)$/,       // (A)选项内容
    ]

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        return `${match[1]}.${match[2]}`
      }
    }

    return null
  }

  private static validateQuestion(
    questionText: string,
    options: string[],
    answer: string[],
    type: 'multiple' | 'single' | 'judge' | 'indefinite'
  ): {
    isValid: boolean
    error: string | null
    warning: string | null
    options: string[]
    answer: string[]
  } {
    let error: string | null = null
    let warning: string | null = null
    let validOptions = [...options]
    let validAnswer = [...answer]

    // 检查题目内容
    if (!questionText.trim()) {
      error = '题目内容为空'
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    // 处理判断题
    if (type === 'judge') {
      if (validOptions.length === 0) {
        validOptions = ['A.正确', 'B.错误']
        warning = '自动为判断题添加了标准选项'
      }
      
      // 转换判断题答案
      if (validAnswer.length === 1) {
        const ans = validAnswer[0].toUpperCase()
        if (ans === '正确' || ans === '对' || ans === 'TRUE' || ans === 'T') {
          validAnswer = ['A']
        } else if (ans === '错误' || ans === '错' || ans === 'FALSE' || ans === 'F') {
          validAnswer = ['B']
        }
      }
    }

    // 检查选项
    if (validOptions.length === 0) {
      error = '没有找到有效选项'
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    // 检查答案
    if (validAnswer.length === 0) {
      error = '没有找到正确答案'
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    // 验证答案选项是否存在
    const availableOptions = validOptions.map(opt => opt.charAt(0))
    const invalidAnswers = validAnswer.filter(ans => !availableOptions.includes(ans))
    
    if (invalidAnswers.length > 0) {
      error = `答案包含无效选项: ${invalidAnswers.join(', ')}`
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    // 检查题型与答案的匹配
    if (type === 'single' && validAnswer.length > 1) {
      warning = '单选题有多个答案，请检查题型是否正确'
    }

    if (type === 'judge' && validAnswer.length > 1) {
      error = '判断题不能有多个答案'
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    // 不定项选择题可以有1个或多个答案，无需特殊验证
    if (type === 'indefinite' && validAnswer.length === 0) {
      error = '不定项选择题必须有至少一个答案'
      return { isValid: false, error, warning, options: validOptions, answer: validAnswer }
    }

    return {
      isValid: true,
      error: null,
      warning,
      options: validOptions,
      answer: validAnswer
    }
  }
}
