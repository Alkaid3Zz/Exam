import { NextRequest, NextResponse } from 'next/server'
import { Question } from '@/types'
import fs from 'fs'
import path from 'path'

interface SyncRequest {
  questions: Question[]
  action: 'add' | 'replace' | 'merge'
}

interface QuestionBankInfo {
  version: string
  totalQuestions: number
  lastUpdated: string
  questionIds: number[]
}

export async function POST(request: NextRequest) {
  try {
    const { questions, action }: SyncRequest = await request.json()

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: '无效的题目数据' },
        { status: 400 }
      )
    }

    const questionsFilePath = path.join(process.cwd(), 'data', 'questions.json')
    const versionFilePath = path.join(process.cwd(), 'data', 'version.json')

    let finalQuestions: Question[] = []

    if (action === 'replace') {
      // 替换整个题库
      finalQuestions = questions.map((q, index) => ({
        ...q,
        id: index + 1
      }))
    } else if (action === 'add') {
      // 添加到现有题库
      let existingQuestions: Question[] = []
      try {
        const existingData = fs.readFileSync(questionsFilePath, 'utf-8')
        existingQuestions = JSON.parse(existingData)
      } catch (error) {
        // 如果文件不存在，创建新的
        existingQuestions = []
      }

      const maxId = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.id)) 
        : 0

      const newQuestions = questions.map((q, index) => ({
        ...q,
        id: maxId + index + 1
      }))

      finalQuestions = [...existingQuestions, ...newQuestions]
    } else if (action === 'merge') {
      // 合并题目（去重）
      let existingQuestions: Question[] = []
      try {
        const existingData = fs.readFileSync(questionsFilePath, 'utf-8')
        existingQuestions = JSON.parse(existingData)
      } catch (error) {
        existingQuestions = []
      }

      const existingQuestionTexts = new Set(
        existingQuestions.map(q => q.question.trim().toLowerCase())
      )

      const uniqueNewQuestions = questions.filter(q => 
        !existingQuestionTexts.has(q.question.trim().toLowerCase())
      )

      const maxId = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.id)) 
        : 0

      const questionsWithIds = uniqueNewQuestions.map((q, index) => ({
        ...q,
        id: maxId + index + 1
      }))

      finalQuestions = [...existingQuestions, ...questionsWithIds]
    }

    // 确保data目录存在
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // 保存题库文件
    fs.writeFileSync(questionsFilePath, JSON.stringify(finalQuestions, null, 2))

    // 更新版本信息
    const currentVersion = getCurrentVersion(versionFilePath)
    const newVersion = incrementVersion(currentVersion)
    
    const versionInfo: QuestionBankInfo = {
      version: newVersion,
      totalQuestions: finalQuestions.length,
      lastUpdated: new Date().toISOString(),
      questionIds: finalQuestions.map(q => q.id)
    }

    fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2))

    return NextResponse.json({
      success: true,
      totalQuestions: finalQuestions.length,
      addedQuestions: action === 'add' ? questions.length : 
                     action === 'merge' ? finalQuestions.length - (finalQuestions.length - questions.length) :
                     questions.length,
      version: newVersion
    })

  } catch (error) {
    console.error('同步题库失败:', error)
    return NextResponse.json(
      { error: '同步题库失败' },
      { status: 500 }
    )
  }
}

function getCurrentVersion(versionFilePath: string): string {
  try {
    const versionData = fs.readFileSync(versionFilePath, 'utf-8')
    const info: QuestionBankInfo = JSON.parse(versionData)
    return info.version
  } catch (error) {
    return '1.0.0'
  }
}

function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0') + 1
  return `${parts[0]}.${parts[1]}.${patch}`
}

export async function GET() {
  try {
    const questionsFilePath = path.join(process.cwd(), 'data', 'questions.json')
    const versionFilePath = path.join(process.cwd(), 'data', 'version.json')

    let questions: Question[] = []
    let versionInfo: QuestionBankInfo

    try {
      const questionsData = fs.readFileSync(questionsFilePath, 'utf-8')
      questions = JSON.parse(questionsData)
    } catch (error) {
      questions = []
    }

    try {
      const versionData = fs.readFileSync(versionFilePath, 'utf-8')
      versionInfo = JSON.parse(versionData)
    } catch (error) {
      versionInfo = {
        version: '1.0.0',
        totalQuestions: questions.length,
        lastUpdated: new Date().toISOString(),
        questionIds: questions.map(q => q.id)
      }
    }

    return NextResponse.json({
      questions,
      versionInfo
    })

  } catch (error) {
    console.error('获取题库信息失败:', error)
    return NextResponse.json(
      { error: '获取题库信息失败' },
      { status: 500 }
    )
  }
}
