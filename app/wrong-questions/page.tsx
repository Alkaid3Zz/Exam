'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Question } from '@/types'
import questionsData from '@/data/questions.json'
import { PracticeManager, PracticeQuestion } from '@/utils/practiceManager'
import { DataSync } from '@/utils/dataSync'

export default function WrongQuestionsPage() {
  const [originalQuestions] = useState<Question[]>(questionsData as Question[])
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  const [wrongQuestions, setWrongQuestions] = useState<PracticeQuestion[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState<{ [key: number]: boolean }>({})
  const [stats, setStats] = useState({
    total: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    correctRate: 0
  })

  useEffect(() => {
    // 初始化练习题库
    const initialized = PracticeManager.initializePracticeQuestions(originalQuestions)
    setPracticeQuestions(initialized)
    
    // 获取错题列表
    const wrongList = PracticeManager.getWrongQuestions(initialized)
    setWrongQuestions(wrongList)
    
    // 更新统计信息
    const practiceStats = PracticeManager.getPracticeStats(initialized)
    setStats(practiceStats)
  }, [originalQuestions])

  // 更新统计信息
  const updateStats = (questions: PracticeQuestion[]) => {
    const newStats = PracticeManager.getPracticeStats(questions)
    setStats(newStats)
    
    // 更新错题列表
    const wrongList = PracticeManager.getWrongQuestions(questions)
    setWrongQuestions(wrongList)
    
    // 触发数据同步事件
    DataSync.triggerDataSync()
  }

  const handleAnswerSelect = (questionId: number, option: string) => {
    const question = wrongQuestions.find(q => q.id === questionId)
    if (!question || showAnswer[questionId]) return

    const currentAnswers = userAnswers[questionId] || []
    
    if (question.type === 'multiple' || question.type === 'indefinite') {
      // 多选题和不定项选择题
      if (currentAnswers.includes(option)) {
        setUserAnswers({
          ...userAnswers,
          [questionId]: currentAnswers.filter(ans => ans !== option)
        })
      } else {
        setUserAnswers({
          ...userAnswers,
          [questionId]: [...currentAnswers, option]
        })
      }
    } else {
      // 单选题和判断题
      setUserAnswers({
        ...userAnswers,
        [questionId]: [option]
      })
    }
  }

  const handleSubmitAnswer = (questionId: number) => {
    if (!userAnswers[questionId] || userAnswers[questionId].length === 0) {
      alert('请选择答案')
      return
    }

    setShowAnswer({
      ...showAnswer,
      [questionId]: true
    })
    
    const question = wrongQuestions.find(q => q.id === questionId)
    if (!question) return

    const userAnswer = userAnswers[questionId].sort()
    const correctAnswer = question.answer.sort()
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
    
    if (isCorrect) {
      // 答对了，更新题目状态
      PracticeManager.updateQuestionStatus(questionId, true)
      
      // 更新本地状态
      const updatedQuestions = practiceQuestions.map(q => 
        q.id === questionId 
          ? { ...q, attempted: true, isCorrect: true }
          : q
      )
      setPracticeQuestions(updatedQuestions)
      
      // 更新统计和错题列表
      updateStats(updatedQuestions)
    }
  }

  const handleRemoveFromWrongQuestions = (questionId: number) => {
    if (confirm('确定要从错题本中移除这道题吗？')) {
      // 将题目标记为正确（从错题本移除）
      PracticeManager.updateQuestionStatus(questionId, true)
      
      // 更新本地状态
      const updatedQuestions = practiceQuestions.map(q => 
        q.id === questionId 
          ? { ...q, attempted: true, isCorrect: true }
          : q
      )
      setPracticeQuestions(updatedQuestions)
      
      // 更新统计和错题列表
      updateStats(updatedQuestions)
    }
  }

  const handleClearAllWrongQuestions = () => {
    if (confirm('确定要清空所有错题吗？')) {
      // 将所有错题标记为正确
      const updatedQuestions = practiceQuestions.map(q => 
        q.attempted && !q.isCorrect 
          ? { ...q, isCorrect: true }
          : q
      )
      
      // 批量更新到localStorage
      updatedQuestions.forEach(q => {
        if (q.attempted && !practiceQuestions.find(pq => pq.id === q.id)?.isCorrect) {
          PracticeManager.updateQuestionStatus(q.id, true)
        }
      })
      
      setPracticeQuestions(updatedQuestions)
      updateStats(updatedQuestions)
    }
  }

  const getOptionLabel = (option: string) => {
    return option.charAt(0)
  }

  const getOptionText = (option: string) => {
    return option.substring(2)
  }

  const isOptionSelected = (questionId: number, option: string) => {
    return userAnswers[questionId]?.includes(getOptionLabel(option)) || false
  }

  const isOptionCorrect = (question: Question, option: string) => {
    return question.answer.includes(getOptionLabel(option))
  }

  const getUserAnswerStatus = (questionId: number) => {
    if (!showAnswer[questionId]) return null
    
    const question = wrongQuestions.find(q => q.id === questionId)
    if (!question) return null

    const userAnswer = userAnswers[questionId]?.sort() || []
    const correctAnswer = question.answer.sort()
    return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
  }

  if (wrongQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">太棒了！</h1>
              <p className="text-gray-600 mb-6">您目前没有错题，继续保持！</p>
              <a
                href="/practice"
                className="btn-primary"
              >
                继续练习
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">错题本</h1>
              <p className="text-gray-600">
                共 {wrongQuestions.length} 道错题，重新练习巩固知识点
              </p>
            </div>
            <button
              onClick={handleClearAllWrongQuestions}
              className="btn-secondary flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              清空错题本
            </button>
          </div>

          {/* 错题列表 */}
          <div className="space-y-6">
            {wrongQuestions.map((question, index) => (
              <div key={question.id} className="card">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                        {question.type === 'multiple' ? '多选题' : 
                         question.type === 'single' ? '单选题' : 
                         question.type === 'indefinite' ? '不定项' : '判断题'}
                      </span>
                      <span className="text-sm text-gray-600">题目 {question.id}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromWrongQuestions(question.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      移除
                    </button>
                  </div>
                  <h2 className="text-lg font-medium text-gray-900 leading-relaxed">
                    {question.question}
                  </h2>
                </div>

                {/* 选项 */}
                <div className="space-y-3 mb-4">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = isOptionSelected(question.id, option)
                    const isCorrect = isOptionCorrect(question, option)
                    const optionLabel = getOptionLabel(option)
                    const optionText = getOptionText(option)
                    
                    let optionClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 "
                    
                    if (showAnswer[question.id]) {
                      if (isCorrect) {
                        optionClass += "bg-green-50 border-green-200 text-green-800"
                      } else if (isSelected && !isCorrect) {
                        optionClass += "bg-red-50 border-red-200 text-red-800"
                      } else {
                        optionClass += "bg-gray-50 border-gray-200 text-gray-600"
                      }
                    } else {
                      if (isSelected) {
                        optionClass += "bg-primary-50 border-primary-200 text-primary-800"
                      } else {
                        optionClass += "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }
                    }

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => handleAnswerSelect(question.id, optionLabel)}
                        disabled={showAnswer[question.id]}
                        className={optionClass}
                      >
                        <div className="flex items-center">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium mr-3">
                            {optionLabel}
                          </span>
                          <span className="flex-1">{optionText}</span>
                          {showAnswer[question.id] && isCorrect && (
                            <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                          )}
                          {showAnswer[question.id] && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-red-600 ml-2" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* 答案状态 */}
                {showAnswer[question.id] && (
                  <div className="mb-4 p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center mb-2">
                      {getUserAnswerStatus(question.id) ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                      )}
                      <span className={`font-medium ${getUserAnswerStatus(question.id) ? 'text-green-800' : 'text-red-800'}`}>
                        {getUserAnswerStatus(question.id) ? '回答正确！已从错题本移除' : '回答错误'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>正确答案：</strong>{question.answer.join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                {!showAnswer[question.id] && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSubmitAnswer(question.id)}
                      className="btn-primary"
                    >
                      提交答案
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
