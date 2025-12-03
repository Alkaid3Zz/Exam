'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, Target } from 'lucide-react'
import { Question } from '@/types'
import questionsData from '@/data/questions.json'
import { PracticeManager, PracticeQuestion } from '@/utils/practiceManager'
import { DataSync } from '@/utils/dataSync'

export default function PracticePage() {
  const router = useRouter()
  const [originalQuestions] = useState<Question[]>(questionsData as Question[])
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    correctRate: 0
  })

  const currentQuestion = practiceQuestions[currentQuestionIndex]

  useEffect(() => {
    // 初始化练习题库
    const initialized = PracticeManager.initializePracticeQuestions(originalQuestions)
    setPracticeQuestions(initialized)
    
    // 找到第一个未做过的题目
    const firstUnattemptedIndex = PracticeManager.findFirstUnattemptedQuestionIndex(initialized)
    setCurrentQuestionIndex(firstUnattemptedIndex)
    
    // 更新统计信息
    updateStats(initialized)
  }, [originalQuestions])

  // 更新统计信息
  const updateStats = (questions: PracticeQuestion[]) => {
    const newStats = PracticeManager.getPracticeStats(questions)
    setStats(newStats)
    
    // 触发数据同步事件
    DataSync.triggerDataSync()
  }

  const handleAnswerSelect = (option: string) => {
    if (showAnswer) return

    const questionId = currentQuestion.id
    const currentAnswers = userAnswers[questionId] || []
    
    if (currentQuestion.type === 'multiple' || currentQuestion.type === 'indefinite') {
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

  const handleSubmitAnswer = () => {
    if (!userAnswers[currentQuestion.id] || userAnswers[currentQuestion.id].length === 0) {
      alert('请选择答案')
      return
    }

    setShowAnswer(true)
    
    const userAnswer = userAnswers[currentQuestion.id].sort()
    const correctAnswer = currentQuestion.answer.sort()
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
    
    // 更新题目状态
    PracticeManager.updateQuestionStatus(currentQuestion.id, isCorrect)
    
    // 更新本地状态
    const updatedQuestions = practiceQuestions.map(q => 
      q.id === currentQuestion.id 
        ? { ...q, attempted: true, isCorrect }
        : q
    )
    setPracticeQuestions(updatedQuestions)
    
    // 更新统计信息
    updateStats(updatedQuestions)
  }

  const handleNextQuestion = () => {
    const nextIndex = PracticeManager.findNextUnattemptedQuestionIndex(practiceQuestions, currentQuestionIndex)
    
    if (nextIndex < practiceQuestions.length && nextIndex !== currentQuestionIndex) {
      setCurrentQuestionIndex(nextIndex)
      setShowAnswer(false)
    } else if (currentQuestionIndex + 1 < practiceQuestions.length) {
      // 如果没有未做过的题目，就按顺序到下一题
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowAnswer(false)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setShowAnswer(false)
    }
  }

  const handleRestart = () => {
    if (confirm('确定要重新开始练习吗？这将清除所有进度。')) {
      PracticeManager.resetAllProgress()
      const resetQuestions = PracticeManager.initializePracticeQuestions(originalQuestions)
      setPracticeQuestions(resetQuestions)
      setCurrentQuestionIndex(0)
      setUserAnswers({})
      setShowAnswer(false)
      updateStats(resetQuestions)
    }
  }

  const getOptionLabel = (option: string) => {
    return option.charAt(0)
  }

  const getOptionText = (option: string) => {
    return option.substring(2)
  }

  const isOptionSelected = (option: string) => {
    const questionId = currentQuestion.id
    return userAnswers[questionId]?.includes(getOptionLabel(option)) || false
  }

  const isOptionCorrect = (option: string) => {
    return currentQuestion.answer.includes(getOptionLabel(option))
  }

  const getUserAnswerStatus = () => {
    if (!showAnswer) return null
    
    const userAnswer = userAnswers[currentQuestion.id]?.sort() || []
    const correctAnswer = currentQuestion.answer.sort()
    return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
  }

  if (!currentQuestion) {
    return <div>加载中...</div>
  }

  // 检查是否所有题目都已完成
  const allCompleted = PracticeManager.isAllCompleted(practiceQuestions)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 头部信息 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">顺序练习</h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const nextUncompletedIndex = PracticeManager.findFirstUnattemptedQuestionIndex(practiceQuestions)
                    if (nextUncompletedIndex !== currentQuestionIndex) {
                      setCurrentQuestionIndex(nextUncompletedIndex)
                      setShowAnswer(false)
                    }
                  }}
                  className="btn-secondary flex items-center"
                  disabled={allCompleted}
                >
                  <Target className="w-4 h-4 mr-2" />
                  跳转未完成
                </button>
                <button
                  onClick={handleRestart}
                  className="btn-secondary flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新开始
                </button>
              </div>
            </div>
            
            {/* 进度条 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  第 {currentQuestionIndex + 1} 题 / 共 {practiceQuestions.length} 题
                </span>
                <span className="text-sm text-gray-600">
                  正确率: {stats.correctRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>已完成: {stats.attempted}</span>
                <span>正确: {stats.correct}</span>
                <span>错误: {stats.incorrect}</span>
              </div>
            </div>
            
            {/* 完成提示 */}
            {allCompleted && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      🎉 恭喜！您已完成所有题目
                    </h3>
                    <p className="text-sm text-green-600 mt-1">
                      总正确率: {stats.correctRate}%
                      {stats.incorrect > 0 && (
                        <span className="ml-2">
                          还有 {stats.incorrect} 道错题可以重新练习
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 题目卡片 */}
          <div className="card mb-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                    {currentQuestion.type === 'multiple' ? '多选题' : 
                     currentQuestion.type === 'single' ? '单选题' : 
                     currentQuestion.type === 'indefinite' ? '不定项' : '判断题'}
                  </span>
                  {currentQuestion.attempted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已完成
                    </span>
                  )}
                </div>
                {currentQuestion.attempted && !currentQuestion.isCorrect && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    错题
                  </span>
                )}
              </div>
              <h2 className="text-lg font-medium text-gray-900 leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>

            {/* 选项 */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = isOptionSelected(option)
                const isCorrect = isOptionCorrect(option)
                const optionLabel = getOptionLabel(option)
                const optionText = getOptionText(option)
                
                let optionClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 "
                
                if (showAnswer) {
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
                    key={index}
                    onClick={() => handleAnswerSelect(optionLabel)}
                    disabled={showAnswer}
                    className={optionClass}
                  >
                    <div className="flex items-center">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium mr-3">
                        {optionLabel}
                      </span>
                      <span className="flex-1">{optionText}</span>
                      {showAnswer && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                      )}
                      {showAnswer && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-600 ml-2" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 答案状态 */}
            {showAnswer && (
              <div className="mt-6 p-4 rounded-lg bg-gray-50">
                <div className="flex items-center mb-2">
                  {getUserAnswerStatus() ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${getUserAnswerStatus() ? 'text-green-800' : 'text-red-800'}`}>
                    {getUserAnswerStatus() ? '回答正确' : '回答错误'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>正确答案：</strong>{currentQuestion.answer.join(', ')}</p>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一题
              </button>

              {!showAnswer ? (
                <button
                  onClick={handleSubmitAnswer}
                  className="btn-primary"
                >
                  提交答案
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === practiceQuestions.length - 1}
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一题
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
