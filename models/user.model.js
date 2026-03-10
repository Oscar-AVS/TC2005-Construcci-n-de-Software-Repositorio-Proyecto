const users = [
  {
    username: 'admin',
    password: '1234',
    name: 'Employee',
    avatar: 'https://wallpapercave.com/wp/wp6608939.jpg',
  },
];

class User {
  static findByUsername(username) {
    return users.find((user) => user.username === username);
  }
}

module.exports = User;