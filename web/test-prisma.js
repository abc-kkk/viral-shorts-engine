process.env.DATABASE_URL = "file:/Users/ios/Desktop/work-data/短剧项目/viral-shorts.db";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.findMany().then(res => { console.log("SUCCESS:", res.length); }).catch(console.error);
