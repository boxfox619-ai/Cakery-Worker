// bot.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Simple in-memory databases
const reviewsDB = {};   // { userId: { positive: 0, negative: 0 } }
const messageDB = {};   // { userId: { weekly: 0, allTime: 0 } }
const vcDB = {};        // { userId: { weeklySeconds: 0 } }
const pendingReviews = {}; // { reviewerId: { targetId, count } }

// Prefixes
const prefixes = ['.', '+', '-'];

// Helper functions
function getReviewScore(userId) {
  if (!reviewsDB[userId]) return 0;
  return (reviewsDB[userId].positive || 0) - (reviewsDB[userId].negative || 0);
}

function getTop10Leaderboard() {
  const arr = Object.keys(reviewsDB).map(id => ({
    id,
    score: getReviewScore(id)
  }));
  arr.sort((a,b)=>b.score-a.score);
  return arr.slice(0,10);
}

// On ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// On message
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // REVIEW COMMAND
  if (cmd === 'review') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('Please mention a user to review.');
    if (target.bot || target.id === message.author.id) return;

    const member = message.guild.members.cache.get(message.author.id);
    const isBooster = member.premiumSince || member.roles.cache.some(r => r.name === 'Booster');
    const reviewsAvailable = isBooster ? 5 : 1;

    // Confirmation message to reviewer
    message.reply(`You can give @${target.username} ${reviewsAvailable} review(s). ✅ to confirm, ❌ to cancel.`);

    // Store pending review
    pendingReviews[message.author.id] = {
      targetId: target.id,
      count: reviewsAvailable
    };
  }

  // SHOW OWN RANK
  if (cmd === 'reviews') {
    const score = getReviewScore(message.author.id);
    const leaderboard = Object.keys(reviewsDB)
      .map(id => ({ id, score: getReviewScore(id) }))
      .sort((a,b)=>b.score-a.score);
    const rank = leaderboard.findIndex(e => e.id===message.author.id)+1 || 'Unranked';
    message.reply(`🍰 ${message.author.username}\nReview Score: ${score}\nAll-Time Rank: #${rank}`);
  }
});

// Login
client.login(process.env.TOKEN);
