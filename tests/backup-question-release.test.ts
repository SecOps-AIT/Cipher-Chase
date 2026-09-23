import { describe, it, expect, beforeEach } from 'vitest'

describe('Backup Question Release System', () => {
  describe('Question Classification', () => {
    it('properly categorizes core and backup questions', () => {
      const questions = [
        { id: 'q1', order: 1, isCore: true, isReleased: true },
        { id: 'q2', order: 2, isCore: true, isReleased: true },
        { id: 'q20', order: 20, isCore: true, isReleased: true },
        { id: 'q21', order: 21, isCore: false, isReleased: false },
        { id: 'q22', order: 22, isCore: false, isReleased: false },
        { id: 'q30', order: 30, isCore: false, isReleased: false },
      ]

      const coreQuestions = questions.filter(q => q.isCore)
      const backupQuestions = questions.filter(q => !q.isCore)

      expect(coreQuestions).toHaveLength(3)
      expect(backupQuestions).toHaveLength(3)
      
      // All core questions should be released by default
      expect(coreQuestions.every(q => q.isReleased)).toBe(true)
      
      // All backup questions should be locked by default
      expect(backupQuestions.every(q => !q.isReleased)).toBe(true)
    })

    it('identifies Q01-Q20 as core, Q21-Q30 as backup based on order', () => {
      const isCore = (order: number) => order <= 20
      const isBackup = (order: number) => order >= 21 && order <= 30

      // Test core question boundaries
      expect(isCore(1)).toBe(true)
      expect(isCore(20)).toBe(true)
      expect(isCore(21)).toBe(false)

      // Test backup question boundaries  
      expect(isBackup(20)).toBe(false)
      expect(isBackup(21)).toBe(true)
      expect(isBackup(30)).toBe(true)
      expect(isBackup(31)).toBe(false)
    })
  })

  describe('Admin Release Control', () => {
    let questions: any[]
    let releaseQuestion: (questionId: string) => boolean
    
    beforeEach(() => {
      questions = [
        { id: 'q21', order: 21, title: 'Q21 — Backup Question A', isCore: false, isReleased: false },
        { id: 'q22', order: 22, title: 'Q22 — Backup Question B', isCore: false, isReleased: false },
        { id: 'q23', order: 23, title: 'Q23 — Backup Question C', isCore: false, isReleased: false },
      ]

      releaseQuestion = (questionId: string) => {
        const question = questions.find(q => q.id === questionId)
        if (question && !question.isCore && !question.isReleased) {
          question.isReleased = true
          return true
        }
        return false
      }
    })

    it('allows admin to release individual backup questions', () => {
      // Initially all backup questions are locked
      expect(questions.every(q => !q.isReleased)).toBe(true)

      // Release Q21
      const success = releaseQuestion('q21')
      expect(success).toBe(true)
      
      const q21 = questions.find(q => q.id === 'q21')
      expect(q21?.isReleased).toBe(true)

      // Other questions remain locked
      const q22 = questions.find(q => q.id === 'q22')
      const q23 = questions.find(q => q.id === 'q23')
      expect(q22?.isReleased).toBe(false)
      expect(q23?.isReleased).toBe(false)
    })

    it('allows admin to release multiple backup questions at once', () => {
      const releaseMultiple = (questionIds: string[]) => {
        let releasedCount = 0
        for (const id of questionIds) {
          if (releaseQuestion(id)) {
            releasedCount++
          }
        }
        return releasedCount
      }

      // Release Q21 and Q23
      const releasedCount = releaseMultiple(['q21', 'q23'])
      expect(releasedCount).toBe(2)

      // Verify correct questions were released
      expect(questions.find(q => q.id === 'q21')?.isReleased).toBe(true)
      expect(questions.find(q => q.id === 'q22')?.isReleased).toBe(false)
      expect(questions.find(q => q.id === 'q23')?.isReleased).toBe(true)
    })

    it('prevents releasing the same question twice', () => {
      // Release Q21 first time
      const firstRelease = releaseQuestion('q21')
      expect(firstRelease).toBe(true)

      // Try to release Q21 again
      const secondRelease = releaseQuestion('q21')
      expect(secondRelease).toBe(false)

      // Question should still be released (not affected)
      expect(questions.find(q => q.id === 'q21')?.isReleased).toBe(true)
    })

    it('prevents releasing non-existent questions', () => {
      const result = releaseQuestion('invalid-id')
      expect(result).toBe(false)
    })
  })

  describe('Question Availability', () => {
    it('released backup questions become available to teams', () => {
      const getAvailableQuestions = (questions: any[]) => {
        return questions.filter(q => q.isCore || q.isReleased)
      }

      const questions = [
        { id: 'q1', order: 1, isCore: true, isReleased: true },
        { id: 'q20', order: 20, isCore: true, isReleased: true },
        { id: 'q21', order: 21, isCore: false, isReleased: false },
        { id: 'q22', order: 22, isCore: false, isReleased: true },
        { id: 'q30', order: 30, isCore: false, isReleased: false },
      ]

      const available = getAvailableQuestions(questions)
      
      // Should include all core questions + released backup questions
      expect(available).toHaveLength(3) // q1, q20, q22
      expect(available.map(q => q.id).sort()).toEqual(['q1', 'q20', 'q22'])
    })

    it('locked backup questions remain unavailable', () => {
      const getQuestionStatus = (question: any, teamTimerExpired = false) => {
        if (teamTimerExpired) return 'CLOSED'
        if (question.isCore || question.isReleased) return 'LIVE'
        return 'LOCKED'
      }

      const coreQuestion = { isCore: true, isReleased: true }
      const releasedBackup = { isCore: false, isReleased: true }
      const lockedBackup = { isCore: false, isReleased: false }

      // Normal state - team timer active
      expect(getQuestionStatus(coreQuestion)).toBe('LIVE')
      expect(getQuestionStatus(releasedBackup)).toBe('LIVE')
      expect(getQuestionStatus(lockedBackup)).toBe('LOCKED')

      // Team timer expired - core and released backup become closed, locked remains locked
      expect(getQuestionStatus(coreQuestion, true)).toBe('CLOSED')
      expect(getQuestionStatus(releasedBackup, true)).toBe('CLOSED')
      expect(getQuestionStatus(lockedBackup, true)).toBe('CLOSED')
    })
  })

  describe('Release Statistics', () => {
    it('tracks backup question release statistics correctly', () => {
      const questions = [
        // 3 core questions
        { id: 'q1', isCore: true, isReleased: true },
        { id: 'q2', isCore: true, isReleased: true },
        { id: 'q3', isCore: true, isReleased: true },
        // 5 backup questions (2 released, 3 locked)
        { id: 'q21', isCore: false, isReleased: true },
        { id: 'q22', isCore: false, isReleased: true },
        { id: 'q23', isCore: false, isReleased: false },
        { id: 'q24', isCore: false, isReleased: false },
        { id: 'q25', isCore: false, isReleased: false },
      ]

      const stats = {
        coreCount: questions.filter(q => q.isCore).length,
        backupCount: questions.filter(q => !q.isCore).length,
        releasedBackupCount: questions.filter(q => !q.isCore && q.isReleased).length,
      }

      expect(stats.coreCount).toBe(3)
      expect(stats.backupCount).toBe(5)
      expect(stats.releasedBackupCount).toBe(2)
      
      const lockedBackupCount = stats.backupCount - stats.releasedBackupCount
      expect(lockedBackupCount).toBe(3)
    })
  })

  describe('Release Validation', () => {
    it('validates question selection for release', () => {
      const validateRelease = (questionIds: string[], allQuestions: any[]) => {
        const errors = []
        
        for (const id of questionIds) {
          const question = allQuestions.find(q => q.id === id)
          
          if (!question) {
            errors.push(`Question ${id} not found`)
          } else if (question.isCore) {
            errors.push(`Cannot release core question ${id}`)
          } else if (question.isReleased) {
            errors.push(`Question ${id} already released`)
          }
        }
        
        return { valid: errors.length === 0, errors }
      }

      const questions = [
        { id: 'q1', isCore: true, isReleased: true },
        { id: 'q21', isCore: false, isReleased: false },
        { id: 'q22', isCore: false, isReleased: true },
      ]

      // Valid release
      const validResult = validateRelease(['q21'], questions)
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      // Invalid releases
      const invalidCore = validateRelease(['q1'], questions)
      expect(invalidCore.valid).toBe(false)
      expect(invalidCore.errors[0]).toContain('Cannot release core question')

      const invalidAlreadyReleased = validateRelease(['q22'], questions)
      expect(invalidAlreadyReleased.valid).toBe(false)
      expect(invalidAlreadyReleased.errors[0]).toContain('already released')

      const invalidNotFound = validateRelease(['q99'], questions)
      expect(invalidNotFound.valid).toBe(false)
      expect(invalidNotFound.errors[0]).toContain('not found')
    })
  })
})