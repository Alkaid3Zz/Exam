import { PracticeManager } from './practiceManager'
import { Question } from '@/types'

export class DataSync {
  // 监听localStorage变化的事件
  static setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'practiceQuestions') {
        // 练习数据发生变化，通知所有页面更新
        window.dispatchEvent(new CustomEvent('practiceDataChanged'))
      }
    })
  }

  // 触发数据同步事件
  static triggerDataSync() {
    // 使用自定义事件通知所有组件数据已更新
    window.dispatchEvent(new CustomEvent('practiceDataChanged'))
    
    // 同时触发storage事件（用于跨标签页同步）
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'practiceQuestions',
      newValue: localStorage.getItem('practiceQuestions'),
      url: window.location.href
    }))
  }

  // 获取一致的统计数据
  static getConsistentStats(originalQuestions: Question[]) {
    const practiceQuestions = PracticeManager.initializePracticeQuestions(originalQuestions)
    return PracticeManager.getPracticeStats(practiceQuestions)
  }

  // 确保数据一致性
  static ensureDataConsistency(originalQuestions: Question[]) {
    // 重新初始化练习数据，确保与原始题库同步
    const practiceQuestions = PracticeManager.initializePracticeQuestions(originalQuestions)
    
    // 触发同步事件
    this.triggerDataSync()
    
    return practiceQuestions
  }

  // 添加数据变化监听器
  static addDataChangeListener(callback: () => void) {
    const handler = () => {
      callback()
    }
    
    window.addEventListener('practiceDataChanged', handler)
    
    // 返回清理函数
    return () => {
      window.removeEventListener('practiceDataChanged', handler)
    }
  }

  // 批量更新题目状态
  static batchUpdateQuestionStatus(updates: Array<{ id: number, isCorrect: boolean }>) {
    updates.forEach(update => {
      PracticeManager.updateQuestionStatus(update.id, update.isCorrect)
    })
    
    // 触发同步
    this.triggerDataSync()
  }

  // 获取实时统计数据（用于所有页面）
  static getRealTimeStats(originalQuestions: Question[]) {
    return this.getConsistentStats(originalQuestions)
  }
}
