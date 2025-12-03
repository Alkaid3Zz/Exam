'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { Clock, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'
import { Question, ExamResult, ExamHistory } from '@/types'
import questionsData from '@/data/questions.json'
import { ClientQuestionManager } from '@/utils/clientQuestionManager'

export default function ExamPage() {
  const router = useRouter()
  const [allQuestions] = useState<Question[]>(questionsData as Question[])
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({})
  const [timeLeft, setTimeLeft] = useState(7200) // 2小时 = 7200秒
  const [examStarted, setExamStarted] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)

  // 检查题库变化
  useEffect(() => {
    const updatedProgress = ClientQuestionManager.checkAndUpdateProgress(allQuestions)
    if (updatedProgress) {
      alert('题库已更新，模拟考试将使用最新的题库内容。')
    }
  }, [allQuestions])

  // 生成随机试卷
  const generateExam = () => {
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random())
    const selectedQuestions = shuffled.slice(0, Math.min(10, allQuestions.length)) // 使用10道题进行演示
    setExamQuestions(selectedQuestions)
    setExamStarted(true)
    setTimeLeft(7200)
  }

  // 计时器
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (examStarted && !examFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStarted, examFinished, timeLeft])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerSelect = (option: string) => {
    const currentQuestion = examQuestions[currentQuestionIndex]
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

  const handleSubmitExam = () => {
    if (!confirm('确定要交卷吗？')) {
      return
    }

    setExamFinished(true)
    
    // 计算成绩
    let correctCount = 0
    examQuestions.forEach(question => {
      const userAnswer = userAnswers[question.id]?.sort() || []
      const correctAnswer = question.answer.sort()
      if (JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / examQuestions.length) * 100)
    const timeSpent = 7200 - timeLeft

    const result: ExamResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score,
      totalQuestions: examQuestions.length,
      correctAnswers: correctCount,
      timeSpent,
      questions: examQuestions,
      userAnswers
    }

    setExamResult(result)

    // 保存到历史记录
    const examHistory = JSON.parse(localStorage.getItem('examHistory') || '{"results": []}')
    examHistory.results.push(result)
    localStorage.setItem('examHistory', JSON.stringify(examHistory))
  }

  const getOptionLabel = (option: string) => {
    return option.charAt(0)
  }

  const getOptionText = (option: string) => {
    return option.substring(2)
  }

  const isOptionSelected = (option: string) => {
    const currentQuestion = examQuestions[currentQuestionIndex]
    const questionId = currentQuestion?.id
    return userAnswers[questionId]?.includes(getOptionLabel(option)) || false
  }

  const getQuestionStatus = (questionIndex: number) => {
    const question = examQuestions[questionIndex]
    const hasAnswer = userAnswers[question.id] && userAnswers[question.id].length > 0
    return hasAnswer ? 'answered' : 'unanswered'
  }

  // 如果考试还未开始
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">模拟考试</h1>
              <div className="card max-w-2xl mx-auto">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">考试说明</h2>
                  <div className="text-left space-y-2 mb-6">
                    <p>• 本次模拟考试共 {Math.min(10, allQuestions.length)} 道题</p>
                    <p>• 考试时间：2小时</p>
                    <p>• 题型包括：单选题、多选题、判断题、不定项选择题</p>
                    <p>• 考试开始后不能暂停，请确保有足够时间</p>
                    <p>• 交卷后将显示详细的成绩报告</p>
                  </div>
                  <button
                    onClick={generateExam}
                    className="btn-primary text-lg px-8 py-3"
                  >
                    开始考试
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 如果考试已结束，显示成绩
  if (examFinished && examResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">考试结果</h1>
              <p className="text-gray-600">考试已完成，以下是您的成绩报告</p>
            </div>

            {/* 成绩概览 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {examResult.score}分
                </div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {examResult.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">正确题数</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {examResult.totalQuestions - examResult.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">错误题数</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatTime(examResult.timeSpent)}
                </div>
                <div className="text-sm text-gray-600">用时</div>
              </div>
            </div>

            {/* 详细答题情况 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">详细答题情况</h3>
              <div className="space-y-6">
                {examResult.questions.map((question, index) => {
                  const userAnswer = examResult.userAnswers[question.id]?.sort() || []
                  const correctAnswer = question.answer.sort()
                  const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
                  
                  return (
                    <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start mb-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                              {question.type === 'multiple' ? '多选题' : 
                               question.type === 'single' ? '单选题' : 
                               question.type === 'indefinite' ? '不定项' : '判断题'}
                            </span>
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <p className="text-gray-900 mb-3">{question.question}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            {question.options.map((option, optionIndex) => {
                              const optionLabel = getOptionLabel(option)
                              const optionText = getOptionText(option)
                              const isUserSelected = userAnswer.includes(optionLabel)
                              const isCorrectOption = correctAnswer.includes(optionLabel)
                              
                              let optionClass = "p-2 rounded text-sm "
                              if (isCorrectOption) {
                                optionClass += "bg-green-100 text-green-800"
                              } else if (isUserSelected && !isCorrectOption) {
                                optionClass += "bg-red-100 text-red-800"
                              } else {
                                optionClass += "bg-gray-50 text-gray-600"
                              }
                              
                              return (
                                <div key={optionIndex} className={optionClass}>
                                  <span className="font-medium">{optionLabel}.</span> {optionText}
                                  {isUserSelected && (
                                    <span className="ml-2 text-xs">(您的答案)</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <div className="text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">正确答案：</span>{correctAnswer.join(', ')}
                            </p>
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">您的答案：</span>{userAnswer.length > 0 ? userAnswer.join(', ') : '未作答'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={() => {
                  setExamStarted(false)
                  setExamFinished(false)
                  setExamResult(null)
                  setUserAnswers({})
                  setCurrentQuestionIndex(0)
                }}
                className="btn-primary"
              >
                重新考试
              </button>
              <button
                onClick={() => router.push('/history')}
                className="btn-secondary"
              >
                查看历史成绩
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 正在考试中
  const currentQuestion = examQuestions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 考试头部 */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">模拟考试进行中</h1>
                <p className="text-sm text-gray-600">
                  第 {currentQuestionIndex + 1} 题 / 共 {examQuestions.length} 题
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-red-600 mr-2" />
                  <span className={`font-mono text-lg ${timeLeft < 600 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <button
                  onClick={handleSubmitExam}
                  className="btn-primary"
                >
                  交卷
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 题目区域 */}
            <div className="lg:col-span-3">
              <div className="card">
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {currentQuestion.type === 'multiple' ? '多选题' : 
                       currentQuestion.type === 'single' ? '单选题' : 
                       currentQuestion.type === 'indefinite' ? '不定项' : '判断题'}
                    </span>
                  </div>
                  <h2 className="text-lg font-medium text-gray-900 leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>

                {/* 选项 */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = isOptionSelected(option)
                    const optionLabel = getOptionLabel(option)
                    const optionText = getOptionText(option)
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(optionLabel)}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary-50 border-primary-200 text-primary-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium mr-3">
                            {optionLabel}
                          </span>
                          <span className="flex-1">{optionText}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* 导航按钮 */}
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一题
                  </button>
                  <button
                    onClick={() => setCurrentQuestionIndex(Math.min(examQuestions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === examQuestions.length - 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一题
                  </button>
                </div>
              </div>
            </div>

            {/* 答题卡 */}
            <div className="lg:col-span-1">
              <div className="card sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">答题卡</h3>
                <div className="grid grid-cols-5 gap-2">
                  {examQuestions.map((_, index) => {
                    const status = getQuestionStatus(index)
                    const isCurrent = index === currentQuestionIndex
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          isCurrent
                            ? 'bg-primary-600 text-white'
                            : status === 'answered'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary-600 rounded mr-2"></div>
                    <span>当前题目</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                    <span>已作答</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-2"></div>
                    <span>未作答</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
