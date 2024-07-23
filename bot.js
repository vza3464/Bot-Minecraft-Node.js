const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Замените на ваш Discord токен
const DISCORD_TOKEN = 'ENTER_YOUR_DISCORD_BOT_TOKEN';

let bot;  // Переменная для бота Minecraft
let botName;
let serverIp;
let serverPort;
let chatLog = [];  // Переменная для хранения чата с сервера Minecraft

client.once('ready', () => {
  console.log(`Discord бот запущен как ${client.user.tag}`);
  const channel = client.channels.cache.find(channel => channel.isTextBased());
  if (channel) {
    channel.send('Ожидаю имя для бота Minecraft:');
  }
});

client.on('messageCreate', message => {
  // Игнорируем сообщения от других ботов
  if (message.author.bot) return;

  const content = message.content.trim();

  if (!botName && !content.startsWith('/')) {
    botName = content;
    message.channel.send(`Имя для бота установлено: ${botName}. Теперь введите команду для подключения в формате /connect ip:port`);
    return;
  }

  if (content.startsWith('/connect')) {
    const args = content.split(' ')[1];
    if (!args) {
      message.channel.send('Использование: /connect ip:port. Попробуйте еще раз.');
      return;
    }
    const [ip, port] = args.split(':');
    if (!ip || !port || isNaN(parseInt(port))) {
      message.channel.send('Некорректный формат. Использование: /connect ip:port. Попробуйте еще раз.');
      return;
    }

    serverIp = ip;
    serverPort = parseInt(port);

    message.channel.send(`Попытка подключения к серверу ${serverIp}:${serverPort} с именем ${botName}...`);

    connectToServer(serverIp, serverPort, botName, message.channel);
  }

  if (content.startsWith('/send')) {
    const command = content.substring(6);  // Извлекаем команду после "/send "
    if (bot) {
      bot.chat(command);
      message.channel.send(`Команда "${command}" отправлена на сервер Minecraft.`);
    } else {
      message.channel.send('Бот Minecraft не подключен к серверу.');
    }
  }

  if (content.startsWith('/check')) {
    if (chatLog.length === 0) {
      message.channel.send('Чат на сервере Minecraft пуст.');
    } else {
      message.channel.send('Последние сообщения на сервере Minecraft:\n' + chatLog.join('\n'));
    }
  }

  if (content.startsWith('/reuser')) {
    const newBotName = content.split(' ')[1];
    if (!newBotName) {
      message.channel.send('Использование: /reuser новое_имя. Попробуйте еще раз.');
      return;
    }

    botName = newBotName;
    message.channel.send(`Новое имя для бота установлено: ${botName}. Переподключение к серверу ${serverIp}:${serverPort}...`);

    connectToServer(serverIp, serverPort, botName, message.channel);
  }

  if (content.startsWith('/reserver')) {
    const args = content.split(' ')[1];
    if (!args) {
      message.channel.send('Использование: /reserver ip:port. Попробуйте еще раз.');
      return;
    }
    const [ip, port] = args.split(':');
    if (!ip || !port || isNaN(parseInt(port))) {
      message.channel.send('Некорректный формат. Использование: /reserver ip:port. Попробуйте еще раз.');
      return;
    }

    serverIp = ip;
    serverPort = parseInt(port);
    message.channel.send(`Подключение к новому серверу ${serverIp}:${serverPort} с именем ${botName}...`);

    connectToServer(serverIp, serverPort, botName, message.channel);
  }

  if (content.startsWith('/walk')) {
    const args = content.split(' ').slice(1).map(Number);
    if (args.length !== 3 || args.some(isNaN)) {
      message.channel.send('Использование: /walk x y z. Попробуйте еще раз.');
      return;
    }

    if (bot) {
      const [x, y, z] = args;
      const target = new GoalBlock(x, y, z);
      bot.pathfinder.setGoal(target);
      message.channel.send(`Бот движется к координатам (${x}, ${y}, ${z}).`);
    } else {
      message.channel.send('Бот Minecraft не подключен к серверу.');
    }
  }
});

function connectToServer(ip, port, name, channel) {
  if (bot) {
    bot.end();
  }

  bot = mineflayer.createBot({
    host: ip,
    port: port,
    username: name
  });

  bot.loadPlugin(pathfinder);

  bot.once('login', () => {
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    channel.send(`Бот Minecraft успешно подключен к серверу ${ip}:${port} с именем ${name}`);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    const chatMessage = `<${username}> ${message}`;
    chatLog.push(chatMessage);
    console.log(chatMessage);
    if (chatLog.length > 100) {
      chatLog.shift();  // Удаляем старые сообщения, чтобы хранить последние 100 сообщений
    }
  });

  bot.on('error', err => {
    channel.send(`Ошибка: ${err.message}`);
  });

  bot.on('end', () => {
    channel.send('Бот Minecraft отключился от сервера');
  });
}

client.login(DISCORD_TOKEN);
