import {
	Client,
	Events,
	Message,
	TextChannel,
	VoiceChannel,
	User,
	ButtonStyle,
	ButtonBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageEditOptions,
	MessageCreateOptions,
	BaseInteraction,
	ButtonInteraction,
	StringSelectMenuInteraction,
	ColorResolvable,
	ComponentEmojiResolvable,
	GatewayIntentBits,
} from "discord.js";
import { PlayerManager, Player, Track, BasePlugin, BaseExtension } from "ziplayer";
import { YouTubePlugin, SoundCloudPlugin, AttachmentsPlugin } from "@ziplayer/plugin";
import { YTexec } from "@ziplayer/ytexecplug";
// ─────────────────────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────────────────────
const defaultplayerIcon = {
	/** Mảng ID của các animated emoji trên server */
	loop1: "🔂",
	loopQ: "🔁",
	loopA: "♾️",
	loop: "🔁",
	refesh: "🔄",
	prev: "⏮️",
	pause: "⏸️",
	play: "▶️",
	next: "⏭️",
	stop: "⏹️",
	search: "🔍",
	queue: "📋",
	mute: "🔇",
	volinc: "🔊",
	voldec: "🔉",
	shuffle: "🔀",
	fillter: "🎛️",
	lyrics: "📝",
	Lock: "🔒",
	UnLock: "🔓",
	Playbutton: "▶️",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
export interface iconType {
	loop1: ComponentEmojiResolvable;
	loopQ: ComponentEmojiResolvable;
	loopA: ComponentEmojiResolvable;
	loop: ComponentEmojiResolvable;
	refesh: ComponentEmojiResolvable;
	prev: ComponentEmojiResolvable;
	pause: ComponentEmojiResolvable;
	play: ComponentEmojiResolvable;
	next: ComponentEmojiResolvable;
	stop: ComponentEmojiResolvable;
	search: ComponentEmojiResolvable;
	queue: ComponentEmojiResolvable;
	mute: ComponentEmojiResolvable;
	volinc: ComponentEmojiResolvable;
	voldec: ComponentEmojiResolvable;
	shuffle: ComponentEmojiResolvable;
	fillter: ComponentEmojiResolvable;
	lyrics: ComponentEmojiResolvable;
	Lock: ComponentEmojiResolvable;
	UnLock: ComponentEmojiResolvable;
	Playbutton: ComponentEmojiResolvable;
}
export interface ZiMusicBotOptions {
	/** Danh sách plugin (YouTubePlugin, SpotifyPlugin, SoundCloudPlugin…) */
	plugins?: BasePlugin[];
	/** Danh sách extension tuỳ chọn */
	extensions?: BaseExtension[];
	/** Prefix cho message commands (mặc định: "!") */
	prefix?: string;
	/** Âm lượng mặc định 0-200 (mặc định: 100) */
	defaultVolume?: number;
	/** Tự rời channel khi hết queue (mặc định: true) */
	leaveOnEnd?: boolean;
	/** Thời gian chờ ms trước khi rời (mặc định: 60_000) */
	leaveTimeout?: number;
	/** Giới hạn số bài trong queue (mặc định: 500) */
	maxQueueSize?: number;
	/** Tuỳ chọn bổ sung truyền thẳng vào PlayerManager */
	managerOptions?: Record<string, unknown>;
	color?: ColorResolvable | null;
	icon?: iconType;
	debug?: (a: any) => {};
}

interface PlayerMessageEntry {
	message: Message;
	channelId: string;
}

interface PlayerFuncInput {
	player: Player;
	tracks?: Track | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  ZiMusicBot
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ZiMusicBot — Wrapper tất-cả-trong-một cho ZiPlayer.
 *
 * Chỉ cần khởi tạo với `client` và `options`, class tự đăng ký
 * `interactionCreate` và `messageCreate` — không cần cấu hình gì thêm.
 *
 * @example
 * ```ts
 * import ZiMusicBot  from "./ZiMusicBot";
 * import { YouTubePlugin, SpotifyPlugin } from "@ziplayer/plugin";
 *
 * const bot = new ZiMusicBot(client, {
 *   plugins: [new YouTubePlugin(), new SpotifyPlugin()],
 *   prefix: "!",
 * });
 * ```
 */
export class ZiMusicBot {
	readonly client: Client;
	readonly manager: PlayerManager;

	private readonly prefix: string;
	private readonly defaultVolume: number;
	private readonly leaveOnEnd: boolean;
	private readonly leaveTimeout: number;
	private readonly color: ColorResolvable;
	private readonly playerIcon: iconType;
	// private readonly DEBUG: (a: any) => {};

	constructor(client: Client, options: ZiMusicBotOptions = {}) {
		// this.DEBUG = options.debug;
		this.client = client;
		this._checkClient();
		this.prefix = options.prefix ?? "!";
		this.defaultVolume = options.defaultVolume ?? 100;
		this.leaveOnEnd = options.leaveOnEnd ?? true;
		this.leaveTimeout = options.leaveTimeout ?? 60_000;
		this.color = options.color || "Random";
		this.playerIcon = { ...defaultplayerIcon, ...options.icon };
		this.manager = new PlayerManager({
			plugins: options.plugins ?? [
				new YouTubePlugin({
					fistStream: new YTexec().getStream,
				}),
				new SoundCloudPlugin(),
				new AttachmentsPlugin(),
			],
			extensions: options.extensions ?? [],
			...(options.managerOptions ?? {}),
		});

		this._registerDiscordEvents();
		this._attachPlayerEvents();
	}
	debug(arg: any) {
		// if (typeof this.DEBUG == "function") {
		// 	this.DEBUG(...arg);
		// }
		console.log(arg);
	}
	// ─── Discord listeners ─────────────────────────────────────────────────────
	private _checkClient(): void {
		if (!this.client.options.intents.has(GatewayIntentBits.GuildVoiceStates))
			throw new Error(
				"GatewayIntentBits GuildVoiceStates not install in client\n" +
					`Please create Client with intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ], `,
			);
		if (!this.client.options.intents.has(GatewayIntentBits.MessageContent))
			throw new Error(
				"GatewayIntentBits MessageContent not install in client\n" +
					`Please create Client with intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ], `,
			);
		if (!this.client.options.intents.has(GatewayIntentBits.GuildMessages))
			throw new Error(
				"GatewayIntentBits GuildMessages not install in client\n" +
					`Please create Client with intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ], `,
			);
		if (!this.client.options.intents.has(GatewayIntentBits.Guilds))
			throw new Error(
				"GatewayIntentBits Guilds not install in client\n" +
					`Please create Client with intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ], `,
			);
		return;
	}
	private _registerDiscordEvents(): void {
		this.client.on(Events.InteractionCreate, (i: any) => this._onInteraction(i as BaseInteraction));
		this.client.on(Events.MessageCreate, (m: any) => this._onMessage(m));
	}

	private async _onInteraction(interaction: BaseInteraction): Promise<void> {
		this.debug((interaction as ButtonInteraction)?.customId);
		try {
			if ((interaction as ButtonInteraction).isButton()) return await this._handleButton(interaction as ButtonInteraction);
			if ((interaction as StringSelectMenuInteraction).isStringSelectMenu())
				return await this._handleSelect(interaction as StringSelectMenuInteraction);
		} catch (err) {
			console.error("[ZiMusicBot] interactionCreate error:", err);
			const i = interaction as ButtonInteraction;
			if (!i.replied && !i.deferred) await i.reply({ content: "⚠️ Đã xảy ra lỗi.", ephemeral: true }).catch(() => {});
		}
	}

	private async _onMessage(message: Message): Promise<void> {
		this.debug(message?.content);

		if (message.author.bot || !message.guild) return;
		if (!message.content.startsWith(this.prefix)) return;

		const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
		const command = args.shift()!.toLowerCase();

		try {
			switch (command) {
				case "play":
					return await this._cmdPlay(message, args.join(" "));
				case "skip":
					return await this._cmdSkip(message);
				case "stop":
					return await this._cmdStop(message);
				case "pause":
					return await this._cmdPause(message);
				case "resume":
					return await this._cmdResume(message);
				case "queue":
					return await this._cmdQueue(message);
				case "vol":
				case "volume":
					return await this._cmdVolume(message, args[0]);
				case "np":
				case "nowplaying":
					return await this._cmdNowPlaying(message);
				case "shuffle":
					return await this._cmdShuffle(message);
				case "loop":
					return await this._cmdLoop(message, args[0]);
				case "autoplay":
					return await this._cmdAutoPlay(message);
			}
		} catch (err) {
			console.error("[ZiMusicBot] messageCreate error:", err);
			message.reply("⚠️ Đã xảy ra lỗi.").catch(() => {});
		}
	}

	// ─── Button handler ────────────────────────────────────────────────────────

	private async _handleButton(interaction: ButtonInteraction): Promise<void> {
		if (!interaction.customId.startsWith("B_player_")) return;

		const action = interaction.customId.replace("B_player_", "");
		const player = this.manager.get(interaction.guildId!);

		if (!player && action !== "refresh")
			return void interaction.reply({ content: "❌ Không có player đang hoạt động.", ephemeral: true });

		await interaction.deferUpdate().catch(() => {});

		switch (action) {
			case "refresh":
				return await this._updatePlayerMessage(interaction.guildId!);
			case "previous":
				return await this._btnPrevious(interaction, player!);
			case "pause":
				return await this._btnPause(player!);
			case "next":
				return await this._btnNext(player!);
			case "stop":
				return void player!.stop();
			case "search":
				return await this._btnSearch(interaction, player!);
			case "autoPlay":
				return await this._btnAutoPlay(player!);
		}
	}

	private async _btnPrevious(interaction: ButtonInteraction, player: Player): Promise<void> {
		const prev: Track | undefined = (player as any).previousTrack;
		if (!prev) return;
		await player.play(prev.url, interaction.user.id);
		await this._updatePlayerMessage(interaction.guildId!);
	}

	private async _btnPause(player: Player): Promise<void> {
		player.isPlaying ? player.pause() : player.resume();
		await this._updatePlayerMessage((player as any).guildId ?? "");
	}

	private async _btnNext(player: Player): Promise<void> {
		(player as any).skip?.();
	}

	private async _btnSearch(interaction: ButtonInteraction, player: Player): Promise<void> {
		// Modal phải được show trước khi defer — nếu đã deferUpdate thì dùng followUp thay thế
		const modal = new ModalBuilder()
			.setCustomId("M_player_search")
			.setTitle("🔍 Tìm kiếm bài hát")
			.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId("search_query")
						.setLabel("Tên bài hát hoặc URL")
						.setStyle(TextInputStyle.Short)
						.setPlaceholder("Never Gonna Give You Up ...")
						.setRequired(true),
				),
			);

		// Nếu interaction chưa bị reply/defer thì show modal trực tiếp
		if (!interaction.replied && !interaction.deferred) {
			await interaction.showModal(modal);
		} else {
			// Sau khi deferUpdate không thể showModal — gửi ephemeral hướng dẫn
			await interaction
				.followUp({
					content: "Vui lòng dùng lệnh `!play <tên bài>` để tìm kiếm.",
					ephemeral: true,
				})
				.catch(() => {});
			return;
		}

		const submitted = await interaction.awaitModalSubmit({ time: 120_000 }).catch(() => null);
		if (!submitted) return;

		await submitted.deferUpdate().catch(() => {});
		const query = submitted.fields.getTextInputValue("search_query");

		if (!(player as any).isConnected) {
			const vc = (interaction.member as any)?.voice?.channel as VoiceChannel | null;
			if (vc) await player.connect(vc).catch(console.error);
		}
		await player.play(query, interaction.user.id).catch(console.error);
	}

	private async _btnAutoPlay(player: Player): Promise<void> {
		const cur = player.autoPlay?.();
		player.queue.autoPlay(!cur);
		await this._updatePlayerMessage((player as any).guildId ?? "");
	}

	// ─── Select menu handler ───────────────────────────────────────────────────

	private async _handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
		switch (interaction.customId) {
			case "S_player_Track":
				return await this._selectTrack(interaction);
			case "S_player_Func":
				return await this._selectFunc(interaction);
		}
	}

	private async _selectTrack(interaction: StringSelectMenuInteraction): Promise<void> {
		const player = this.manager.get(interaction.guildId!);
		if (!player) return void interaction.reply({ content: "❌ Không có player.", ephemeral: true });

		await interaction.deferUpdate().catch(() => {});
		await player.play(interaction.values[0], interaction.user.id).catch(console.error);
		await this._updatePlayerMessage(interaction.guildId!);
	}

	private async _selectFunc(interaction: StringSelectMenuInteraction): Promise<void> {
		const player = this.manager.get(interaction.guildId!);
		if (!player) return void interaction.reply({ content: "❌ Không có player.", ephemeral: true });

		const value = interaction.values[0];

		// Search cần showModal trước khi deferUpdate
		if (value === "Search") return await this._btnSearch(interaction as unknown as ButtonInteraction, player);

		await interaction.deferUpdate().catch(() => {});

		switch (value) {
			case "Lock":
				if (player.userdata) player.userdata.LockStatus = !player.userdata?.LockStatus;
				break;

			case "Loop": {
				const modes = ["off", "track", "queue"] as const;
				type LoopMode = (typeof modes)[number];
				const cur = modes.indexOf((player.loop?.() as LoopMode) ?? "off");
				player.loop?.(modes[(cur + 1) % modes.length]);
				break;
			}

			case "AutoPlay":
				player.queue.autoPlay(!player.autoPlay?.());
				break;

			case "Queue": {
				const tracks: Track[] = (player.queue as any).tracks?.slice(0, 10) ?? [];
				const list =
					tracks.length ? tracks.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).join("\n") : "Queue đang trống.";
				await interaction.followUp({ content: `📋 **Queue:**\n${list}`, ephemeral: true }).catch(() => {});
				return;
			}

			case "Mute":
				player.setVolume(0);
				break;
			case "Unmute":
				player.setVolume(this.defaultVolume);
				break;
			case "volinc":
				player.setVolume(Math.min(player.volume + 10, 200));
				break;
			case "voldec":
				player.setVolume(Math.max(player.volume - 10, 0));
				break;

			case "Lyrics":
				if (player.userdata) player.userdata.lyrcsActive = !player.userdata?.lyrcsActive;
				await interaction
					.followUp({
						content: `🎵 Lyrics: **${player.userdata?.lyrcsActive ? "ON" : "OFF"}**`,
						ephemeral: true,
					})
					.catch(() => {});
				break;

			case "Shuffle":
				(player.queue as any).shuffle?.();
				break;

			case "Filter":
				// Emit để handler bên ngoài xử lý nếu cần
				return;
		}

		await this._updatePlayerMessage(interaction.guildId!);
	}

	// ─── Message commands ──────────────────────────────────────────────────────

	private async _cmdPlay(message: Message, query: string): Promise<void> {
		if (!query) {
			await message.reply("❌ Please enter the song title or URL.");
			return;
		}

		const vc = (message.member as any)?.voice?.channel as VoiceChannel | null;
		if (!vc) {
			await message.reply("❌ You need to join the voice channel first.");
			return;
		}

		const player = await this.createPlayer(message.guildId!, vc, message.channel as TextChannel, message.author);

		await player.play(query, message.author.id);
		await this._sendOrUpdatePlayerMessage(message.channel as TextChannel, player);
	}

	private async _cmdSkip(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		(p as any).skip?.();
		message.react("⏭️").catch(() => {});
	}

	private async _cmdStop(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		p.stop();
		message.react("⏹️").catch(() => {});
	}

	private async _cmdPause(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		p.pause();
		message.react("⏸️").catch(() => {});
		await this._updatePlayerMessage(message.guildId!);
	}

	private async _cmdResume(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		p.resume();
		message.react("▶️").catch(() => {});
		await this._updatePlayerMessage(message.guildId!);
	}

	private async _cmdVolume(message: Message, arg: string): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		const vol = parseInt(arg);
		if (isNaN(vol) || vol < 0 || vol > 200) {
			await message.reply("❌The volume should be between 0 and 200.");
			return;
		}
		p.setVolume(vol);
		await message.reply(`🔊 Volume: **${vol}%**`);
		await this._updatePlayerMessage(message.guildId!);
	}

	private async _cmdQueue(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		const all: Track[] = (p.queue as any).tracks ?? [];
		if (!all.length) {
			await message.reply("📋 Queue Empty.");
			return;
		}
		const list = all
			.slice(0, 15)
			.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``)
			.join("\n");
		await message.reply(`📋 **Queue (${all.length} Song):**\n${list}`);
	}

	private async _cmdNowPlaying(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		await this._sendOrUpdatePlayerMessage(message.channel as TextChannel, p);
	}

	private async _cmdShuffle(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		(p.queue as any).shuffle?.();
		message.react("🔀").catch(() => {});
		await this._updatePlayerMessage(message.guildId!);
	}

	private async _cmdLoop(message: Message, arg: string): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		const modes = ["off", "track", "queue"] as const;
		type LoopMode = (typeof modes)[number];
		const mode: LoopMode =
			(modes as readonly string[]).includes(arg) ?
				(arg as LoopMode)
			:	modes[(modes.indexOf((p.loop?.() as LoopMode) ?? "off") + 1) % modes.length];
		p.loop?.(mode);
		await message.reply(`🔁 Loop: **${mode.toUpperCase()}**`);
		await this._updatePlayerMessage(message.guildId!);
	}

	private async _cmdAutoPlay(message: Message): Promise<void> {
		const p = this._getPlayerOrReply(message);
		if (!p) return;
		const next = !p.autoPlay?.();
		p.queue.autoPlay(next);
		await message.reply(`♾️ AutoPlay: **${next ? "ON" : "OFF"}**`);
		await this._updatePlayerMessage(message.guildId!);
	}

	// ─── Player events ─────────────────────────────────────────────────────────

	private _attachPlayerEvents(): void {
		const update = (p: Player): Promise<void> => this._updatePlayerMessage(p.guildId);

		this.manager.on("trackStart", (_p, _t) => {
			void update(_p);
		});
		this.manager.on("trackEnd", (_p, _t) => {
			void update(_p);
		});
		this.manager.on("queueEnd", (_p) => {
			void update(_p);
		});
		this.manager.on("playerStop", (_p) => {
			void update(_p);
		});
		this.manager.on("playerPause", (_p, _t) => {
			void update(_p);
		});
		this.manager.on("playerResume", (_p, _t) => {
			void update(_p);
		});
		this.manager.on("volumeChange", (_p, _o, _n) => {
			void update(_p);
		});
		this.manager.on("queueAdd", (_p, _t) => {
			void update(_p);
		});
		this.manager.on("filterApplied", (_p, _f) => {
			void update(_p);
		});
		this.manager.on("filterRemoved", (_p, _f) => {
			void update(_p);
		});
		this.manager.on("lyricsCreate", (_p, _t, _l) => {
			void update(_p);
		});
		this.manager.on("playerDestroy", (_p) => {
			try {
				_p.userdata?.PlayerMessage.delete().catch(() => {});
			} catch (err) {
				console.error(`[ZiMusicBot] Cannot delete [${_p.guildId}]`, (err as Error)?.message ?? err);
			}
		});
		this.manager.on("playerError", (_p, err) => {
			console.error(`[ZiMusicBot][${_p.guildId}] playerError:`, (err as Error)?.message ?? err);
		});
		this.manager.on("connectionError", (_p, err) => {
			console.error(`[ZiMusicBot][${_p.guildId}] connectionError:`, (err as Error)?.message ?? err);
		});

		this.manager.on("debug", this.debug);
	}

	// ─── Player message helpers ────────────────────────────────────────────────

	private repeatMode(loop: string | undefined, auto: boolean | undefined): string {
		if (loop === "track") return `${this.playerIcon.loop1} Track`;
		if (loop === "queue") return `${this.playerIcon.loopQ} Queue`;
		if (auto) return `${this.playerIcon.loopA} AutoPlay`;
		return "OFF";
	}

	private createButton({
		id,
		style = ButtonStyle.Secondary,
		label,
		emoji,
		disable = true,
	}: {
		id: string;
		style?: ButtonStyle;
		label?: string;
		emoji?: ComponentEmojiResolvable;
		disable?: boolean;
	}): ButtonBuilder {
		const btn = new ButtonBuilder().setCustomId(`B_player_${id}`).setStyle(style).setDisabled(disable);
		if (label) btn.setLabel(label);
		if (emoji) btn.setEmoji(emoji);
		return btn;
	}

	private async renderPlayerUI({ player, tracks }: PlayerFuncInput): Promise<MessageCreateOptions & MessageEditOptions> {
		const track = tracks ?? player?.currentTrack ?? (player as any)?.previousTrack;

		const requestedBy: any =
			(track?.requestedBy === "auto" ? player.userdata?.requestedBy : track?.requestedBy) ?? player.userdata?.requestedBy;

		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${track?.metadata?.author ?? ""} - ${track?.title ?? "Unknown"}`.slice(0, 256),
				iconURL: this.client.user?.displayAvatarURL?.({ size: 1024 }) ?? undefined,
				url: track?.url,
			})
			.setDescription(`Volume: **${player.volume}** % - Host: ${requestedBy}`)
			.setColor(this.color ?? "Random")
			.setFooter({
				text: `Requested by: ${requestedBy?.username ?? "Unknown"}`,
				iconURL: requestedBy?.displayAvatarURL?.({ size: 1024 }) ?? this.client.user?.displayAvatarURL?.({ size: 1024 }),
			})
			.setImage(track?.thumbnail ?? null)
			.setTimestamp();

		// ── Related tracks dropdown ──
		const filteredRelated: Track[] = ((player as any).relatedTracks ?? [])
			.filter((t: Track) => (t.url?.length ?? 0) < 100)
			.slice(0, 20);

		const trackOptions = filteredRelated.map((t: Track, i: number) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(`${i + 1}: ${t.title}`.slice(0, 99))
				.setDescription(`Duration: ${t.duration} source: ${(t as any).queryType ?? ""}`)
				.setValue(t.url)
				.setEmoji(this.playerIcon.Playbutton),
		);

		const disableOptions = [
			new StringSelectMenuOptionBuilder()
				.setLabel("No Track")
				.setDescription("XX:XX")
				.setValue("ZijiBot")
				.setEmoji(this.playerIcon.Playbutton),
		];

		const relatedTracksRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("S_player_Track")
				.setPlaceholder("▶ | Select a song to add to the queue")
				.addOptions(trackOptions.length ? trackOptions : disableOptions)
				.setMaxValues(1)
				.setMinValues(1)
				.setDisabled(!trackOptions.length),
		);

		const code: MessageCreateOptions & MessageEditOptions = { content: "" };
		const queueIsEmpty = (player.queue as any).isEmpty ?? true;

		// ── Active player UI ──
		if (player.isPlaying || player.isPaused || !queueIsEmpty) {
			embed.addFields({
				name: " ",
				value: `${player.getProgressBar?.({ barChar: "﹏", progressChar: "𓊝" }) ?? ""}`,
			});

			const functionDefs = [
				{
					Label: "Search Tracks",
					Description: "Search tracks",
					Value: "Search",
					Emoji: this.playerIcon.search,
				},
				{
					Label: !player.userdata?.LockStatus ? "Lock" : "UnLock",
					Description: !player.userdata?.LockStatus ? "Lock player access" : "UnLock player access",
					Value: "Lock",
					Emoji: !player.userdata?.LockStatus ? this.playerIcon.Lock : this.playerIcon.UnLock,
				},
				{ Label: "Loop", Description: "Loop", Value: "Loop", Emoji: this.playerIcon.loop },
				{ Label: "AutoPlay", Description: "AutoPlay", Value: "AutoPlay", Emoji: this.playerIcon.loopA },
				{ Label: "Queue", Description: "Queue", Value: "Queue", Emoji: this.playerIcon.queue },
				{ Label: "Mute", Description: "Mute", Value: "Mute", Emoji: this.playerIcon.mute },
				{ Label: "Unmute", Description: "Unmute", Value: "Unmute", Emoji: this.playerIcon.volinc },
				{ Label: "Vol +", Description: "Volume up", Value: "volinc", Emoji: this.playerIcon.volinc },
				{ Label: "Vol -", Description: "Volume down", Value: "voldec", Emoji: this.playerIcon.voldec },
				{ Label: "Lyrics", Description: "Lyrics", Value: "Lyrics", Emoji: this.playerIcon.lyrics },
				{ Label: "Shuffle", Description: "Shuffle", Value: "Shuffle", Emoji: this.playerIcon.shuffle },
				{ Label: "Filter", Description: "Manage filters", Value: "Filter", Emoji: this.playerIcon.fillter },
			];

			const filteredFunctions = functionDefs.filter((f) => {
				if (queueIsEmpty && (f.Label === "Shuffle" || f.Label === "Queue")) return false;
				if (player.volume > 199 && f.Value === "volinc") return false;
				if (player.volume < 1 && f.Value === "voldec") return false;
				if (player.volume === 0 && f.Value === "Mute") return false;
				if (player.volume !== 0 && f.Value === "Unmute") return false;
				return true;
			});

			const functionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId("S_player_Func")
					.setPlaceholder("▶ | Select a function to control the player")
					.addOptions(
						filteredFunctions.map((f) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(f.Label)
								.setDescription(f.Description)
								.setValue(f.Value)
								.setEmoji(f.Emoji),
						),
					)
					.setMaxValues(1)
					.setMinValues(1),
			);

			const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.createButton({ id: "refresh", emoji: this.playerIcon.refesh, disable: false }),
				this.createButton({ id: "previous", emoji: this.playerIcon.prev, disable: !(player as any).previousTrack }),
				this.createButton({
					id: "pause",
					emoji: player.isPlaying ? this.playerIcon.pause : this.playerIcon.play,
					disable: false,
				}),
				this.createButton({ id: "next", emoji: this.playerIcon.next, disable: false }),
				this.createButton({ id: "stop", emoji: this.playerIcon.stop, disable: false }),
			);

			code.components = [relatedTracksRow, functionRow, buttonRow];

			// ── Empty queue UI ──
		} else {
			embed
				.setDescription("❌ | Queue is empty\n✅ | You can add some songs")
				.setColor("Red")
				.addFields({ name: " ", value: "𓊝 ┃ ﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏ ┃ 𓊝" });

			const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.createButton({ id: "refresh", emoji: this.playerIcon.refesh, disable: false }),
				this.createButton({ id: "previous", emoji: this.playerIcon.prev, disable: !(player as any).previousTrack }),
				this.createButton({ id: "search", emoji: this.playerIcon.search, disable: false }),
				this.createButton({ id: "autoPlay", emoji: this.playerIcon.loopA, disable: false }),
				this.createButton({ id: "stop", emoji: this.playerIcon.stop, disable: false }),
			);

			code.components = [relatedTracksRow, buttonRow];
		}

		// ── Lock badge ──
		if (player.userdata?.LockStatus) {
			embed.addFields({
				name: `${this.playerIcon.Lock} **Lock player access**`,
				value: " ",
				inline: false,
			});
		}

		// ── Status fields ──
		embed.addFields(
			{
				name: `"Loop": ${this.repeatMode(player.loop?.(), player.autoPlay?.())}`,
				value: " ",
				inline: true,
			},
			{
				name: `Lyrics: ${player.userdata?.lyrcsActive ? "ON" : "OFF"}`,
				value: " ",
				inline: true,
			},
		);

		code.embeds = [embed];
		code.files = [];
		return code;
	}

	private async _sendOrUpdatePlayerMessage(channel: TextChannel, player: Player): Promise<void> {
		const code = await this.renderPlayerUI({ player, tracks: player.currentTrack }).catch(() => null);
		if (!code) return;

		if (!!player.userdata && !!player.userdata.PlayerMessage) {
			await player.userdata.PlayerMessage.edit(code).catch(async () => {
				const msg = await channel.send(code).catch(() => null);
				if (msg && player.userdata) player.userdata.PlayerMessage = msg;
			});
		} else {
			const msg = await channel.send(code).catch(() => null);
			if (msg && player.userdata) player.userdata.PlayerMessage = msg;
		}
	}

	private async _updatePlayerMessage(guildId: string, track?: Track | null): Promise<void> {
		const player = this.manager.get(guildId);
		if (!player || !player.userdata?.PlayerMessage) return;

		const code = await this.renderPlayerUI({
			player,
			tracks: track ?? player.currentTrack,
		}).catch(() => null);
		if (code) await player.userdata.PlayerMessage.edit(code).catch(() => {});
	}

	// ─── Utilities ─────────────────────────────────────────────────────────────

	private _getPlayerOrReply(message: Message): Player | null {
		const player = this.manager.get(message.guildId!);
		if (!player) {
			message.reply("❌ Hiện không có bài nào đang phát.").catch(() => {});
			return null;
		}
		return player;
	}

	// ─── Public API ────────────────────────────────────────────────────────────

	/**
	 * Tạo hoặc lấy player của một guild, kết nối voice channel nếu chưa vào.
	 * Dùng để tích hợp slash commands từ bên ngoài class.
	 */
	async createPlayer(guildId: string, voiceChannel: VoiceChannel, textChannel: TextChannel, requestedBy: User): Promise<Player> {
		const player = await this.manager.create(guildId!, {
			leaveOnEnd: this.leaveOnEnd,
			leaveTimeout: this.leaveTimeout,
			userdata: { requestedBy, textChannel },
		});
		if (!player?.connection) {
			await player.connect(voiceChannel);
		}
		return player;
	}

	/**
	 * Shorthand: phát nhạc và cập nhật/gửi player message trong channel.
	 */
	async play(guildId: string, query: string, user: User, textChannel: TextChannel): Promise<void> {
		const player = this.manager.get(guildId);
		if (!player) throw new Error(`No active player for guild ${guildId}. Call createPlayer first.`);
		await player.play(query, user.id);
		await this._sendOrUpdatePlayerMessage(textChannel, player);
	}
}
