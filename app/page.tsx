'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { BookOpen, Target, AlertTriangle, BarChart3, Upload, AlertCircle, TrendingUp } from 'lucide-react'
import { PracticeManager } from '@/utils/practiceManager'
import { DataSync } from '@/utils/dataSync'
import questionsData from '@/data/questions.json'

export default function HomePage() {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    practiceProgress: 0,
    correctRate: 0,
    examCount: 0,
    averageScore: 0,
    wrongQuestionsCount: 0
  })

  // 更新统计数据的函数
  const updateStats = () => {
    const originalQuestions = questionsData as any[]
    const practiceStats = DataSync.getRealTimeStats(originalQuestions)
    
    // 获取考试历史
    const examHistory = JSON.parse(localStorage.getItem('examHistory') || '{"results": []}')
    const examResults = examHistory.results || []
    const examCount = examResults.length
    const averageScore = examCount > 0 
      ? Math.round(examResults.reduce((sum: number, result: any) => sum + result.score, 0) / examCount)
      : 0

    setStats({
      totalQuestions: practiceStats.total,
      practiceProgress: practiceStats.attempted,
      correctRate: practiceStats.correctRate,
      examCount,
      averageScore,
      wrongQuestionsCount: practiceStats.incorrect
    })
  }

  useEffect(() => {
    // 初始加载统计数据
    updateStats()
    
    // 监听练习数据变化
    const cleanup = DataSync.addDataChangeListener(() => {
      updateStats()
    })
    
    return cleanup
  }, [])

  const quickActions = [
    {
      title: '开始练习',
      description: '按顺序练习题目，巩固基础知识',
      href: '/practice',
      icon: BookOpen,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: '模拟考试',
      description: '随机抽取100道题，模拟真实考试',
      href: '/exam',
      icon: Target,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: '错题本',
      description: '复习答错的题目，查漏补缺',
      href: '/wrong-questions',
      icon: AlertCircle,
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      title: '历史成绩',
      description: '查看历次模拟考试成绩',
      href: '/history',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: '导入题库',
      description: '导入Word文档格式的题库文件',
      href: '/import',
      icon: Upload,
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
  ]

  const statCards = [
    {
      title: '练习进度',
      value: `${stats.practiceProgress}/${stats.totalQuestions}`,
      description: '已练习题目数',
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: '正确率',
      value: `${stats.correctRate}%`,
      description: '练习正确率',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: '模拟考试',
      value: stats.examCount,
      description: '已完成次数',
      icon: Target,
      color: 'text-purple-600',
    },
    {
      title: '平均分',
      value: `${stats.averageScore}分`,
      description: '模拟考试平均分',
      icon: BarChart3,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              基本级执法资格考试练习系统
            </h1>
            <p className="mt-2 text-gray-600">
              在线练习与模拟考试平台，助您顺利通过执法资格考试
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => {
              const Icon = card.icon
              return (
                <div key={index} className="card">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${card.color} bg-opacity-10`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {card.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {card.value}
                      </p>
                      <p className="text-xs text-gray-500">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 快捷操作 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="group block"
                >
                  <div className="card hover:shadow-lg transition-shadow duration-200">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg text-white ${action.color} transition-colors duration-200`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                        {action.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* 错题提醒 */}
          {stats.wrongQuestionsCount > 0 && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800">
                  您有 <span className="font-semibold">{stats.wrongQuestionsCount}</span> 道错题需要复习
                </p>
                <Link
                  href="/wrong-questions"
                  className="ml-auto btn-primary text-sm"
                >
                  去复习
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
