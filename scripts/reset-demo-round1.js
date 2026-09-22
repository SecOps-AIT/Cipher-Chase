/**
 * Development Reset Script for Round 1 Demo Data
 * 
 * This script resets demo Round 1 data with fresh timestamps.
 * WARNING: Only use in development - never run against production!
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDemoRound1() {
  try {
    console.log('🔄 Resetting Round 1 demo data...');
    
    // Get the current time
    const now = new Date();
    
    // Clear existing team timers
    console.log('⏰ Clearing team timers...');
    await prisma.team.updateMany({
      data: {
        round1StartedAt: null,
        round1DeadlineAt: null,
        round1Duration: 1800, // 30 minutes default
      }
    });
    
    // Clear submissions and score events
    console.log('🗑️ Clearing submissions and score events...');
    await prisma.submission.deleteMany({});
    await prisma.scoreEvent.deleteMany({});
    
    // Reset team scores
    console.log('📊 Resetting team scores...');
    await prisma.team.updateMany({
      data: {
        score: 0,
        scoreReachedAt: null,
        qualified: false,
      }
    });
    
    // Update Round 1 status to LIVE
    console.log('🚀 Setting Round 1 to LIVE...');
    await prisma.round.updateMany({
      where: { number: 1 },
      data: {
        status: 'LIVE',
        startedAt: now,
        endedAt: null,
      }
    });
    
    // Update question timestamps with fresh batches
    const questions = await prisma.question.findMany({
      where: { 
        round: { number: 1 } 
      },
      orderBy: [{ batchNumber: 'asc' }, { order: 'asc' }]
    });
    
    console.log(`📝 Updating ${questions.length} questions with fresh timestamps...`);
    
    // Batch 1: Available immediately for 30 minutes
    const batch1Start = new Date(now.getTime());
    const batch1End = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
    
    // Batch 2: Available 30-60 minutes from now
    const batch2Start = new Date(now.getTime() + 30 * 60 * 1000);
    const batch2End = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Batch 3: Available 60-90 minutes from now
    const batch3Start = new Date(now.getTime() + 60 * 60 * 1000);
    const batch3End = new Date(now.getTime() + 90 * 60 * 1000);
    
    for (const question of questions) {
      let releaseAt, closeAt;
      
      switch (question.batchNumber) {
        case 1:
          releaseAt = batch1Start;
          closeAt = batch1End;
          break;
        case 2:
          releaseAt = batch2Start;
          closeAt = batch2End;
          break;
        case 3:
          releaseAt = batch3Start;
          closeAt = batch3End;
          break;
        default:
          releaseAt = batch1Start;
          closeAt = batch1End;
      }
      
      await prisma.question.update({
        where: { id: question.id },
        data: {
          releaseAt,
          closeAt,
          isActive: true,
        }
      });
      
      console.log(`  ✓ Q${question.order.toString().padStart(2, '0')} (Batch ${question.batchNumber}): ${releaseAt.toLocaleTimeString()} - ${closeAt.toLocaleTimeString()}`);
    }
    
    console.log('\n🎉 Round 1 demo data reset complete!');
    console.log(`📅 Batch Schedule:`);
    console.log(`   Batch 1: ${batch1Start.toLocaleTimeString()} - ${batch1End.toLocaleTimeString()} (LIVE NOW)`);
    console.log(`   Batch 2: ${batch2Start.toLocaleTimeString()} - ${batch2End.toLocaleTimeString()}`);
    console.log(`   Batch 3: ${batch3Start.toLocaleTimeString()} - ${batch3End.toLocaleTimeString()}`);
    console.log('\n🚀 Ready for testing! Visit http://localhost:3000/team/round-1');
    
  } catch (error) {
    console.error('❌ Error resetting Round 1 data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDemoRound1();