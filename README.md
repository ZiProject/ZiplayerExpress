<img width="1175" height="305" alt="logo" src="https://raw.githubusercontent.com/ZiProject/ZiPlayer/refs/heads/main/publish/logo.png" />

# ZiplayerExpress

A modular Discord voice player with plugin system for @discordjs/voice.

## Features

- Message commands: !play, !skip, !stop, !pause, !resume,!volume, !queue, !np, !shuffle, !loop, !autoplay
- Buttons (B*player*\*): refresh, previous, pause/resume, next,stop, search (mở Modal), autoPlay
- Select menus (S_player_Func): Loop, AutoPlay, Queue, Mute/Unmute, Vol±, Lyrics toggle, Shuffle, Lock,
- Player events: trackStart, trackEnd, queueEnd, playerStop,playerPause, playerResume, volumeChange, playerDestroy,playerError,
  queueAdd, filterApplied, lyricsCreate

## Installation

```bash
npm install @ziplayer/express discord.js
```

## Quick Start

```typescript
import { Player } from "@ziplayer/express";
import { Client, GatewayIntentBits } from "discord.js";
const client = new Client({
	intents: [GatewayIntentBits.GuildVoiceStates],
});
const player = new Player(client, {
	prefix: "!",
});
client.login("YOUR BOT TOKEN");
```

## CMD:

- play
- skip
- stop
- pause
- resume
- queue
- vol, volume
- np, nowplaying
- shuffle
- loop
- autoplay

## Useful Links

[Example](https://github.com/ZiProject/ZiPlayer/tree/main/examples) | [Repo](https://github.com/ZiProject/ZiPlayer) |
[Package](https://www.npmjs.com/package/ziplayer) | [Plugin](https://www.npmjs.com/package/@ziplayer/plugin) |
[Extension](https://www.npmjs.com/package/@ziplayer/extension)

## License

MIT License
