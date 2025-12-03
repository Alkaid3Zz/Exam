'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Calendar, Clock, TrendingUp, Award, BarChart3 } from 'lucide-react'
import { ExamHistory, ExamResult } from '@/types'

export default function HistoryPage() {
  const [examHistory, setExamHistory] = useState<ExamHistory>({ results: [] })
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null)

  useEffect(() => {
    // 从localStorage加载考试历史
    const savedHistory = localStorage.getItem('examHistory')
    if (savedHistory) {
      setExamHistory(JSON.parse(savedHistory))
    }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 80) return 'bg-blue-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const calculateStats = () => {
    if (examHistory.results.length === 0) {
      return {
        averageScore: 0,
        bestScore: 0,
        totalExams: 0,
        passRate: 0
      }
    }

    const scores = examHistory.results.map(result => result.score)
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    const bestScore = Math.max(...scores)
    const totalExams = examHistory.results.length
    const passCount = scores.filter(score => score >= 60).length
    const passRate = Math.round((passCount / totalExams) * 100)

    return {
      averageScore,
      bestScore,
      totalExams,
      passRate
    }
  }

  const stats = calculateStats()

  const clearHistory = () => {
    if (confirm('确定要清空所有考试记录吗？此操作不可恢复。')) {
      setExamHistory({ results: [] })
      localStorage.setItem('examHistory', JSON.stringify({ results: [] }))
      setSelectedResult(null)
    }
  }

  if (examHistory.results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">暂无考试记录</h1>
              <p className="text-gray-600 mb-6">完成模拟考试后，您的成绩将在这里显示</p>
              <a
                href="/exam"
                className="btn-primary"
              >
                开始模拟考试
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (selectedResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* 返回按钮 */}
            <button
              onClick={() => setSelectedResult(null)}
              className="mb-6 btn-secondary"
            >
              ← 返回历史记录
            </button>

            {/* 考试详情 */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">考试详情</h1>
              <p className="text-gray-600">考试时间：{formatDate(selectedResult.date)}</p>
            </div>

            {/* 成绩概览 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(selectedResult.score)}`}>
                  {selectedResult.score}分
                </div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {selectedResult.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">正确题数</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {selectedResult.totalQuestions - selectedResult.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">错误题数</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatTime(selectedResult.timeSpent)}
                </div>
                <div className="text-sm text-gray-600">用时</div>
              </div>
            </div>

            {/* 详细答题情况 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">详细答题情况</h3>
              <div className="space-y-6">
                {selectedResult.questions.map((question, index) => {
                  const userAnswer = selectedResult.userAnswers[question.id]?.sort() || []
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isCorrect ? '正确' : '错误'}
                            </span>
                          </div>
                          <p className="text-gray-900 mb-3">{question.question}</p>
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
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">历史成绩</h1>
              <p className="text-gray-600">
                共完成 {examHistory.results.length} 次模拟考试
              </p>
            </div>
            <button
              onClick={clearHistory}
              className="btn-secondary"
            >
              清空记录
            </button>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {stats.averageScore}分
                </div>
              </div>
              <div className="text-sm text-gray-600">平均分</div>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-6 h-6 text-green-600 mr-2" />
                <div className="text-2xl font-bold text-green-600">
                  {stats.bestScore}分
                </div>
              </div>
              <div className="text-sm text-gray-600">最高分</div>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalExams}次
                </div>
              </div>
              <div className="text-sm text-gray-600">考试次数</div>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-orange-600 mr-2" />
                <div className="text-2xl font-bold text-orange-600">
                  {stats.passRate}%
                </div>
              </div>
              <div className="text-sm text-gray-600">及格率</div>
            </div>
          </div>

          {/* 考试记录列表 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">考试记录</h3>
            <div className="space-y-4">
              {examHistory.results.map((result, index) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-4 ${getScoreBackground(result.score)}`}>
                      <span className={getScoreColor(result.score)}>
                        {result.score}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        第 {examHistory.results.length - index} 次考试
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(result.date)}
                        <Clock className="w-4 h-4 ml-4 mr-1" />
                        {formatTime(result.timeSpent)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {result.correctAnswers}/{result.totalQuestions} 题正确
                    </div>
                    <div className={`text-sm font-medium ${result.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.score >= 60 ? '及格' : '不及格'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
