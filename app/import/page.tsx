'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { Question } from '@/types'
import { QuestionParser, ProgressCallback } from '@/utils/questionParser'
import questionsData from '@/data/questions.json'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('请选择Word文档文件（.docx格式）')
        setFile(null)
      }
    }
  }

  const parseContent = async (text: string) => {
    const existingQuestions = questionsData as Question[]
    
    const onProgress: ProgressCallback = (progress, message) => {
      setProgress(progress)
      setProgressText(message)
    }
    
    const result = await QuestionParser.parseTextWithProgress(text, existingQuestions, onProgress)
    
    setParsedQuestions(result.questions)
    setErrors(result.errors)
    setWarnings(result.warnings)
    
    if (result.questions.length > 0) {
      setSuccess(`成功解析出 ${result.questions.length} 道题目`)
      setError('')
    } else {
      setError('未能解析出有效题目，请检查格式')
      setSuccess('')
    }
    
    // 重置进度条
    setTimeout(() => {
      setProgress(0)
      setProgressText('')
    }, 1500)
  }

  const handleImport = async () => {
    if (!file) {
      setError('请先选择文件')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')
    setProgress(0)
    setProgressText('')

    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer()
      
      // 这里使用简化的文本提取方法
      // 在实际应用中，您可能需要使用专门的库来解析Word文档
      const decoder = new TextDecoder('utf-8')
      let text = decoder.decode(arrayBuffer)
      
      // 简单的文本清理
      text = text.replace(/[^\x20-\x7E\u4e00-\u9fa5]/g, ' ')
      text = text.replace(/\s+/g, ' ')
      
      // 如果直接解析失败，提示用户复制粘贴
      if (!text.includes('多选题') && !text.includes('单选题') && !text.includes('判断题')) {
        setError('无法直接解析Word文件，请将内容复制到下方文本框中')
        setProgress(0)
        setProgressText('')
        setIsProcessing(false)
        return
      }

      await parseContent(text)
    } catch (err) {
      setError('文件解析失败，请检查文件格式或尝试复制粘贴方式')
    } finally {
      setIsProcessing(false)
    }
  }

  const [textInput, setTextInput] = useState('')

  const handleTextImport = async () => {
    if (!textInput.trim()) {
      setError('请输入题目内容')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')
    setProgress(0)
    setProgressText('')

    try {
      await parseContent(textInput)
    } catch (err) {
      setError('内容解析失败，请检查格式')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveQuestions = () => {
    if (parsedQuestions.length === 0) return

    // 下载JSON文件
    const jsonContent = JSON.stringify(parsedQuestions, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imported_questions.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess('题目已导出为JSON文件')
  }

  const handleSyncToQuestionBank = async () => {
    if (parsedQuestions.length === 0) return

    try {
      setIsProcessing(true)
      setProgress(10)
      setProgressText('正在同步到题库...')

      // 调用API同步题目到questions.json
      const response = await fetch('/api/questions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: parsedQuestions,
          action: 'add' // 添加到现有题库
        })
      })

      setProgress(50)
      setProgressText('正在处理题库数据...')

      if (!response.ok) {
        throw new Error('同步失败')
      }

      const result = await response.json()
      
      setProgress(100)
      setProgressText('同步完成！')

      setSuccess(`成功同步 ${parsedQuestions.length} 道题目到题库，当前题库共 ${result.totalQuestions} 道题目`)
      
      // 清空已解析的题目
      setParsedQuestions([])
      
      // 提示用户刷新页面以获取最新题库
      setTimeout(() => {
        if (confirm('题库已更新，是否刷新页面以获取最新题库？')) {
          window.location.reload()
        }
      }, 1000)

    } catch (err) {
      setError('同步到题库失败：' + (err as Error).message)
    } finally {
      setIsProcessing(false)
      setTimeout(() => {
        setProgress(0)
        setProgressText('')
      }, 1500)
    }
  }

  const handleReplaceQuestionBank = async () => {
    if (parsedQuestions.length === 0) return

    if (!confirm(`确定要用新导入的 ${parsedQuestions.length} 道题目替换整个题库吗？此操作不可恢复！`)) {
      return
    }

    try {
      setIsProcessing(true)
      setProgress(10)
      setProgressText('正在替换题库...')

      // 调用API替换整个题库
      const response = await fetch('/api/questions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: parsedQuestions,
          action: 'replace' // 替换整个题库
        })
      })

      setProgress(50)
      setProgressText('正在处理题库数据...')

      if (!response.ok) {
        throw new Error('替换失败')
      }

      const result = await response.json()
      
      setProgress(100)
      setProgressText('替换完成！')

      setSuccess(`成功替换题库，当前题库共 ${result.totalQuestions} 道题目`)
      
      // 清空已解析的题目
      setParsedQuestions([])
      
      // 提示用户刷新页面
      setTimeout(() => {
        if (confirm('题库已完全替换，所有练习进度将被重置。是否刷新页面？')) {
          // 清除本地进度
          localStorage.removeItem('userProgress')
          localStorage.removeItem('examHistory')
          window.location.reload()
        }
      }, 1000)

    } catch (err) {
      setError('替换题库失败：' + (err as Error).message)
    } finally {
      setIsProcessing(false)
      setTimeout(() => {
        setProgress(0)
        setProgressText('')
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">导入题库</h1>
            <p className="text-gray-600">
              支持导入Word文档格式的题库文件，自动转换为JSON格式
            </p>
          </div>

          {/* 文件上传区域 */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">方式一：上传Word文档</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="mb-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="btn-primary">选择Word文件</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
              {file && (
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-2" />
                  {file.name}
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4">
                <div className="text-center mb-4">
                  <button
                    onClick={handleImport}
                    disabled={isProcessing}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isProcessing ? '解析中...' : '开始解析'}
                  </button>
                </div>
                
                {/* 进度条 */}
                {isProcessing && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-blue-700 font-medium">{progressText}</span>
                      <span className="text-blue-600 font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                      </div>
                    </div>
                    {progress === 100 && (
                      <div className="flex items-center justify-center mt-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-green-600 text-sm font-medium">解析完成</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 文本输入区域 */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">方式二：复制粘贴内容</h3>
            <p className="text-sm text-gray-600 mb-4">
              如果Word文件无法直接解析，请将内容复制粘贴到下方文本框中
            </p>
            
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="请粘贴题目内容..."
              className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="mt-4">
              <div className="text-center mb-4">
                <button
                  onClick={handleTextImport}
                  disabled={isProcessing || !textInput.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {isProcessing ? '解析中...' : '解析内容'}
                </button>
              </div>
              
              {/* 进度条 */}
              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-blue-700 font-medium">{progressText}</span>
                    <span className="text-blue-600 font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  {progress === 100 && (
                    <div className="flex items-center justify-center mt-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-green-600 text-sm font-medium">解析完成</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 格式说明 */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">支持的格式示例</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap text-gray-700">
{`一、多选题
1. 题目内容（     ）
A.选项1
B.选项2
C.选项3
D.选项4
正确答案：ABC

二、单选题
1. 题目内容（     ）
A.选项1
B.选项2
正确答案：A

三、判断题
1. 题目内容
正确答案：Y（Y表示正确，N表示错误）

四、不定项
1. 题目内容（     ）
A.选项1
B.选项2
C.选项3
D.选项4
正确答案：A

五、习近平法治思想之单选题
1. 题目内容
A.选项1
B.选项2
正确答案：B

六、习近平法治思想之判断题
1. 题目内容
正确答案：Y（Y表示正确，N表示错误）`}
              </pre>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* 详细错误列表 */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-medium text-red-700">解析错误：</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((err, index) => (
                  <li key={index}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 警告提示 */}
          {warnings.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-700">注意事项：</span>
              </div>
              <ul className="text-sm text-yellow-600 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* 解析结果 */}
          {parsedQuestions.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  解析结果 ({parsedQuestions.length} 道题目)
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={handleSaveQuestions}
                    className="btn-secondary flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出JSON
                  </button>
                  <button
                    onClick={handleSyncToQuestionBank}
                    disabled={isProcessing}
                    className="btn-primary disabled:opacity-50"
                  >
                    同步到题库
                  </button>
                  <button
                    onClick={handleReplaceQuestionBank}
                    disabled={isProcessing}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    替换题库
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parsedQuestions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                        {question.type === 'multiple' ? '多选题' : 
                         question.type === 'single' ? '单选题' : 
                         question.type === 'indefinite' ? '不定项' : '判断题'}
                      </span>
                      <span className="text-sm text-gray-600">题目 {question.id}</span>
                    </div>
                    <p className="text-gray-900 mb-2">{question.question}</p>
                    <div className="text-sm text-gray-600 mb-2">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex}>{option}</div>
                      ))}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-green-600">
                        正确答案：{question.answer.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
