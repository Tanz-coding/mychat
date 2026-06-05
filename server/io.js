const io = require('socket.io')({
  cors: {
    origin: '*',
    allowedHeaders: ['my-custom-header', 'token', 'authorization', 'content-type'],
    methods: ['GET', 'POST'],
    credentials: false
  },
  allowEIO3: true,
  pingInterval: 25000,
  pingTimeout: 30000,
  serveClient: false
});
const jwt = require('./jwt');
const store = require('./store');
const authService = require('./services/authService');
const friendService = require('./services/friendService');

function userRoom(userId) {
  return `user:${userId}`;
}

async function socketsForUser(userId) {
  const sockets = await io.in(userRoom(userId)).fetchSockets();
  return sockets.filter((item) => item.user && Number(item.user.id) === Number(userId));
}

const util = {
  async login(payload, socket, isReconnect) {
    const source = payload || {};
    const persistentUser = isReconnect
      ? await authService.getUserFromTokenData(source)
      : await authService.login(source.username || source.name, source.password);

    if (!persistentUser) {
      socket.emit('loginFail', '登录失败，请重新登录');
      return;
    }

    let ip = socket.handshake.address.replace(/::ffff:/, '');
    const headers = socket.handshake.headers || {};
    const realIP = headers['x-forwarded-for'];
    ip = realIP ? realIP : ip;

    const userAgent = String(headers['user-agent'] || '').toLowerCase();
    const user = {
      id: persistentUser.id,
      name: persistentUser.username,
      username: persistentUser.username,
      role: persistentUser.role,
      avatarUrl: persistentUser.avatarUrl || source.avatarUrl || '/static/img/avatar/default.png',
      ip,
      deviceType: this.getDeviceType(userAgent),
      roomId: socket.id,
      type: 'user',
      time: Date.now()
    };

    await this.loginSuccess(user, socket);
    store.saveUser(user, isReconnect ? 'reconnect' : 'login');
    const messages = await store.getMessages();
    socket.emit('history-message', 'group_001', messages);
    console.log(`${user.username} ${isReconnect ? 'reconnect' : 'login'}`);
  },

  async loginSuccess(user, socket) {
    const roomName = userRoom(user.id);
    socket.join(roomName);
    socket.user = user;
    socket.user.roomId = roomName;
    const data = {
      user,
      token: jwt.token({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      }),
      friends: await friendService.listForUser(user.id)
    };

    const sameUserSockets = await socketsForUser(user.id);
    if (sameUserSockets.length <= 1) {
      socket.broadcast.emit('system', socket.user, 'join');
    }
    socket.removeAllListeners('message');
    socket.on('message', (from, to, message, type) => {
      if (!to || !to.type) {
        return;
      }
      if (to.type === 'user') {
        socket.to(userRoom(to.id)).emit('message', socket.user, to, message, type);
      }
      if (to.type === 'group') {
        socket.broadcast.emit('message', socket.user, to, message, type);
        store.saveMessage(from, to, message, type);
        if (type === 'file') {
          socket.broadcast.emit('file-message', socket.user, to, message, type);
        }
      }
    });

    socket.removeAllListeners('friend-request');
    socket.on('friend-request', async (from, to) => {
      try {
        if (!to || !to.id) {
          return;
        }
        const result = await friendService.requestFriend(socket.user.id, to.id);
        socket.emit('friend-request-sent', socket.user, to, result);
        socket.to(userRoom(to.id)).emit('friend-request', socket.user, to);
      } catch (error) {
        socket.emit('friend-error', error.message || '好友申请失败');
      }
    });

    socket.removeAllListeners('friend-accept');
    socket.on('friend-accept', async (from, to) => {
      try {
        if (!to || !to.id) {
          return;
        }
        const result = await friendService.acceptFriend(socket.user.id, to.id);
        socket.emit('friend-accepted', socket.user, to, result);
        socket.to(userRoom(to.id)).emit('friend-accepted', socket.user, to);
      } catch (error) {
        socket.emit('friend-error', error.message || '好友通过失败');
      }
    });

    socket.removeAllListeners('friend-delete');
    socket.on('friend-delete', async (from, to) => {
      try {
        if (!to || !to.id) {
          return;
        }
        await friendService.deleteFriend(socket.user.id, to.id);
        socket.emit('friend-deleted', socket.user, to);
        socket.to(userRoom(to.id)).emit('friend-deleted', socket.user, to);
      } catch (error) {
        socket.emit('friend-error', error.message || '删除好友失败');
      }
    });

    const users = await this.getOnlineUsers();
    socket.emit('loginSuccess', data, users);
  },

  getDeviceType(userAgent) {
    const isMobile = /ipad|iphone os|midp|rv:1\.2\.3\.4|ucweb|android|windows ce|windows mobile/i.test(userAgent);
    return isMobile ? 'phone' : 'pc';
  },

  async getOnlineUsers() {
    const users = [
      {
        id: 'group_001',
        name: '群聊天室',
        avatarUrl: 'static/img/avatar/group-icon.png',
        type: 'group'
      }
    ];
    const clients = await io.fetchSockets();
    const seen = new Set();
    clients.forEach((item) => {
      if (item.user && !seen.has(String(item.user.id))) {
        seen.add(String(item.user.id));
        users.push(item.user);
      }
    });
    return users;
  }
};

io.sockets.on('connection', (socket) => {
  const token = socket.handshake.headers.token || (socket.handshake.auth && socket.handshake.auth.token);
  const decoded = token ? jwt.decode(token) : null;
  const tokenUser = decoded ? decoded.data : null;

  socket.on('disconnect', (reason) => {
    if (socket.user && socket.user.id) {
      const disconnectedUser = socket.user;
      setTimeout(() => {
        socketsForUser(disconnectedUser.id)
          .then((items) => {
            if (!items.length) {
              socket.broadcast.emit('system', disconnectedUser, 'logout');
              store.saveUser(disconnectedUser, 'logout');
            }
          })
          .catch((error) => {
            console.error('检查用户在线状态失败:', error && error.message ? error.message : error);
          });
      }, 250);
    }
    console.log(reason);
  });

  socket.on('error', (error) => {
    console.error('socket error:', error && error.message ? error.message : error);
  });

  socket.removeAllListeners('login');
  if (tokenUser && tokenUser.id) {
    util.login(tokenUser, socket, true).catch((error) => {
      socket.emit('loginFail', error.message || '登录失败');
    });
  } else {
    socket.on('login', (loginUser) => {
      util.login(loginUser, socket, false).catch((error) => {
        socket.emit('loginFail', error.message || '登录失败');
      });
    });
  }
});

module.exports = io;
