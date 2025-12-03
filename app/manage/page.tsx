'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Database, Download, Upload, RotateCcw, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'
import { Question } from '@/types'
import questionsData from '@/data/questions.json'
import { PracticeManager } from '@/utils/practiceManager'

export default function ManagePage() {
  const [questions] = useState<Question[]>(questionsData as Question[])
  const [statistics, setStatistics] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    completed: 0,
    correctRate: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    // 初始化练习题库并获取统计信息
    const practiceQuestions = PracticeManager.initializePracticeQuestions(questions)
    const stats = PracticeManager.getPracticeStats(practiceQuestions)
    
    // 计算题型分布
    const byType = questions.reduce((acc, q) => {
      const typeName = q.type === 'multiple' ? '多选题' : 
                      q.type === 'single' ? '单选题' : 
                      q.type === 'indefinite' ? '不定项' : '判断题'
      acc[typeName] = (acc[typeName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    setStatistics({
      total: stats.total,
      byType,
      completed: stats.attempted,
      correctRate: stats.correctRate
    })
  }, [questions])

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3000)
  }

  const handleExportUserData = () => {
    try {
      // 导出练习数据和考试历史
      const practiceData = PracticeManager.getSavedQuestions()
      const examHistory = localStorage.getItem('examHistory')
      
      const exportData = {
        practiceQuestions: practiceData,
        examHistory: examHistory ? JSON.parse(examHistory) : null,
        exportTime: new Date().toISOString()
      }
      
      const jsonData = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `practice_data_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showMessage('练习数据导出成功', 'success')
    } catch (error) {
      showMessage('导出失败', 'error')
    }
  }

  const handleImportUserData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string
        const data = JSON.parse(jsonData)
        
        if (data.practiceQuestions) {
          localStorage.setItem('practiceQuestions', JSON.stringify(data.practiceQuestions))
        }
        
        if (data.examHistory) {
          localStorage.setItem('examHistory', JSON.stringify(data.examHistory))
        }
        
        showMessage('练习数据导入成功，页面将刷新', 'success')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (error) {
        showMessage('导入失败，文件格式错误', 'error')
      }
    }
    reader.readAsText(file)
  }

  const handleResetProgress = () => {
    if (!confirm('确定要重置所有练习进度吗？此操作不可恢复！')) {
      return
    }

    try {
      PracticeManager.resetAllProgress()
      localStorage.removeItem('examHistory')
      showMessage('练习进度已重置，页面将刷新', 'success')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      showMessage('重置失败', 'error')
    }
  }

  const handleCheckQuestionBank = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/questions/sync')
      if (response.ok) {
        const data = await response.json()
        showMessage(`题库检查完成，当前版本：${data.versionInfo.version}`, 'success')
      } else {
        showMessage('检查题库失败', 'error')
      }
    } catch (error) {
      showMessage('检查题库失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">题库管理</h1>
            <p className="text-gray-600">
              管理题库数据和用户进度，查看统计信息
            </p>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              messageType === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {message}
            </div>
          )}

          {/* 题库统计 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">题库总数</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.completed}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">正确率</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.correctRate}%</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">进度</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total > 0 ? Math.round((statistics.completed / statistics.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 题型分布 */}
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">题型分布</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statistics.byType).map(([type, count]) => (
                <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 管理操作 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 数据管理 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">数据管理</h3>
              <div className="space-y-4">
                <button
                  onClick={handleExportUserData}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出用户数据
                </button>
                
                <div>
                  <label className="w-full btn-primary flex items-center justify-center cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    导入用户数据
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportUserData}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  onClick={handleResetProgress}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置所有进度
                </button>
              </div>
            </div>

            {/* 题库管理 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">题库管理</h3>
              <div className="space-y-4">
                <button
                  onClick={handleCheckQuestionBank}
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {isLoading ? '检查中...' : '检查题库状态'}
                </button>

                <div className="text-sm text-gray-600 space-y-2">
                  <p>• 题库文件：data/questions.json</p>
                  <p>• 当前题目数量：{statistics.total}</p>
                  <p>• 支持格式：多选题、单选题、判断题、不定项</p>
                </div>
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="card mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>数据导出：</strong>将您的练习进度、考试记录等数据导出为JSON文件，可用于备份或迁移。</p>
              <p><strong>数据导入：</strong>从之前导出的JSON文件中恢复您的练习数据。</p>
              <p><strong>重置进度：</strong>清除所有练习进度和考试记录，重新开始。</p>
              <p><strong>题库检查：</strong>检查题库文件的状态和版本信息。</p>
              <p><strong>自动同步：</strong>当题库更新时，系统会自动调整您的练习进度以适应新的题库内容。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
