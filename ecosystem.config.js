module.exports = {
  apps: [{
    name: 'wowprog-filter-bot',
    script: 'ts-node',
    args: "src/Main.ts",
    watch: 'src',
    cwd: '.',
  },
  ],
};
