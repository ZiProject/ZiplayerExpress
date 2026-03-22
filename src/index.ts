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
	BaseMessageOptions,
} from "discord.js";
import { PlayerManager, Player, Track, BasePlugin, BaseExtension, SearchResult, PlayerOptions } from "ziplayer";
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
	/** Tuỳ chọn bổ sung truyền thẳng vào PlayerManager */
	managerOptions?: Record<string, unknown>;
	color?: ColorResolvable | null;
	icon?: iconType;
	debug?: (message?: any, ...optionalParams: any[]) => any;
	playerOptions?: PlayerOptions;
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
 * import { ZiMusicBot } from "@ziplayer/express";
 *
 * const bot = new ZiMusicBot(client, {
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
	private readonly options: ZiMusicBotOptions;

	constructor(client: Client, options: ZiMusicBotOptions = {}) {
		this.options = options;
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
		this.debug(
			`Initialized — prefix="${this.prefix}" volume=${this.defaultVolume} leaveOnEnd=${this.leaveOnEnd} leaveTimeout=${this.leaveTimeout}ms`,
		);
	}

	private debug(message?: any, ...optionalParams: any[]): void {
		if (this.options.debug) this.options.debug(`[ZiMusicBot] ${message}`, ...optionalParams);
	}

	// ─── Discord listeners ─────────────────────────────────────────────────────
	private _checkClient(): void {
		const msg = (t: string) =>
			"GatewayIntentBits " +
			t +
			" not install in client\n" +
			"Please create Client with intents: [\n" +
			" GatewayIntentBits.Guilds,\n" +
			" GatewayIntentBits.GuildVoiceStates,\n" +
			" GatewayIntentBits.MessageContent,\n" +
			" GatewayIntentBits.GuildMessages,\n" +
			"]\n";
		if (!this.client.options.intents.has(GatewayIntentBits.GuildVoiceStates)) throw new Error(msg("GuildVoiceStates"));
		if (!this.client.options.intents.has(GatewayIntentBits.MessageContent)) throw new Error(msg("MessageContent"));
		if (!this.client.options.intents.has(GatewayIntentBits.GuildMessages)) throw new Error(msg("GuildMessages"));
		if (!this.client.options.intents.has(GatewayIntentBits.Guilds)) throw new Error(msg("Guilds"));
		return;
	}
	private _registerDiscordEvents(): void {
		this.debug("Registering Discord events: InteractionCreate, MessageCreate");
		this.client.on(Events.InteractionCreate, (i: any) => this._onInteraction(i as BaseInteraction));
		this.client.on(Events.MessageCreate, (m: any) => this._onMessage(m));
	}

	private async _onInteraction(interaction: BaseInteraction): Promise<void> {
		try {
			if ((interaction as ButtonInteraction).isButton()) {
				this.debug(
					`Button interaction received — customId="${(interaction as ButtonInteraction).customId}" guild=${interaction.guildId}`,
				);
				return await this._handleButton(interaction as ButtonInteraction);
			}
			if ((interaction as StringSelectMenuInteraction).isStringSelectMenu()) {
				this.debug(
					`SelectMenu interaction received — customId="${(interaction as StringSelectMenuInteraction).customId}" guild=${interaction.guildId}`,
				);
				return await this._handleSelect(interaction as StringSelectMenuInteraction);
			}
		} catch (err) {
			console.error("[ZiMusicBot] interactionCreate error:", err);
			const i = interaction as ButtonInteraction;
			if (!i.replied && !i.deferred) await i.reply({ content: "⚠️ Đã xảy ra lỗi.", ephemeral: true }).catch(() => {});
		}
	}

	private async _onMessage(message: Message): Promise<void> {
		if (message.author.bot || !message.guild) return;
		if (!message.content.startsWith(this.prefix)) return;

		const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
		const command = args.shift()!.toLowerCase();

		this.debug(
			`Message command received — command="${command}" args=${JSON.stringify(args)} guild=${message.guildId} user=${message.author.tag}`,
		);

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
				case "search":
					return await this._cmdSearch(message, args.join(" "));
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

		this.debug(`Button action="${action}" guild=${interaction.guildId} playerExists=${!!player}`);

		if (!player && action !== "refresh")
			return void interaction.reply({ content: "❌ Không có player đang hoạt động.", ephemeral: true });

		if (action === "search") return await this._btnSearch(interaction, player!);

		await interaction.deferUpdate().catch(() => {});

		switch (action) {
			case "refresh":
				return await this._updatePlayerMessage(interaction.guildId!);
			case "previous":
				return await this._btnPrevious(player!);
			case "pause":
				return await this._btnPause(player!);
			case "next":
				return await this._btnNext(player!);
			case "stop":
				return void player!.destroy();
			case "autoPlay":
				return await this._btnAutoPlay(player!);
		}
	}

	private async _btnPrevious(player: Player): Promise<void> {
		await player.previous();
		await this._updatePlayerMessage(player.guildId!);
	}

	private async _btnPause(player: Player): Promise<void> {
		player.isPlaying ? player.pause() : player.resume();
		await this._updatePlayerMessage((player as any).guildId ?? "");
	}

	private async _btnNext(player: Player): Promise<void> {
		(player as any).skip?.();
	}

	private async _btnSearch(interaction: ButtonInteraction, _player?: Player): Promise<void> {
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

		await interaction.showModal(modal);

		const submitted = await interaction.awaitModalSubmit({ time: 120_000 }).catch(() => null);
		if (!submitted) return;

		await submitted.deferUpdate().catch(() => {});

		const query = submitted.fields.getTextInputValue("search_query");
		const vc = (interaction.member as any)?.voice?.channel as VoiceChannel | null;
		if (!vc) {
			await submitted.followUp({ content: "❌ Bạn cần vào voice channel trước.", ephemeral: true }).catch(() => {});
			return;
		}

		const textChannel = interaction.channel as TextChannel;

		if (this._isUrl(query)) {
			const player = await this.createPlayer(interaction.guildId!, vc, textChannel, interaction.user);
			await player.play(query, interaction.user.id).catch(console.error);
		} else {
			await this._searchAndShowResults(submitted as any, interaction.guildId!, vc, textChannel, interaction.user, query);
		}
	}

	private async _btnAutoPlay(player: Player): Promise<void> {
		const cur = player.autoPlay?.();
		player.queue.autoPlay(!cur);
		await this._updatePlayerMessage((player as any).guildId ?? "");
	}

	// ─── Select menu handler ───────────────────────────────────────────────────

	private async _handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
		this.debug(
			`SelectMenu customId="${interaction.customId}" values=${JSON.stringify(interaction.values)} guild=${interaction.guildId}`,
		);
		switch (interaction.customId) {
			case "S_player_Track":
				return await this._selectTrack(interaction);
			case "S_player_Func":
				return await this._selectFunc(interaction);
		}
	}

	private async _selectTrack(interaction: StringSelectMenuInteraction): Promise<void> {
		const vc = (interaction.member as any)?.voice?.channel as VoiceChannel | null;
		if (!vc) {
			await interaction.followUp({ content: "❌ Bạn cần vào voice channel trước.", ephemeral: true }).catch(() => {});
			return;
		}
		const player = await this.createPlayer(interaction.guildId!, vc, interaction.channel as TextChannel, interaction.user).catch(
			() => null,
		);

		if (!player) {
			await interaction.reply({ content: "❌ Không thể tạo player.", components: [], embeds: [] }).catch(() => {});
			return;
		}

		await interaction.deferUpdate().catch(() => {});
		await player.play(interaction.values[0], interaction.user.id).catch(console.error);
		await this._updatePlayerMessage(interaction.guildId!);
	}

	private async _selectFunc(interaction: StringSelectMenuInteraction): Promise<void> {
		const player = this.manager.get(interaction.guildId!);
		if (!player) return void interaction.reply({ content: "❌ Không có player.", ephemeral: true });

		const value = interaction.values[0];

		if (value === "Search") return await this._btnSearch(interaction as unknown as ButtonInteraction);

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
			case "Shuffle":
				(player.queue as any).shuffle?.();
				break;

			case "Filter":
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

		this.debug(
			`_cmdPlay — query="${query}" isUrl=${this._isUrl(query)} guild=${message.guildId} user=${message.author.tag} vc=${vc.id}`,
		);

		if (this._isUrl(query)) {
			const player = await this.createPlayer(message.guildId!, vc, message.channel as TextChannel, message.author);
			await player.play(query, message.author.id);
			await this._sendOrUpdatePlayerMessage(player);
		} else {
			await this._searchAndShowResults(message, message.guildId!, vc, message.channel as TextChannel, message.author, query);
		}
	}

	// ─── Search helpers ────────────────────────────────────────────────────────
	private _isUrl(query: string): boolean {
		try {
			const url = new URL(query);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	/**
	 * Tìm kiếm bài hát và hiển thị kết quả dạng dropdown.
	 * Không nhận player — chỉ createPlayer khi user thực sự chọn bài.
	 */
	private async _searchAndShowResults(
		context: { followUp: (opts: any) => Promise<Message> } | Message,
		guildId: string,
		voiceChannel: VoiceChannel,
		textChannel: TextChannel,
		requestedBy: User,
		query: string,
	): Promise<void> {
		const result: SearchResult = await this.manager.search(query, requestedBy.id).catch(() => ({ tracks: [] }) as any);
		const tracks: Track[] = result?.tracks ?? [];

		this.debug(`_searchAndShowResults — query="${query}" found=${tracks.length} guild=${guildId} user=${requestedBy.tag}`);

		if (!tracks.length) {
			const msg = "❌ Không tìm thấy kết quả nào.";
			"followUp" in context ?
				await (context as any).followUp({ content: msg, ephemeral: true }).catch(() => {})
			:	await (context as Message).reply(msg).catch(() => {});
			return;
		}

		const top = tracks.slice(0, 10);
		const embed = new EmbedBuilder()
			.setTitle(`🔍 Kết quả: "${query}"`.slice(0, 256))
			.setColor(this.color ?? "Random")
			.setDescription(top.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).join("\n"));

		const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("S_search_result")
				.setPlaceholder("▶ | Chọn bài để thêm vào queue")
				.addOptions(
					top.map((t, i) =>
						new StringSelectMenuOptionBuilder()
							.setLabel(`${i + 1}: ${t.title}`.slice(0, 99))
							.setDescription(`${t.duration}`.slice(0, 99))
							.setValue(t.url)
							.setEmoji(this.playerIcon.Playbutton),
					),
				)
				.setMaxValues(1)
				.setMinValues(1),
		);

		const reply: Message =
			"followUp" in context ?
				await (context as any).followUp({ embeds: [embed], components: [selectRow], ephemeral: true })
			:	await (context as Message).reply({ embeds: [embed], components: [selectRow] });

		const collector = reply.createMessageComponentCollector({
			filter: (i: any) => i.user.id === requestedBy.id && i.customId === "S_search_result",
			time: 60_000,
			max: 1,
		});

		collector.on("collect", async (i: StringSelectMenuInteraction) => {
			await i.deferUpdate().catch(() => {});
			// createPlayer chỉ được gọi ở đây — khi user thực sự chọn bài
			const player = await this.createPlayer(guildId, voiceChannel, textChannel, requestedBy).catch(() => null);
			if (!player) {
				await reply.edit({ content: "❌ Không thể tạo player.", components: [], embeds: [] }).catch(() => {});
				return;
			}
			await player.play(i.values[0], requestedBy.id).catch(console.error);
			await reply.edit({ components: [] }).catch(() => {});
			await this._sendOrUpdatePlayerMessage(player);
		});

		collector.on("end", (_: any, reason: string) => {
			if (reason === "time") reply.edit({ components: [] }).catch(() => {});
		});
	}

	private async _cmdSearch(message: Message, query: string): Promise<void> {
		if (!query) {
			await message.reply("❌ Vui lòng nhập tên bài hát.\nVí dụ: `!search Never Gonna Give You Up`");
			return;
		}

		const vc = (message.member as any)?.voice?.channel as VoiceChannel | null;
		if (!vc) {
			await message.reply("❌ Bạn cần vào voice channel trước.");
			return;
		}

		await this._searchAndShowResults(message, message.guildId!, vc, message.channel as TextChannel, message.author, query);
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
		await this._sendOrUpdatePlayerMessage(p);
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
		this.debug("Attaching player events");
		const update = (p: Player): Promise<void> => this._updatePlayerMessage(p.guildId);
		const create = (p: Player): Promise<void> => this._sendOrUpdatePlayerMessage(p);
		const sent = (p: Player, m: BaseMessageOptions): Promise<void> => this._sendAndDelMessage(p, m);

		this.manager.on("trackStart", (_p, _t) => {
			this.debug(`trackStart — guild=${_p.guildId} track="${_t?.title}" url=${_t?.url}`);
			void create(_p);
		});
		this.manager.on("trackEnd", (_p, _t) => {
			this.debug(`trackEnd — guild=${_p.guildId} track="${_t?.title}"`);
			void update(_p);
		});
		this.manager.on("queueEnd", (_p) => {
			this.debug(`queueEnd — guild=${_p.guildId}`);
			void update(_p);
		});
		this.manager.on("playerStop", (_p) => {
			this.debug(`playerStop — guild=${_p.guildId}`);
			void update(_p);
		});
		this.manager.on("playerPause", (_p, _t) => {
			this.debug(`playerPause — guild=${_p.guildId}`);
			void update(_p);
		});
		this.manager.on("playerResume", (_p, _t) => {
			this.debug(`playerResume — guild=${_p.guildId}`);
			void update(_p);
		});
		this.manager.on("volumeChange", (_p, _o, _n) => {
			this.debug(`volumeChange — guild=${_p.guildId} ${_o} → ${_n}`);
			void update(_p);
		});
		this.manager.on("queueAdd", (_p, _t) => {
			this.debug(`queueAdd — guild=${_p.guildId} track="${(_t as any)?.title ?? _t}"`);
			void sent(_p, {
				embeds: [new EmbedBuilder().setDescription(`Track add: ${_t.title}`).setImage(_t?.thumbnail ?? null)],
			});
			void update(_p);
		});
		this.manager.on("filterApplied", (_p, _f) => {
			this.debug(`filterApplied — guild=${_p.guildId} filter=${JSON.stringify(_f)}`);
			void update(_p);
		});
		this.manager.on("filterRemoved", (_p, _f) => {
			this.debug(`filterRemoved — guild=${_p.guildId} filter=${JSON.stringify(_f)}`);
			void update(_p);
		});
		this.manager.on("playerDestroy", (_p) => {
			this.debug(`playerDestroy — guild=${_p.guildId}`);
			try {
				_p.userdata?.PlayerMessage.delete().catch(() => {});
			} catch (err) {
				console.error(`[ZiMusicBot] Cannot delete [${_p.guildId}]`, (err as Error)?.message ?? err);
			}
		});
		this.manager.on("playerError", (_p, err) => {
			this.debug(`playerError — guild=${_p.guildId}`, err);
			console.error(`[ZiMusicBot][${_p.guildId}] playerError:`, (err as Error)?.message ?? err);
		});
		this.manager.on("connectionError", (_p, err) => {
			this.debug(`connectionError — guild=${_p.guildId}`, err);
			console.error(`[ZiMusicBot][${_p.guildId}] connectionError:`, (err as Error)?.message ?? err);
		});
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
			.setDescription(`Volume: **${player.volume}** % - Host: <@${requestedBy}>`)
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
		embed.addFields({
			name: `"Loop": ${this.repeatMode(player.loop?.(), player.autoPlay?.())}`,
			value: " ",
			inline: true,
		});

		code.embeds = [embed];
		code.files = [];
		return code;
	}

	private async _sendOrUpdatePlayerMessage(player: Player): Promise<void> {
		const code = await this.renderPlayerUI({ player, tracks: player.currentTrack }).catch(() => null);
		if (!code) {
			this.debug(`_sendOrUpdatePlayerMessage — renderPlayerUI returned null for guild=${player.guildId}`);
			return;
		}

		if (!!player.userdata && !!player.userdata.PlayerMessage) {
			this.debug(`_sendOrUpdatePlayerMessage — editing existing message for guild=${player.guildId}`);
			await player.userdata.PlayerMessage.edit(code).catch(async () => {
				this.debug(`_sendOrUpdatePlayerMessage — edit failed, sending new message for guild=${player.guildId}`);
				const msg = await player.userdata?.textChannel.send(code).catch(() => null);
				if (msg && player.userdata) player.userdata.PlayerMessage = msg;
			});
		} else {
			this.debug(`_sendOrUpdatePlayerMessage — sending new message for guild=${player.guildId}`);
			const msg = await player.userdata?.textChannel.send(code).catch(() => null);
			if (msg && player.userdata) player.userdata.PlayerMessage = msg;
		}
	}

	private async _updatePlayerMessage(guildId: string, track?: Track | null): Promise<void> {
		const player = this.manager.get(guildId);
		if (!player || !player.userdata?.PlayerMessage) {
			this.debug(`_updatePlayerMessage — skipped (no player or no message) guild=${guildId}`);
			return;
		}

		this.debug(`_updatePlayerMessage — guild=${guildId} track="${track?.title ?? player.currentTrack?.title ?? "none"}"`);
		const code = await this.renderPlayerUI({
			player,
			tracks: track ?? player.currentTrack,
		}).catch(() => null);
		if (code) await player.userdata.PlayerMessage.edit(code).catch(() => {});
	}
	private async _sendAndDelMessage(player: Player, messagePayload: BaseMessageOptions) {
		try {
			const mes = await (player.userdata!.textChannel as TextChannel).send(messagePayload);
			setTimeout(() => {
				mes.delete();
			}, 5000);
		} catch (e) {
			this.debug("Error Send And Delete Message", e);
		}
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
		this.debug(`createPlayer — guild=${guildId} vc=${voiceChannel.id} tc=${textChannel.id} user=${requestedBy.tag}`);
		const player = await this.manager.create(guildId!, {
			leaveOnEnd: this.leaveOnEnd,
			leaveTimeout: this.leaveTimeout,
			userdata: { requestedBy, textChannel },
			...this.options.playerOptions,
		});
		if (!player?.connection) {
			this.debug(`createPlayer — connecting to vc=${voiceChannel.id}`);
			await player.connect(voiceChannel);
		} else {
			this.debug(`createPlayer — already connected, reusing player for guild=${guildId}`);
		}
		return player;
	}

	/**
	 * Shorthand: phát nhạc và cập nhật/gửi player message trong channel.
	 */
	async play(guildId: string, query: string, user: User): Promise<void> {
		const player = this.manager.get(guildId);
		if (!player) throw new Error(`No active player for guild ${guildId}. Call createPlayer first.`);
		this.debug(`play — guild=${guildId} query="${query}" user=${user.tag}`);
		await player.play(query, user.id);
		await this._sendOrUpdatePlayerMessage(player);
	}
}
