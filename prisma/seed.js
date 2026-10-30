require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed into `club.db` database...');

  // 1. Seed Users with simple testing credentials (password: 12345678)
  const passwordHash = await bcrypt.hash('12345678', 10);
  const seedUsers = [
    { id: 'usr-superadmin', email: 'superadmin@gmail.com', name: 'Super Admin', role: 'SUPER_ADMIN', phone: '(800) 555-0192', stateCode: 'TX', clubId: 'club-1' },
    { id: 'usr-nationaladmin', email: 'nationaladmin@gmail.com', name: 'National Admin', role: 'NATIONAL_ADMIN', phone: '(800) 555-0101', stateCode: 'TX', clubId: 'club-1' },
    { id: 'usr-stateadmin', email: 'stateadmin@gmail.com', name: 'State Admin', role: 'STATE_ADMIN', phone: '(865) 555-0100', stateCode: 'TN', clubId: 'club-1' },
    { id: 'usr-clubadmin', email: 'clubadmin@gmail.com', name: 'Club Admin', role: 'CLUB_ADMIN', phone: '(865) 555-0192', stateCode: 'TN', clubId: 'club-1' },
    { id: 'usr-eventadmin', email: 'eventadmin@gmail.com', name: 'Event Admin', role: 'EVENT_ADMIN', phone: '(865) 555-0155', stateCode: 'TN', clubId: 'club-1' },
    { id: 'usr-memberuser', email: 'member@gmail.com', name: 'Member User', role: 'MEMBER', phone: '(865) 555-0199', stateCode: 'TN', clubId: 'club-1' },
    { id: 'usr-demo', email: 'demo@example.com', name: 'Demo Super Admin', role: 'SUPER_ADMIN', phone: '(800) 555-0192', stateCode: 'TX', clubId: 'club-1' }
  ];

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone, stateCode: u.stateCode, clubId: u.clubId, passwordHash },
      create: { ...u, passwordHash }
    });
  }

  // 2. Seed State Associations
  const states = [
    { id: 'tx', name: 'Texas Hound Association', code: 'TX', organizations: 'UKC,PKC', adminName: 'Austin Sterling', clubsCount: 54, membersCount: 3920, eventsCount: 7, revenue: 245000 },
    { id: 'al', name: 'Alabama State Association', code: 'AL', organizations: 'UKC', adminName: 'Marcus Vance', clubsCount: 15, membersCount: 950, eventsCount: 4, revenue: 45000 },
    { id: 'ak', name: 'Alaska State Association', code: 'AK', organizations: 'PKC', adminName: 'Cody Campbell', clubsCount: 8, membersCount: 420, eventsCount: 2, revenue: 18000 },
    { id: 'az', name: 'Arizona State Association', code: 'AZ', organizations: 'UKC,PKC', adminName: 'Frank Reynolds', clubsCount: 18, membersCount: 1100, eventsCount: 5, revenue: 62000 },
    { id: 'ar', name: 'Arkansas State Association', code: 'AR', organizations: 'UKC', adminName: 'Dominic Rossi', clubsCount: 36, membersCount: 2240, eventsCount: 6, revenue: 115000 },
    { id: 'ca', name: 'California State Association', code: 'CA', organizations: 'PKC', adminName: 'Elena Rostova', clubsCount: 31, membersCount: 1980, eventsCount: 5, revenue: 98000 },
    { id: 'tn', name: 'Tennessee State Association', code: 'TN', organizations: 'UKC,PKC', adminName: 'Robert Miller', clubsCount: 42, membersCount: 2890, eventsCount: 8, revenue: 185000 }
  ];

  for (const s of states) {
    await prisma.stateAssociation.upsert({
      where: { code: s.code },
      update: s,
      create: s
    });
  }

  // 3. Seed Local Clubs
  const clubs = [
    { id: 'club-1', name: 'Oak Ridge Hunting Club', city: 'Knoxville', county: 'Knox County', state: 'Tennessee', stateCode: 'TN', stateId: 'tn', zip: '37901', distanceMiles: 18, dogType: 'Treeing Walker Coonhound', federation: 'UKC (United Kennel Club)', eventType: 'Nite Hunt', membersCount: 84, eventsCount: 6, entriesCount: 217, revenue: 6790, adminName: 'Robert Miller' },
    { id: 'club-2', name: 'Cumberland Mountain Club', city: 'Middlesboro', county: 'Bell County', state: 'Kentucky', stateCode: 'KY', stateId: 'ky', zip: '40965', distanceMiles: 64, dogType: 'English Redtick Coonhound', federation: 'AKC (American Kennel Club)', eventType: 'Water Race', membersCount: 96, eventsCount: 8, entriesCount: 304, revenue: 8940, adminName: 'Thomas Shelby' },
    { id: 'club-tx-central', name: 'Central Texas Hound Club', city: 'Waco', county: 'McLennan County', state: 'Texas', stateCode: 'TX', stateId: 'tx', zip: '76701', distanceMiles: 20, dogType: 'Treeing Walker Coonhound', federation: 'Independent', eventType: 'Bench Show', membersCount: 82, eventsCount: 6, entriesCount: 225, revenue: 8700, adminName: 'Caleb Vance' }
  ];

  for (const c of clubs) {
    await prisma.localClub.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }

  // 4. Seed Events
  const events = [
    { id: 'evt-1', name: 'Nite Hunt & Treeing Contest', federation: 'UKC (United Kennel Club)', sport: 'Coonhounds', type: 'Nite Hunt', club: 'Oak Ridge Hunting Club', clubId: 'club-1', state: 'Tennessee', stateCode: 'TN', city: 'Knoxville', date: 'September 19, 2026', fee: 30.0, entriesCount: 43, maxCapacity: 50, status: 'Registration Open' },
    { id: 'evt-2', name: 'Fall Championship Hunt', federation: 'PKC (Professional Kennel Club)', sport: 'Coonhounds', type: 'Championship Hunt', club: 'Oak Ridge Hunting Club', clubId: 'club-1', state: 'Tennessee', stateCode: 'TN', city: 'Knoxville', date: 'October 24, 2026', fee: 45.0, entriesCount: 28, maxCapacity: 60, status: 'Registration Open' }
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: e,
      create: e
    });
  }

  console.log('✅ All project tables created & seeded successfully into `club.db`!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
