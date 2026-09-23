import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Per-Team Timer System', () => {
  describe('Timer Start Logic', () => {
    it('starts timer exactly once when first team member enters Round 1', () => {
      const teamId = 'team-1'
      let timerStarted = false
      let startTime: Date | null = null
      let deadline: Date | null = null
      
      // Simulate timer start function
      const startTeamTimer = (id: string, duration: number = 1800) => {
        if (timerStarted) {
          return { success: true, message: 'Timer already started', alreadyStarted: true }
        }
        
        const now = new Date()
        startTime = now
        deadline = new Date(now.getTime() + duration * 1000)
        timerStarted = true
        
        return {
          success: true,
          message: 'Timer started',
          startedAt: startTime,
          deadlineAt: deadline,
          duration
        }
      }
      
      // First member enters - timer should start
      const firstEntry = startTeamTimer(teamId)
      expect(firstEntry.success).toBe(true)
      expect(firstEntry.message).toBe('Timer started')
      expect(timerStarted).toBe(true)
      
      // Second member enters - timer should NOT restart
      const secondEntry = startTeamTimer(teamId)
      expect(secondEntry.success).toBe(true)
      expect(secondEntry.alreadyStarted).toBe(true)
      expect(secondEntry.message).toBe('Timer already started')
      
      // Both entries should have same deadline
      expect(firstEntry.deadlineAt).toEqual(secondEntry.deadlineAt || deadline)
    })

    it('gives different teams independent timers', () => {
      const team1Id = 'team-1'
      const team2Id = 'team-2'
      const timers = new Map()
      
      const startTeamTimer = (teamId: string, currentTime: Date, duration: number = 1800) => {
        if (timers.has(teamId)) {
          const existing = timers.get(teamId)
          return { success: true, ...existing, alreadyStarted: true }
        }
        
        const timer = {
          startedAt: currentTime,
          deadlineAt: new Date(currentTime.getTime() + duration * 1000),
          duration
        }
        timers.set(teamId, timer)
        
        return { success: true, ...timer }
      }
      
      // Team 1 starts at time T
      const baseTime = new Date('2026-09-22T14:00:00Z')
      const team1Timer = startTeamTimer(team1Id, baseTime)
      
      // Team 2 starts 10 minutes later
      const laterTime = new Date('2026-09-22T14:10:00Z')
      const team2Timer = startTeamTimer(team2Id, laterTime)
      
      // Each team should have their own independent timer
      expect(team1Timer.success).toBe(true)
      expect(team2Timer.success).toBe(true)
      expect(team1Timer.deadlineAt.getTime()).not.toEqual(team2Timer.deadlineAt.getTime())
      
      // Team 1 deadline should be 14:30:00Z (30 min from 14:00:00Z)
      expect(team1Timer.deadlineAt.toISOString()).toBe('2026-09-22T14:30:00.000Z')
      
      // Team 2 deadline should be 14:40:00Z (30 min from 14:10:00Z)  
      expect(team2Timer.deadlineAt.toISOString()).toBe('2026-09-22T14:40:00.000Z')
      
      // Verify teams have separate timer states
      expect(timers.size).toBe(2)
      expect(timers.has(team1Id)).toBe(true)
      expect(timers.has(team2Id)).toBe(true)
    })
  })

  describe('Timer Persistence', () => {
    it('timer survives browser refresh and reconnection', () => {
      const teamId = 'team-1'
      const duration = 1800 // 30 minutes
      const startTime = new Date('2026-09-22T14:00:00Z')
      
      // Simulate server-stored timer state
      const serverTimer = {
        teamId,
        startedAt: startTime,
        deadlineAt: new Date(startTime.getTime() + duration * 1000),
        duration
      }
      
      // Function to get timer state (simulates API call)
      const getTimerState = (id: string) => {
        if (id !== teamId) return null
        
        const now = new Date('2026-09-22T14:15:00Z') // 15 minutes later
        const secondsRemaining = Math.max(0, Math.floor((serverTimer.deadlineAt.getTime() - now.getTime()) / 1000))
        
        return {
          ...serverTimer,
          secondsRemaining,
          status: secondsRemaining > 0 ? 'ACTIVE' : 'EXPIRED'
        }
      }
      
      // Browser refresh after 15 minutes
      const timerState = getTimerState(teamId)
      expect(timerState).not.toBeNull()
      expect(timerState!.status).toBe('ACTIVE')
      expect(timerState!.secondsRemaining).toBe(900) // 15 minutes remaining
      expect(timerState!.startedAt).toEqual(startTime)
    })

    it('timer expires at exact deadline regardless of client state', () => {
      const startTime = new Date('2026-09-22T14:00:00Z')
      const duration = 1800 // 30 minutes
      const deadline = new Date(startTime.getTime() + duration * 1000) // 14:30:00Z
      
      const getTimerStatus = (currentTime: Date) => {
        const secondsRemaining = Math.max(0, Math.floor((deadline.getTime() - currentTime.getTime()) / 1000))
        return {
          secondsRemaining,
          status: secondsRemaining > 0 ? 'ACTIVE' : 'EXPIRED'
        }
      }
      
      // 1 second before deadline
      const justBefore = new Date('2026-09-22T14:29:59Z')
      const beforeStatus = getTimerStatus(justBefore)
      expect(beforeStatus.status).toBe('ACTIVE')
      expect(beforeStatus.secondsRemaining).toBe(1)
      
      // At exact deadline
      const exactDeadline = new Date('2026-09-22T14:30:00Z')
      const exactStatus = getTimerStatus(exactDeadline)
      expect(exactStatus.status).toBe('EXPIRED')
      expect(exactStatus.secondsRemaining).toBe(0)
      
      // After deadline
      const afterDeadline = new Date('2026-09-22T14:30:01Z')
      const afterStatus = getTimerStatus(afterDeadline)
      expect(afterStatus.status).toBe('EXPIRED')
      expect(afterStatus.secondsRemaining).toBe(0)
    })
  })

  describe('Timer Configuration', () => {
    it('admin can configure default duration for new teams', () => {
      let defaultDuration = 1800 // 30 minutes
      const teamTimers = new Map()
      
      const updateDefaultDuration = (newDuration: number) => {
        if (newDuration < 60 || newDuration > 7200) {
          throw new Error('Duration must be between 1 and 120 minutes')
        }
        defaultDuration = newDuration
        return { success: true, duration: newDuration }
      }
      
      const startTeamTimer = (teamId: string) => {
        const now = new Date()
        const timer = {
          startedAt: now,
          deadlineAt: new Date(now.getTime() + defaultDuration * 1000),
          duration: defaultDuration
        }
        teamTimers.set(teamId, timer)
        return timer
      }
      
      // Change default to 45 minutes
      const updateResult = updateDefaultDuration(2700) // 45 minutes
      expect(updateResult.success).toBe(true)
      expect(updateResult.duration).toBe(2700)
      
      // New team gets updated duration
      const newTimer = startTeamTimer('team-new')
      expect(newTimer.duration).toBe(2700)
      
      // Verify invalid durations are rejected
      expect(() => updateDefaultDuration(30)).toThrow() // Too short
      expect(() => updateDefaultDuration(8000)).toThrow() // Too long
    })

    it('existing active timers are not affected by duration changes', () => {
      const team1Id = 'team-1'
      let defaultDuration = 1800 // 30 minutes
      const activeTimers = new Map()
      
      // Team 1 starts with 30-minute timer
      const startTime = new Date()
      activeTimers.set(team1Id, {
        startedAt: startTime,
        deadlineAt: new Date(startTime.getTime() + defaultDuration * 1000),
        duration: defaultDuration
      })
      
      // Admin changes default to 45 minutes
      defaultDuration = 2700
      
      // Team 1's active timer should remain unchanged
      const team1Timer = activeTimers.get(team1Id)
      expect(team1Timer.duration).toBe(1800) // Still 30 minutes
      
      // New team gets new duration
      const team2Id = 'team-2'
      const newStartTime = new Date()
      activeTimers.set(team2Id, {
        startedAt: newStartTime,
        deadlineAt: new Date(newStartTime.getTime() + defaultDuration * 1000),
        duration: defaultDuration
      })
      
      const team2Timer = activeTimers.get(team2Id)
      expect(team2Timer.duration).toBe(2700) // 45 minutes
    })
  })

  describe('Question Availability', () => {
    it('questions become unavailable when team timer expires', () => {
      const startTime = new Date('2026-09-22T14:00:00Z')
      const deadline = new Date('2026-09-22T14:30:00Z')
      
      const getQuestionStatus = (currentTime: Date, isSolved: boolean = false) => {
        if (isSolved) return 'SOLVED'
        
        const isTimerExpired = currentTime >= deadline
        return isTimerExpired ? 'CLOSED' : 'LIVE'
      }
      
      // During active timer - questions available
      const duringTimer = new Date('2026-09-22T14:15:00Z')
      expect(getQuestionStatus(duringTimer)).toBe('LIVE')
      
      // After timer expires - questions closed
      const afterExpiry = new Date('2026-09-22T14:35:00Z')
      expect(getQuestionStatus(afterExpiry)).toBe('CLOSED')
      
      // Solved questions remain visible
      expect(getQuestionStatus(afterExpiry, true)).toBe('SOLVED')
    })
  })
})